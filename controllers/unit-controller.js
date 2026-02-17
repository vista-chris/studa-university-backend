const { Unit, OfferedUnit, UnitReg } = require('../models/unit-model')
const Semester = require('../models/semester-model')
const { AttendanceRecord, AttendanceDetail } = require('../models/attendance-model')
const Timetable = require('../models/timetable-model')
const Student = require('../models/student-model')
const mongoose = require('mongoose')
const formidable = require('formidable')
const path = require('path')
const fs = require('fs')
const Note = require('../models/note-model')
const Assignment = require('../models/assignment-model')
const Submission = require('../models/submission-model')
const Grade = require('../models/grade-model')
const File = require('../models/file-model')

// Helper function to handle cross-device file moves
const moveFile = (oldPath, newPath) => {
    try {
        fs.renameSync(oldPath, newPath);
    } catch (err) {
        if (err.code === 'EXDEV') {
            fs.copyFileSync(oldPath, newPath);
            fs.unlinkSync(oldPath);
        } else {
            throw err;
        }
    }
}

//add course unit
const addUnit = async (req, res) => {
    let { code, name, course, session, lecturer, status } = req.body;

    try {
        const newUnit = await Unit.create({
            code: code.trim().toUpperCase(),
            name: name.trim(),
            course,
            session,
            lecturer,
            status: status || false
        });

        res.status(201).json({
            success: 'A new unit has been added successfully.',
            data: newUnit
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ err: `Unit code "${code}" already exists.` });
        }

        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(val => val.message)[0];
            return res.status(400).json({ err: msg });
        }

        console.error("Add Unit Error:", error);
        res.status(500).json({ err: 'Failed to add unit due to a server error.' });
    }
}

//fetch course units
const fetchUnits = async (req, res) => {
    try {
        const units = await Unit.find()
            .populate('course')
            .populate('lecturer', '_id title fname lname')
            .sort({ _id: -1 });

        res.status(200).json(units);
    } catch (error) {
        console.error("Fetch Units Error:", error);
        res.status(500).json({ err: "Failed to fetch units" });
    }
}

//remove course unit
const deleteUnit = async (req, res) => {
    const unitIds = req.body;

    try {
        // Find all offered units associated with these base units
        const offeredUnits = await OfferedUnit.find({ unit: { $in: unitIds } }).select('_id');
        const offeredUnitIds = offeredUnits.map(ou => ou._id);

        // Count student registrations for these offered units
        const enrollmentCount = await UnitReg.countDocuments({ unit: { $in: offeredUnitIds } });

        if (enrollmentCount > 0) {
            return res.status(400).json({
                err: `Cannot delete. There are ${enrollmentCount} student registrations associated with these units.`
            });
        }
        await Unit.deleteMany({ _id: { $in: unitIds } });
        await OfferedUnit.deleteMany({ unit: { $in: unitIds } });

        res.status(200).json({ success: 'Selected unit(s) have been deleted successfully.' });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ err: 'Failed to delete unit(s)!' });
    }
}

//update course unit
const updateUnit = async (req, res) => {
    const { id } = req.params;
    const { code, name, course, session, lecturer, status, period } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ err: 'Invalid Unit ID format.' });
    }

    try {
        const updatedUnit = await Unit.findByIdAndUpdate(
            id,
            {
                code: code.trim().toUpperCase(),
                name: name.trim(),
                course,
                session,
                lecturer,
                status
            },
            { new: true, runValidators: true }
        );

        if (!updatedUnit) {
            return res.status(404).json({ err: 'Unit not found' });
        }

        // Logic for OfferedUnit syncing
        if (period) {
            if (!status) {
                await OfferedUnit.findOneAndDelete({ unit: id, period });
            } else {
                await OfferedUnit.findOneAndUpdate(
                    { unit: id, period },
                    { lecturer }
                );
            }
        }

        res.status(200).json({ success: 'The unit details have been updated successfully.' });

    } catch (err) {
        if (err.code === 11000) {
            res.status(409).json({ err: 'Another unit already uses this code.' });
        } else {
            console.error("Update Error:", err);
            res.status(500).json({ err: 'Failed to update unit!' });
        }
    }
}

