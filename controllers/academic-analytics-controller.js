const Grade = require('../models/grade-model');
const { AttendanceDetail } = require('../models/attendance-model');
const { Academic } = require('../models/fee-model');
const Student = require('../models/student-model');
const Course = require('../models/course-model');
const Faculty = require('../models/faculty-model');
const mongoose = require('mongoose');

// Fetch high-level institutional analytics
const getInstitutionalAnalytics = async (req, res) => {
    try {
        // 1. Enrollment Analytics
        const enrollment = await Student.aggregate([
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course',
                    foreignField: '_id',
                    as: 'courseDetails'
                }
            },
            { $unwind: '$courseDetails' },
            {
                $lookup: {
                    from: 'faculties',
                    localField: 'courseDetails.faculty',
                    foreignField: '_id',
                    as: 'facultyDetails'
                }
            },
            { $unwind: '$facultyDetails' },
            {
                $group: {
                    _id: '$facultyDetails.name',
                    count: { $sum: 1 },
                    courses: { $addToSet: '$courseDetails.name' }
                }
            },
            { $project: { faculty: '$_id', count: 1, courseCount: { $size: '$courses' }, _id: 0 } },
            { $sort: { count: -1 } }
        ]);

        const totalStudents = await Student.countDocuments();

        // 2. Performance Analytics (Grade Distribution)
        const performance = await Grade.aggregate([
            { $match: { status: 'Published' } },
            {
                $group: {
                    _id: '$grade',
                    count: { $sum: 1 }
                }
            },
            { $project: { grade: '$_id', count: 1, _id: 0 } },
            { $sort: { grade: 1 } }
        ]);

        const avgGradeData = await Grade.aggregate([
            { $match: { status: 'Published' } },
            {
                $group: {
                    _id: null,
                    averageScore: { $avg: '$finalScore' },
                    passRate: {
                        $avg: { $cond: [{ $gte: ['$finalScore', 40] }, 1, 0] }
                    }
                }
            }
        ]);

        const avgStats = avgGradeData[0] || { averageScore: 0, passRate: 0 };

        // 3. Financial Analytics (Revenue vs Outstanding)
        const finance = await Academic.aggregate([
            {
                $group: {
                    _id: null,
                    totalPayable: { $sum: '$payable' },
                    totalPaid: { $sum: '$paid' },
                    totalBalance: { $sum: '$balance' }
                }
            }
        ]);

        const financeStats = finance[0] || { totalPayable: 0, totalPaid: 0, totalBalance: 0 };

        // 4. Attendance Analytics
        const attendance = await AttendanceDetail.aggregate([
            {
                $group: {
                    _id: null,
                    rate: { $avg: { $cond: ['$status', 1, 0] } }
                }
            }
        ]);

        const attendanceRate = attendance[0] ? (attendance[0].rate * 100).toFixed(1) : 0;

        // 5. Semester Trends (Historical Pass Rate & Average)
        const trends = await Grade.aggregate([
            {
                $lookup: {
                    from: 'offeredunits',
                    localField: 'offeredUnit',
                    foreignField: '_id',
                    as: 'offered'
                }
            },
            { $unwind: '$offered' },
            {
                $lookup: {
                    from: 'periods',
                    localField: 'offered.period',
                    foreignField: '_id',
                    as: 'periodDetail'
                }
            },
            { $unwind: '$periodDetail' },
            {
                $group: {
                    _id: '$periodDetail.name',
                    avgScore: { $avg: '$finalScore' },
                    passRate: { $avg: { $cond: [{ $gte: ['$finalScore', 40] }, 1, 0] } }
                }
            },
            { $project: { period: '$_id', avgScore: { $round: ['$avgScore', 1] }, passRate: { $round: [{ $multiply: ['$passRate', 100] }, 1] }, _id: 0 } },
            { $sort: { period: 1 } }
        ]);

        // 6. At-Risk Students (Predictive markers: attendance < 50% or failed >= 2 units)
        // This is a simplified sample identifying specific students
        const atRiskStudents = await Student.aggregate([
            {
                $lookup: {
                    from: 'attendancedetails',
                    localField: '_id',
                    foreignField: 'student',
                    as: 'attendance'
                }
            },
            {
                $addFields: {
                    attendanceRate: {
                        $cond: [
                            { $gt: [{ $size: '$attendance' }, 0] },
                            { $divide: [{ $size: { $filter: { input: '$attendance', as: 'a', cond: { $eq: ['$$a.status', true] } } } }, { $size: '$attendance' }] },
                            1 // Default to 1 (100%) if no records to avoid false positives
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: 'grades',
                    localField: '_id',
                    foreignField: 'student',
                    as: 'studentGrades'
                }
            },
            {
                $addFields: {
                    failingUnits: {
                        $size: {
                            $filter: {
                                input: '$studentGrades',
                                as: 'g',
                                cond: { $lt: ['$$g.finalScore', 40] }
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { attendanceRate: { $lt: 0.5 } },
                        { failingUnits: { $gte: 2 } }
                    ]
                }
            },
            {
                $project: {
                    adm: 1,
                    name: { $concat: ['$fname', ' ', '$lname'] },
                    attendanceRate: { $round: [{ $multiply: ['$attendanceRate', 100] }, 1] },
                    failingUnits: 1,
                    riskLevel: {
                        $cond: [{ $gte: ['$failingUnits', 3] }, 'Critical', 'Moderate']
                    }
                }
            },
            { $limit: 10 } // Limit for dashboard view
        ]);

        // 7. Course Completion Rate (Overall units passed vs registered)
        const totalRegUnits = await mongoose.model('unitReg').countDocuments();
        const totalPassedUnits = await Grade.countDocuments({ finalScore: { $gte: 40 } });
        const completionRate = totalRegUnits > 0 ? Math.round((totalPassedUnits / totalRegUnits) * 100) : 0;

        res.json({
            summary: {
                totalStudents,
                averageScore: Math.round(avgStats.averageScore),
                passRate: Math.round(avgStats.passRate * 100),
                totalRevenue: financeStats.totalPaid,
                outstandingBalance: financeStats.totalBalance,
                attendanceRate,
                completionRate
            },
            enrollment,
            performance,
            finance: financeStats,
            trends,
            atRiskStudents,
        });

    } catch (error) {
        console.error('Error fetching institutional analytics:', error);
        res.status(500).json({ err: 'Failed to aggregate analytics data' });
    }
};

module.exports = { getInstitutionalAnalytics };
