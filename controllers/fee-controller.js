const { Structure, Academic, Accommodation } = require('../models/fee-model');
const Payment = require('../models/payment-model');
const Student = require('../models/student-model');
const Semester = require('../models/semester-model');
const Allocation = require('../models/accommodation-allocation-model');
const Room = require('../models/room-model');
const mongoose = require('mongoose');

// Fee fields to sum for academics
const academicFields = [
    'tuition', 'examination', 'libraryICT', 'lab', 'registration',
    'studentID', 'medical', 'caution', 'activitySports', 'graduation',
    'attachment', 'professionalAttire', 'booksSupplies'
];

const calcAcademics = (item) => {
    return academicFields.reduce((acc, field) => acc + (Number(item[field]) || 0), 0);
};

// Add Structure
module.exports.addStructure = async (req, res) => {
    const { course, session } = req.body;
    try {
        const existing = await Structure.findOne({ course, session });
        if (existing) {
            return res.status(400).json({ error: 'Fee structure already exists for this course and session!' });
        }
        // Ensure academics total is fresh
        const structureData = { ...req.body };
        structureData.academics = calcAcademics(structureData);

        const structure = new Structure(structureData);
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
        }).sort({ createdAt: -1 }).lean();

        // Dynamically calculate academics total for each
        const updatedStructures = structures.map(s => ({
            ...s,
            academics: calcAcademics(s)
        }));

        res.status(200).json(updatedStructures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Update Structure
module.exports.updateStructure = async (req, res) => {
    try {
        // Ensure academics total is fresh
        const updateData = { ...req.body };
        updateData.academics = calcAcademics(updateData);

        const structure = await Structure.findByIdAndUpdate(req.params.id, updateData, { new: true });
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

        structure = await Structure.findOne({ _id: new mongoose.Types.ObjectId(lastSemester.structure) }).lean();

        if (structure) {
            // Dynamically calculate academics total
            structure.academics = calcAcademics(structure);

            // Robust Room Price Lookup: Check Allocation first
            const allocation = await Allocation.findOne({ semester: lastSemester._id }).populate('room');
            if (allocation && allocation.room) {
                structure.accommodation = allocation.room.price;
            } else {
                const accFee = await Accommodation.findOne({ semester: lastSemester._id });
                structure.accommodation = accFee ? accFee.payable : 0;
            }

            return res.status(200).json(structure);
        }

        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const session = lastSemester ? lastSemester.session : "Year I - Semester I";

        structure = await Structure.findOne({ course: student.course, session: session }).lean();
        if (structure) {
            // Dynamically calculate academics total
            structure.academics = calcAcademics(structure);

            // Robust Room Price Lookup: Check Allocation first
            const allocation = await Allocation.findOne({ semester: lastSemester ? lastSemester._id : null }).populate('room');
            if (allocation && allocation.room) {
                structure.accommodation = allocation.room.price;
            } else {
                const accFee = await Accommodation.findOne({ semester: lastSemester ? lastSemester._id : null });
                structure.accommodation = accFee ? accFee.payable : 0;
            }
        }

        res.status(200).json(structure);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
