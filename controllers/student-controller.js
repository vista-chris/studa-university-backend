const Student = require('../models/student-model');
const Semester = require('../models/semester-model');
const Period = require('../models/period-model');
const { OfferedUnit, UnitReg } = require('../models/unit-model');
const { AttendanceDetail, AttendanceRecord } = require('../models/attendance-model');
const Grade = require('../models/grade-model');
const Meeting = require('../models/meeting-model');
const Assignment = require('../models/assignment-model');
const mongoose = require('mongoose');

// Get all students
module.exports.getAllStudents = async (req, res) => {
    try {
        const students = await Student.find().select('-password').populate('course').sort({ createdAt: -1 });
        res.status(200).json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get single student profile (Authenticated)
module.exports.getStudentProfile = async (req, res) => {
    try {
        const student = await Student.findById(res.locals.user.id).select('-password');
        res.status(200).json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Update student
module.exports.updateStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Bulk delete students
module.exports.deleteStudents = async (req, res) => {
    const ids = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No student IDs provided' });
    }
    try {
        await Student.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ success: 'Students deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get Student Dashboard Data (Aggregated)
module.exports.getStudentDashboardData = async (req, res) => {
    const studentId = req.params.studentId;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ err: 'Invalid Student ID' });
    }

    try {
        // 1. Fetch Basic Student Info & Current Period
        const student = await Student.findById(studentId)
            .select('fname lname adm course')
            .populate('course', 'name code');
        const currentPeriod = await Period.findOne().sort({ createdAt: -1 });

        // 2. Fetch Semester & Registration
        let semester = null;
        let regUnits = [];
        let earnedCredits = 0;
        let totalCredits = 0;
        let cgpa = 0.00;
        let attendanceRate = 0;
        let activeMeetings = [];
        let upcomingAssignments = [];

        if (currentPeriod) {
            semester = await Semester.findOne({ student: studentId, period: currentPeriod._id });
            if (semester) {
                // Fetch registered units for this semester
                const unitRegs = await UnitReg.find({ semester: semester._id })
                    .populate({
                        path: 'unit', // This is OfferedUnit
                        populate: { path: 'unit' } // This is Unit Base
                    });

                // Filter out null/invalid units (where offeredUnit or base unit might be deleted)
                regUnits = unitRegs
                    .filter(ur => ur.unit && ur.unit.unit)
                    .map(ur => ({
                        _id: ur.unit._id,
                        code: ur.unit.unit.code,
                        name: ur.unit.unit.name,
                        lecturer: ur.unit.lecturer
                    }));
            }
        }

        // 3. GPA & Credits
        const allGrades = await Grade.find({ student: studentId, status: 'Published' });
        let totalPoints = 0;

        allGrades.forEach(g => {
            const points = g.points || 0;
            const credits = 3; // Defaulting to 3 as it's common
            totalPoints += points * credits;
            totalCredits += credits;
            if (g.finalScore >= 40) earnedCredits += credits;
        });

        cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0.00;

        // 4. Attendance Rate (Current Semester)
        if (regUnits.length > 0) {
            const offeredUnitIds = regUnits.map(u => u._id);
            // Get all attendance sessions for these units
            const attendanceRecords = await AttendanceRecord.find({ unit: { $in: offeredUnitIds } });
            const attendanceRecordIds = attendanceRecords.map(ar => ar._id);

            if (attendanceRecordIds.length > 0) {
                const totalSessions = attendanceRecordIds.length;
                const attendedSessions = await AttendanceDetail.countDocuments({
                    student: studentId,
                    attendance: { $in: attendanceRecordIds },
                    status: true
                });
                attendanceRate = Math.round((attendedSessions / totalSessions) * 100);
            }
        }

        // 5. Active Meetings
        if (regUnits.length > 0) {
            const offeredUnitIds = regUnits.map(u => u._id);
            const meetings = await Meeting.find({
                unit: { $in: offeredUnitIds },
                status: 'active'
            })
                .populate({
                    path: 'unit',
                    populate: { path: 'unit', select: 'code name' }
                })
                .populate('instructor', 'fname lname');

            activeMeetings = meetings.map(m => ({
                _id: m._id,
                title: m.title,
                roomId: m.roomId,
                unit: {
                    code: m.unit?.unit?.code || 'N/A',
                    name: m.unit?.unit?.name || 'N/A'
                },
                instructor: m.instructor
            }));
        }

        // 6. Upcoming Assignments
        if (regUnits.length > 0) {
            const offeredUnitIds = regUnits.map(u => u._id);
            const now = new Date();
            const assignments = await Assignment.find({
                unit: { $in: offeredUnitIds },
                deadline: { $gte: now }
            }).sort({ deadline: 1 }).limit(5)
                .populate({
                    path: 'unit',
                    populate: { path: 'unit', select: 'code name' }
                });

            upcomingAssignments = assignments.map(a => ({
                _id: a._id,
                name: a.name,
                deadline: a.deadline,
                unitCode: a.unit?.unit?.code || '???',
                unitName: a.unit?.unit?.name || '???'
            }));
        }

        res.json({
            student,
            semester: semester ? { session: semester.session, period: currentPeriod.name } : null,
            currentPeriod: currentPeriod ? { _id: currentPeriod._id, name: currentPeriod.name } : null,
            stats: {
                cgpa: cgpa,
                earnedCredits: earnedCredits,
                // enrolledUnits: regUnits.length, // Already in regUnits array length
                attendanceRate: attendanceRate
            },
            regUnits,
            activeMeetings,
            upcomingAssignments
        });

    } catch (err) {
        console.error('Dashboard Data Error:', err);
        res.status(500).json({ err: 'Failed to fetch dashboard data' });
    }
}

// Get Available Sessions logic
module.exports.getAvailableSessions = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const student = await Student.findById(studentId);
        const lastSemester = await Semester.findOne({ student: studentId }).sort({ createdAt: -1 });

        let availableSessions = [];
        const sessions = [
            "Year I - Semester I", "Year I - Semester II",
            "Year II - Semester I", "Year II - Semester II",
            "Year III - Semester I", "Year III - Semester II",
            "Year IV - Semester I", "Year IV - Semester II",
        ];

        // Filter sessions if trimester (logic ported from legacy)
        // const filteredSessions = student.trimester ? sessions : sessions.filter(s => !s.includes("Semester III"));
        // Assuming standard 2 sem for now as per legacy snippet provided in context

        if (!lastSemester) {
            availableSessions = [sessions[0]];
        } else {
            const currentIndex = sessions.indexOf(lastSemester.session);
            if (currentIndex !== -1 && currentIndex < sessions.length - 1) {
                availableSessions = [sessions[currentIndex + 1]];
            } else if (currentIndex === sessions.length - 1) {
                availableSessions = ["All Semesters Completed"];
            } else {
                availableSessions = [sessions[0]];
            }
        }
        availableSessions.push("Retake");

        res.json(availableSessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Failed to fetch available sessions' });
    }
}