//apply selected course units
const applyUnits = async (req, res) => {
    const { period, units } = req.body;
    const students = 0;

    if (!units || !Array.isArray(units)) {
        return res.status(400).json({ err: 'Invalid units provided' });
    }

    try {
        await Promise.all(units.map(async (unitId) => {
            const exists = await OfferedUnit.findOne({ unit: unitId, period });

            if (!exists) {
                const unitData = await Unit.findById(unitId);

                if (unitData) {
                    await OfferedUnit.create({
                        unit: unitId,
                        students,
                        period,
                        lecturer: unitData.lecturer
                    });
                }
            }
        }));

        res.status(200).json({ success: 'The unit(s) have been applied...' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Failed to apply for unit(s)!' });
    }
};

//fetch offered course units
const fetchOfferedUnits = async (req, res) => {
    const { periodId } = req.params;
    try {
        const units = await OfferedUnit.aggregate([
            { $match: { period: new mongoose.Types.ObjectId(periodId) } },
            {
                $lookup: {
                    from: "units",
                    localField: "unit",
                    foreignField: "_id",
                    as: "unitDetails"
                }
            },
            { $unwind: "$unitDetails" },

            {
                $lookup: {
                    from: "users", // Use 'users' collection name (lowercase)
                    localField: "lecturer",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },

            {
                $lookup: {
                    from: "courses",
                    localField: "unitDetails.course",
                    foreignField: "_id",
                    as: "courseDetails"
                }
            },
            { $unwind: "$courseDetails" },

            {
                $lookup: {
                    from: "periods",
                    localField: "period",
                    foreignField: "_id",
                    as: "periodDetails"
                }
            },
            { $unwind: "$periodDetails" },

            { $sort: { createdAt: -1 } },

            {
                $project: {
                    _id: 1,
                    students: 1,
                    createdAt: 1,
                    period: { _id: "$periodDetails._id", name: "$periodDetails.name" },
                    course: {
                        _id: "$courseDetails._id",
                        code: "$courseDetails.code",
                        type: "$courseDetails.type",
                        faculty: "$courseDetails.faculty"
                    },
                    unit: {
                        _id: "$unitDetails._id",
                        code: "$unitDetails.code",
                        name: "$unitDetails.name",
                        session: "$unitDetails.session"
                    },
                    lecturer: {
                        _id: "$userDetails._id",
                        title: "$userDetails.title",
                        fname: "$userDetails.fname",
                        lname: "$userDetails.lname"
                    }
                }
            }
        ]);
        res.status(200).json(units);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

//remove course unit
const removeOfferedUnit = async (req, res) => {
    const unitIds = req.body;

    try {
        const attendanceRecords = await AttendanceRecord.find({ unit: { $in: unitIds } }).select('_id');
        const attendanceIds = attendanceRecords.map(rec => rec._id);

        await Promise.all([
            OfferedUnit.deleteMany({ _id: { $in: unitIds } }),
            Timetable.deleteMany({ unit: { $in: unitIds } }),
            AttendanceRecord.deleteMany({ unit: { $in: unitIds } }),
            AttendanceDetail.deleteMany({ attendance: { $in: attendanceIds } }),
            UnitReg.deleteMany({ unit: { $in: unitIds } })
        ]);

        res.json({ success: 'The unit(s) and all associated records have been removed.' });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ err: 'Failed to remove unit(s)!' });
    }
}

//register course unit
const regUnits = async (req, res) => {
    const { units, period, student } = req.body; // units is an array of offeredUnitIds

    try {
        const semesterDoc = await Semester.findOne({ period, student });
        if (!semesterDoc) return res.status(404).json({ err: 'Please first register for the semester!' });

        const existingRegs = await UnitReg.find({ semester: semesterDoc._id });
        if (existingRegs.length + units.length > 8) {
            return res.status(400).json({ err: `Limit exceeded. Max 8 units allowed.` });
        }

        const offeredUnitsData = await OfferedUnit.find({ _id: { $in: units } }).populate('unit');
        const unitBaseIds = offeredUnitsData.map(ou => ou.unit._id);

        const history = await UnitReg.aggregate([
            { $lookup: { from: "semesters", localField: "semester", foreignField: "_id", as: "sem" } },
            { $unwind: "$sem" },
            { $match: { "sem.student": new mongoose.Types.ObjectId(student) } },
            { $lookup: { from: "offeredunits", localField: "unit", foreignField: "_id", as: "ou" } },
            { $unwind: "$ou" },
            { $match: { "ou.unit": { $in: unitBaseIds } } },
            { $lookup: { from: "units", localField: "ou.unit", foreignField: "_id", as: "u" } },
            { $unwind: "$u" }
        ]);

        if (history.length > 0) {
            return res.status(409).json({
                err: `You've already taken ${history[0].u.code} ${history[0].u.name} in a previous semester.`,
                unitName: history[0].u.name
            });
        }

        for (const ou of offeredUnitsData) {
            const alreadyRegistered = await UnitReg.findOne({ unit: ou._id, semester: semesterDoc._id });

            if (!alreadyRegistered) {
                await UnitReg.create({ unit: ou._id, semester: semesterDoc._id });

                // Batch update attendance
                const sessions = await AttendanceRecord.find({ unit: ou._id });
                const attendanceOps = sessions.map(s => ({
                    updateOne: {
                        filter: { attendance: s._id, student },
                        update: { $setOnInsert: { attendance: s._id, student, status: 0 } },
                        upsert: true
                    }
                }));

                if (attendanceOps.length > 0) await AttendanceDetail.bulkWrite(attendanceOps);
                await OfferedUnit.findByIdAndUpdate(ou._id, { $inc: { students: 1 } });
            }
        }

        res.status(200).json({ success: 'Units registered successfully!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Internal Server Error' });
    }
};

//fetch registered course units
const fetchRegUnits = async (req, res) => {
    const { student } = req.params;

    try {
        const units = await UnitReg.aggregate([
            {
                $lookup: {
                    from: "semesters",
                    localField: "semester",
                    foreignField: "_id",
                    as: "semester"
                }
            },
            { $unwind: "$semester" },

            {
                $match: {
                    "semester.student": new mongoose.Types.ObjectId(student)
                }
            },

            {
                $lookup: {
                    from: "offeredunits",
                    localField: "unit",
                    foreignField: "_id",
                    as: "offeredunit"
                }
            },
            { $unwind: "$offeredunit" },

            {
                $lookup: {
                    from: "units",
                    localField: "offeredunit.unit",
                    foreignField: "_id",
                    as: "unit_details"
                }
            },
            { $unwind: "$unit_details" },

            {
                $lookup: {
                    from: "users",
                    localField: "unit_details.lecturer",
                    foreignField: "_id",
                    as: "lecturer"
                }
            },
            { $unwind: "$lecturer" },

            {
                $project: {
                    _id: "$offeredunit._id",
                    session: "$semester.session",
                    period: "$offeredunit.period",
                    code: "$unit_details.code",
                    name: "$unit_details.name",
                    lecturer: {
                        $concat: ["$lecturer.title", " ", "$lecturer.fname", " ", "$lecturer.lname"]
                    }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json(units);
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: "Server error fetching units" });
    }
};

//remove registered course unit
const removeRegUnit = async (req, res) => {
    const { units } = req.body

    try {
        for (let i = 0; i < units.length; i++) {
            const id = units[i]
            const deletedReg = await UnitReg.findOneAndDelete({ unit: id })

            if (deletedReg) {
                const { unit } = deletedReg;

                const unit_students = await UnitReg.aggregate([
                    { $match: { unit } },
                    { $group: { _id: null, students: { $sum: 1 } } }
                ]);

                let students = 0;
                if (unit_students.length > 0) {
                    students = unit_students[0].students;
                }

                await OfferedUnit.findByIdAndUpdate({ _id: unit }, { students });
            }
        }
        res.json({ success: 'The unit(s) have been removed...' })
    } catch (err) {
        console.log(err)
        res.json({ err: 'Failed to delete unit(s)!' })
    }
}

//upload unit notes
const uploadNotes = async (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error(err);
            return res.json({ err: 'Failed to upload notes!' });
        }

        const unit = Array.isArray(fields.unit) ? fields.unit[0] : fields.unit;
        const remarks = Array.isArray(fields.remarks) ? fields.remarks[0] : fields.remarks;
        const fmFileRaw = Array.isArray(fields.fmFile) ? fields.fmFile[0] : fields.fmFile;

        const file = files.file;
        try {
            let fileName = '';
            let fileId = null;
            if (file) {
                const uploadedFile = Array.isArray(file) ? file[0] : file;
                const oldpath = uploadedFile.filepath;
                fileName = Date.now() + "_" + uploadedFile.originalFilename;
                const newpath = path.join(__dirname, "../public/assets/uploads/" + fileName);
                moveFile(oldpath, newpath);

                const ext = fileName.split('.').pop().toLowerCase();
                let type = 'file';
                if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) type = 'image';
                else if (['pdf'].includes(ext)) type = 'pdf';
                else if (['txt', 'md'].includes(ext)) type = 'text';
                else if (['xlsx', 'csv'].includes(ext)) type = 'excel';

                const newFile = await File.create({
                    name: uploadedFile.originalFilename,
                    type: type,
                    size: uploadedFile.size,
                    parentId: 'root',
                    ownerId: res.locals.user ? res.locals.user._id : '000000000000000000000000',
                    path: '/assets/uploads/' + fileName,
                    unitId: unit,
                    category: 'note'
                });
                fileId = newFile._id;
            } else if (fmFileRaw) {
                const fmFile = JSON.parse(fmFileRaw);
                fileId = fmFile._id;
                await File.findByIdAndUpdate(fmFile._id, {
                    $set: { unitId: unit, category: 'note' }
                });
                fileName = fmFile.path.split('/').pop();
            }

            if (!fileName) return res.json({ err: 'No file provided!' });

            await Note.create({ name: fileName, remarks, unit, fileId });
            res.json({ success: 'Notes uploaded successfully.' });
        } catch (error) {
            console.error(error);
            res.json({ err: 'Failed to save notes information!' });
        }
    });
}

//upload unit assignment
const uploadAssignment = async (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error(err);
            return res.json({ err: 'Failed to upload assignment!' });
        }

        const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
        const instructions = Array.isArray(fields.instructions) ? fields.instructions[0] : fields.instructions;
        const deadline = Array.isArray(fields.deadline) ? fields.deadline[0] : fields.deadline;
        const unit = Array.isArray(fields.unit) ? fields.unit[0] : fields.unit;
        const fmFileRaw = Array.isArray(fields.fmFile) ? fields.fmFile[0] : fields.fmFile;

        const file = files.file;

        try {
            let fileName = '';
            let fileId = null;
            if (file) {
                const uploadedFile = Array.isArray(file) ? file[0] : file;
                if (uploadedFile && uploadedFile.originalFilename) {
                    const oldpath = uploadedFile.filepath;
                    fileName = Date.now() + "_" + uploadedFile.originalFilename;
                    const newpath = path.join(__dirname, "../public/assets/uploads/" + fileName);
                    moveFile(oldpath, newpath);

                    const ext = fileName.split('.').pop().toLowerCase();
                    let type = 'file';
                    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) type = 'image';
                    else if (['pdf'].includes(ext)) type = 'pdf';
                    else if (['txt', 'md'].includes(ext)) type = 'text';
                    else if (['xlsx', 'csv'].includes(ext)) type = 'excel';

                    const newFile = await File.create({
                        name: uploadedFile.originalFilename,
                        type: type,
                        size: uploadedFile.size,
                        parentId: 'root',
                        ownerId: res.locals.user ? res.locals.user._id : '000000000000000000000000',
                        path: '/assets/uploads/' + fileName,
                        unitId: unit,
                        category: 'assignment'
                    });
                    fileId = newFile._id;
                }
            } else if (fmFileRaw) {
                const fmFile = JSON.parse(fmFileRaw);
                fileId = fmFile._id;
                await File.findByIdAndUpdate(fmFile._id, {
                    $set: { unitId: unit, category: 'assignment' }
                });
                fileName = fmFile.path.split('/').pop();
            }

            await Assignment.create({ name, instructions, deadline, unit, file: fileName, fileId });
            res.json({ success: 'Assignment uploaded successfully.' });
        } catch (error) {
            console.error(error);
            res.json({ err: 'Failed to save assignment information!' });
        }
    });
}

