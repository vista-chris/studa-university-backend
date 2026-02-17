const { Structure, Academic, Accomodation } = require('../models/fee-model');
const Payment = require('../models/payment-model');
const Student = require('../models/student-model');
const Semester = require('../models/semester-model');
const mongoose = require('mongoose');

// Add Structure
module.exports.addStructure = async (req, res) => {
    const { course, session } = req.body;
    try {
        const existing = await Structure.findOne({ course, session });
        if (existing) {
            return res.status(400).json({ error: 'Fee structure already exists for this course and session!' });
        }
        const structure = new Structure(req.body);
        await structure.save();
        res.status(201).json({ success: 'Structure added successfully', structure });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get All Structures
module.exports.getStructures = async (req, res) => {
    try {
        const structures = await Structure.find().populate({
            path: 'course',
            select: 'name code'
        }).sort({ createdAt: -1 });
        res.status(200).json(structures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Update Structure
module.exports.updateStructure = async (req, res) => {
    try {
        const structure = await Structure.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: 'Structure updated successfully', structure });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Delete Structure
module.exports.deleteStructure = async (req, res) => {
    try {
        const ids = req.body; // Expecting an array of IDs
        await Structure.deleteMany({ _id: { $in: ids } });
        res.status(200).json({ success: 'Structure(s) deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Student: Get Statements
module.exports.getStudentStatements = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const statements = await Academic.aggregate([
            {
                $lookup: {
                    from: 'semesters',
                    localField: 'semester',
                    foreignField: '_id',
                    as: 'sem'
                }
            },
            { $unwind: '$sem' },
            {
                $match: { 'sem.student': new mongoose.Types.ObjectId(studentId) }
            },
            {
                $lookup: {
                    from: 'periods',
                    localField: 'sem.period',
                    foreignField: '_id',
                    as: 'per'
                }
            },
            { $unwind: '$per' },
            {
                $project: {
                    period: '$per.name',
                    session: '$sem.session',
                    payable: 1,
                    paid: 1,
                    balance: 1,
                    excess: 1,
                    createdAt: 1
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.status(200).json(statements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Student: Get Payment History
module.exports.getPaymentHistory = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const payments = await Payment.find({ student: studentId }).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Student: Get current structure
module.exports.getStudentStructure = async (req, res) => {
    const { studentId } = req.params;
    let structure, lastSemester;
    try {
        lastSemester = await Semester.findOne({ student: studentId }).sort({ createdAt: -1 });
        if (!lastSemester) return res.status(404).json({ error: 'Student not found' });
        structure = await Structure.findOne({ _id: new mongoose.Types.ObjectId(lastSemester.structure) });
        if (structure) return res.status(200).json(structure);

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        lastSemester = await Semester.findOne({ student: studentId }).sort({ createdAt: -1 });
        const session = lastSemester ? lastSemester.session : "Year I - Semester I";

        structure = await Structure.findOne({ course: student.course, session: session });

        res.status(200).json(structure);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
