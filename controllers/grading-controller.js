const Grade = require('../models/grade-model');
const { OfferedUnit } = require('../models/unit-model');
const mongoose = require('mongoose');

// Fetch comprehensive results for a student
const getStudentResultsData = async (req, res) => {
    const studentId = req.params.studentId || (res.locals.user ? res.locals.user.id : null);

    if (!studentId) {
        return res.status(400).json({ err: 'Student ID is required' });
    }

    try {
        const grades = await Grade.find({ student: new mongoose.Types.ObjectId(studentId) })
            .populate({
                path: 'offeredUnit',
                populate: { path: 'unit' }
            })
            .populate({
                path: 'offeredUnit',
                populate: { path: 'period' }
            })
            .sort({ createdAt: -1 });

        if (grades.length === 0) {
            return res.json({
                summary: { gpa: '0.00', cgpa: '0.00', totalCredits: 0, units: 0, standing: 'N/A' },
                semesters: [],
                allGrades: [],
                insights: { strengths: [], focusAreas: [] }
            });
        }

        // Calculate CGPA and Total Credits
        let totalQualityPoints = 0;
        let totalCredits = 0;
        const semesterMap = {};

        grades.forEach(g => {
            if (g.offeredUnit && g.offeredUnit.unit && g.offeredUnit.period) {
                const unit = g.offeredUnit.unit;
                const period = g.offeredUnit.period;
                const credits = unit.creditHours || 3;
                const points = g.points || 0;

                totalQualityPoints += (points * credits);
                totalCredits += credits;

                // Group by semester (period)
                const pid = period._id.toString();
                if (!semesterMap[pid]) {
                    semesterMap[pid] = {
                        periodName: period.name || 'Unknown Semester',
                        periodId: pid,
                        grades: [],
                        credits: 0,
                        qp: 0
                    };
                }
                semesterMap[pid].grades.push(g);
                semesterMap[pid].credits += credits;
                semesterMap[pid].qp += (points * credits);
            }
        });

        const cgpa = totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : '0.00';

        // Format semesters for UI
        const semesters = Object.values(semesterMap).map(s => ({
            ...s,
            gpa: s.credits > 0 ? (s.qp / s.credits).toFixed(2) : '0.00'
        })).sort((a, b) => b.periodName.localeCompare(a.periodName));

        // Calculate Standing
        let standing = 'Good Standing';
        const cgpaNum = Number(cgpa);
        if (cgpaNum >= 3.7) standing = "Dean's List";
        else if (cgpaNum >= 3.5) standing = "First Class Honors";
        else if (cgpaNum < 2.0) standing = 'Academic Probations';

        // Strengths & Focus Areas (published results only usually)
        const publishedGrades = grades.filter(g => g.status === 'Published');
        const sortedByScore = [...publishedGrades].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

        const strengths = sortedByScore.slice(0, 3).filter(g => (g.finalScore || 0) >= 70).map(g => ({
            name: g.offeredUnit.unit.name,
            code: g.offeredUnit.unit.code,
            score: g.finalScore
        }));

        const focusAreas = grades.filter(g => g.finalScore !== undefined && g.finalScore < 50).map(g => ({
            name: g.offeredUnit.unit.name,
            code: g.offeredUnit.unit.code,
            score: g.finalScore
        }));

        res.json({
            summary: {
                cgpa,
                totalCredits,
                units: grades.length,
                standing,
                currentSemesterGpa: semesters[0] ? semesters[0].gpa : '0.00',
                currentSemesterCredits: semesters[0] ? semesters[0].credits : 0
            },
            semesters,
            allGrades: grades,
            insights: { strengths, focusAreas }
        });

    } catch (error) {
        console.error('Error fetching results data:', error);
        res.status(500).json({ err: 'Failed to fetch results data' });
    }
};

module.exports = { getStudentResultsData };