//delete assignment
const deleteAssignment = async (req, res) => {
    const { assignmentId } = req.params;
    try {
        const studentSubmissions = await Submission.countDocuments({ assignment: assignmentId });
        if (studentSubmissions > 0) {
            return res.status(400).json({
                err: `${studentSubmissions} student(s) have submitted assignments.`
            });
        }
        await Assignment.findByIdAndDelete(assignmentId);
        res.json({ success: 'Assignment deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.json({ err: 'Failed to delete assignment!' });
    }
}

const updateAssignment = async (req, res) => {
    const form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../public/uploads/assignments');
    form.keepExtensions = true;

    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ err: 'Failed to parse form data!' });
        }

        const { assignmentId } = req.params;
        const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
        const instructions = Array.isArray(fields.instructions) ? fields.instructions[0] : fields.instructions;
        const deadline = Array.isArray(fields.deadline) ? fields.deadline[0] : fields.deadline;

        try {
            const updateData = { name, instructions, deadline };

            if (files.file && files.file[0] && files.file[0].size > 0) {
                const uploadedFile = files.file[0];
                updateData.filePath = `/uploads/assignments/${uploadedFile.newFilename}`;

                const oldAssignment = await Assignment.findById(assignmentId);
                if (oldAssignment?.filePath) {
                    const oldPath = path.join(__dirname, '../public', oldAssignment.filePath);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
            }

            const updated = await Assignment.findByIdAndUpdate(
                assignmentId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updated) return res.status(404).json({ err: 'Assignment not found' });

            res.status(200).json({ success: 'Assignment updated successfully.' });
        } catch (dbErr) {
            console.error('Database Error:', dbErr);
            res.status(500).json({ err: 'Failed to update assignment in database!' });
        }
    });
}

// fetch student assignments
const fetchStudentAssignments = async (req, res) => {
    const { studentId, unitId } = req.params;

    try {
        const assignmentList = await Assignment.aggregate([
            { $match: { unit: new mongoose.Types.ObjectId(unitId) } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'files',
                    localField: 'fileId',
                    foreignField: '_id',
                    as: 'fileId'
                }
            },
            { $unwind: { path: '$fileId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'submissions',
                    let: { assignmentId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$assignment', '$$assignmentId'] },
                                        { $eq: ['$student', new mongoose.Types.ObjectId(studentId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'submission'
                }
            },
            {
                $addFields: {
                    submission: { $arrayElemAt: ['$submission', 0] }
                }
            }
        ]);
        res.json(assignmentList);
    } catch (err) {
        console.error('Error fetching student assignments:', err);
        res.json({ err: 'Failed to fetch learning materials!' });
    }
}

// fetch materials (notes & assignments) for a specific unit
const fetchUnitMaterials = async (req, res) => {
    const { unitId } = req.params;

    try {
        const notes = await Note.find({ unit: unitId }).populate('fileId').sort({ createdAt: -1 });
        const otherFiles = await File.find({ unitId: unitId, category: 'other', isInTrash: false }).sort({ createdAt: -1 });

        res.json({ notes, otherFiles });
    } catch (err) {
        console.error('Error fetching unit materials:', err);
        res.json({ err: 'Failed to fetch unit materials!' });
    }
}

// submit assignment
const submitAssignment = async (req, res) => {
    const { studentId, assignmentId, content, status } = req.body;
    const submissionStatus = status || 'Submitted';

    try {
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.json({ err: 'Assignment not found!' });
        }

        // Check if already graded
        const existingSubmission = await Submission.findOne({ student: studentId, assignment: assignmentId });
        if (existingSubmission && existingSubmission.status === 'Graded') {
            return res.json({ err: 'This assignment has already been graded and cannot be modified.' });
        }

        // Deadline validation only if confirming submission
        if (submissionStatus === 'Submitted') {
            const now = new Date();
            const deadline = new Date(assignment.deadline);
            if (now > deadline) {
                return res.json({ err: 'Deadline has already passed. Submission failed!' });
            }
        }

        await Submission.findOneAndUpdate(
            { student: studentId, assignment: assignmentId },
            { content, status: submissionStatus },
            { upsert: true, new: true }
        );

        res.json({ success: submissionStatus === 'Draft' ? 'Draft saved successfully.' : 'Assignment submitted successfully.' });
    } catch (err) {
        console.error('Error submitting assignment:', err);
        res.json({ err: 'Failed to submit assignment!' });
    }
}


// Fetch assignments for a specific unit
const fetchUnitAssignments = async (req, res) => {
    const { unitId } = req.params;

    try {
        const assignments = await Assignment.aggregate([
            {
                $lookup: {
                    from: 'offeredunits',
                    localField: 'unit',
                    foreignField: "_id",
                    as: 'offeredUnit'
                }
            },
            { $unwind: "$offeredUnit" },
            { $match: { 'offeredUnit._id': new mongoose.Types.ObjectId(unitId) } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    instructions: 1,
                    deadline: 1,
                    file: 1,
                    createdAt: 1,
                    updatedAt: 1,
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "submissions",
                    let: { assignmentId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$assignment", "$$assignmentId"] } } },
                        { $count: "count" }
                    ],
                    as: "submissionCount"
                }
            },
            {
                $addFields: {
                    submissionsCount: { $ifNull: [{ $arrayElemAt: ["$submissionCount.count", 0] }, 0] }
                }
            }
        ]);

        const { studentId } = req.body;
        // Check submission status if studentId is provided
        if (studentId) {
            for (let i = 0; i < assignments.length; i++) {
                const submission = await Submission.findOne({
                    student: studentId,
                    assignment: assignments[i]._id
                });
                if (submission) {
                    assignments[i].submitted = submission.status === 'Submitted' || submission.status === 'Graded';
                    assignments[i].isDraft = submission.status === 'Draft';
                    assignments[i].submittedContent = submission.content;
                } else {
                    assignments[i].submitted = false;
                    assignments[i].isDraft = false;
                }
            }
        }

        res.json(assignments);
    } catch (err) {
        console.error('Error fetching lecturer assignments:', err);
        res.json({ err: 'Failed to fetch assignments!' });
    }
}

// Fetch submissions for a specific assignment
const fetchAssignmentSubmissions = async (req, res) => {
    const { assignmentId } = req.body;
    try {
        const submissions = await Submission.find({ assignment: assignmentId })
            .populate('student', 'fname lname email title gender birthday phone address')
            .sort({ createdAt: -1 });
        res.json(submissions);
    } catch (err) {
        console.error('Error fetching assignment submissions:', err);
        res.json({ err: 'Failed to fetch submissions!' });
    }
}

// Save mark for a specific submission and update overall grade
const saveSubmissionMark = async (req, res) => {
    const { submissionId, score } = req.body;

    if (score < 0 || score > 20) {
        return res.status(400).json({ err: 'Score must be between 0 and 20.' });
    }

    try {
        const submission = await Submission.findById(submissionId).populate({
            path: 'assignment',
            select: 'unit'
        });

        if (!submission) {
            return res.status(404).json({ err: 'Submission not found.' });
        }

        submission.score = score;
        submission.status = 'Graded';
        await submission.save();

        const studentId = submission.student;
        const unitId = submission.assignment.unit;

        const assignments = await Assignment.find({ unit: unitId });
        const assignmentIds = assignments.map(a => a._id);

        const allSubmissions = await Submission.find({
            student: studentId,
            assignment: { $in: assignmentIds },
            status: 'Graded'
        });

        const totalAssignmentScore = allSubmissions.reduce((sum, sub) => {
            return sum + (sub.score || 0);
        }, 0);

        const cappedScore = Math.min(totalAssignmentScore, 100);

        // Update or Create Grade record
        let gradeEntry = await Grade.findOne({ student: studentId, offeredUnit: unitId });

        const weights = { 'Assignment': 20, 'CAT': 30, 'Exam': 50 };

        if (gradeEntry) {
            let assignmentScoreObj = gradeEntry.scores.find(s => s.type === 'Assignment');
            if (assignmentScoreObj) {
                assignmentScoreObj.score = cappedScore;
            } else {
                gradeEntry.scores.push({
                    type: 'Assignment',
                    score: cappedScore,
                    weight: weights['Assignment']
                });
            }
            gradeEntry.status = 'Draft';
            await gradeEntry.save();
        } else {
            gradeEntry = await Grade.create({
                student: studentId,
                offeredUnit: unitId,
                scores: [
                    { type: 'Assignment', score: cappedScore, weight: weights['Assignment'] },
                    { type: 'CAT', score: 0, weight: weights['CAT'] },
                    { type: 'Exam', score: 0, weight: weights['Exam'] }
                ],
                status: 'Draft'
            });
        }

        res.json({ success: 'Mark saved and grade updated.', data: submission });
    } catch (error) {
        console.error('Error saving submission mark:', error);
        res.status(500).json({ err: 'Failed to save mark.' });
    }
}

// fetch lecturer units for dashboard
const fetchLecturerUnits = async (req, res) => {
    const { lecturerId, periodId } = req.params;
    try {
        if (!lecturerId || !periodId) {
            return res.json({ err: 'Lecturer ID and period ID are required!' });
        }

        const offeredUnits = await OfferedUnit.aggregate([
            { $match: { lecturer: new mongoose.Types.ObjectId(lecturerId), period: new mongoose.Types.ObjectId(periodId) } },
            {
                $lookup: {
                    from: "units",
                    localField: "unit",
                    foreignField: "_id",
                    as: "unitDetails"
                }
            },
            { $unwind: "$unitDetails" },
            {
                $lookup: {
                    from: "periods",
                    localField: "period",
                    foreignField: "_id",
                    as: "periodDetails"
                }
            },
            { $unwind: "$periodDetails" },
            {
                $lookup: {
                    from: "courses",
                    localField: "unitDetails.course",
                    foreignField: "_id",
                    as: "courseDetails"
                }
            },
            { $unwind: "$courseDetails" },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: 1,
                    students: 1,
                    code: "$unitDetails.code",
                    name: "$unitDetails.name",
                    period: "$periodDetails._id",
                    courseCode: "$courseDetails.code",
                    courseName: "$courseDetails.name",
                    courseType: "$courseDetails.type",
                    progress: { $literal: 65 }
                }
            }
        ]);
        res.json(offeredUnits);

    } catch (err) {
        console.error('Error fetching lecturer units:', err);
        res.json({ err: 'Failed to fetch lecturer units!' });
    }
}

//fetch unit students
const fetchUnitStudents = async (req, res) => {
    const { unitId } = req.params;
    try {
        if (!unitId) {
            return res.json({ err: 'Unit ID is required!' });
        }
        const students = await UnitReg.aggregate([
            { $match: { unit: new mongoose.Types.ObjectId(unitId) } },
            {
                $lookup: {
                    from: "semesters",
                    localField: "semester",
                    foreignField: "_id",
                    as: "semesterDetails"
                }
            },
            { $unwind: "$semesterDetails" },
            {
                $lookup: {
                    from: "students",
                    localField: "semesterDetails.student",
                    foreignField: "_id",
                    as: "studentDetails"
                }
            },
            { $unwind: "$studentDetails" },
            {
                $lookup: {
                    from: "courses",
                    localField: "studentDetails.course",
                    foreignField: "_id",
                    as: "courseDetails"
                }
            },
            { $unwind: "$courseDetails" },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: "$studentDetails._id",
                    adm: "$studentDetails.adm",
                    name: { $concat: ["$studentDetails.fname", " ", "$studentDetails.mname", " ", "$studentDetails.lname"] },
                    fname: "$studentDetails.fname",
                    mname: "$studentDetails.mname",
                    lname: "$studentDetails.lname",
                    gender: "$studentDetails.gender",
                    courseCode: "$courseDetails.code",
                    session: "$semesterDetails.session"
                }
            }
        ]);
        res.json(students);
    } catch (err) {
        console.error('Error fetching unit students:', err);
        res.json({ err: 'Failed to fetch unit students!' });
    }
}


// Save or update a unit grade for a student (CAT, Exam, Assignment)
const saveUnitGrade = async (req, res) => {
    const { studentId, offeredUnit, scores } = req.body;

    try {
        let gradeEntry = await Grade.findOne({ student: studentId, offeredUnit });

        if (gradeEntry) {
            // Update existing scores
            scores.forEach(newScore => {
                let existing = gradeEntry.scores.find(s => s.type === newScore.type);
                if (existing) {
                    existing.score = newScore.score;
                } else {
                    gradeEntry.scores.push(newScore);
                }
            });
            gradeEntry.status = 'Draft';
            await gradeEntry.save();
        } else {
            // Create new grade entry
            gradeEntry = await Grade.create({
                student: studentId,
                offeredUnit,
                scores,
                status: 'Draft'
            });
        }

        res.json({ success: 'Grade saved successfully.', data: gradeEntry });
    } catch (error) {
        console.error('Error saving unit grade:', error);
        res.status(500).json({ err: 'Failed to save grade.' });
    }
}

// Fetch all grades for a specific offered unit
const fetchUnitGrades = async (req, res) => {
    const { unitId } = req.params;
    try {
        const grades = await Grade.find({ offeredUnit: unitId });
        res.json(grades);
    } catch (error) {
        console.error('Error fetching unit grades:', error);
        res.status(500).json({ err: 'Failed to fetch grades.' });
    }
}

// Publish results for a unit
const publishUnitResults = async (req, res) => {
    const { unitId } = req.body;
    try {
        await Grade.updateMany({ offeredUnit: unitId }, { status: 'Published' });
        res.json({ success: 'Results published successfully.' });
    } catch (error) {
        console.error('Error publishing results:', error);
        res.status(500).json({ err: 'Failed to publish results.' });
    }
}

// Fetch class analytics
const fetchClassAnalytics = async (req, res) => {
    const { unitId } = req.params;
    try {
        const grades = await Grade.find({ offeredUnit: unitId });
        const totalStudents = grades.length;
        if (totalStudents === 0) {
            return res.json({ passRate: 0, average: 0, distribution: { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 } });
        }

        const totalScore = grades.reduce((sum, g) => sum + (g.finalScore || 0), 0);
        const average = Math.round(totalScore / totalStudents);
        const passed = grades.filter(g => (g.finalScore || 0) >= 40).length;
        const passRate = Math.round((passed / totalStudents) * 100);

        const distribution = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
        grades.forEach(g => {
            if (distribution[g.grade] !== undefined) distribution[g.grade]++;
        });

        res.json({ passRate, average, distribution, totalStudents });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ err: 'Failed to fetch analytics.' });
    }
}

module.exports = {
    addUnit,
    fetchUnits,
    deleteUnit,
    updateUnit,
    applyUnits,
    fetchOfferedUnits,
    removeOfferedUnit,
    regUnits,
    fetchRegUnits,
    removeRegUnit,
    uploadNotes,
    uploadAssignment,
    deleteAssignment,
    fetchStudentAssignments,
    fetchUnitMaterials,
    submitAssignment,
    fetchUnitAssignments,
    fetchAssignmentSubmissions,
    fetchLecturerUnits,
    updateAssignment,
    fetchUnitStudents,
    saveSubmissionMark,
    saveUnitGrade,
    fetchUnitGrades,
    publishUnitResults,
    fetchClassAnalytics
}
