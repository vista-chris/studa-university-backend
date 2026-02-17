const { AttendanceRecord, AttendanceDetail } = require('../models/attendance-model')
const { UnitReg, OfferedUnit } = require('../models/unit-model')
const LecturerAvailability = require('../models/lecturer-availability-model')
const QRCode = require('qrcode')
const mongoose = require('mongoose')

//generate code
const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

//attendance qrcode
const attendanceQRCode = async (req, res) => {
    const { unitId } = req.params; // OfferedUnit ID
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    try {
        let attendance = await AttendanceRecord.findOne({
            unit: unitId,
            createdAt: { $gte: start, $lte: end }
        });

        if (!attendance) {
            const code = generateCode();
            attendance = await AttendanceRecord.create({ unit: unitId, code });

            const offeredUnit = await OfferedUnit.findById(unitId);
            if (!offeredUnit) return res.status(404).json({ err: 'Offered Unit not found' });

            const registeredStudents = await UnitReg.aggregate([
                { $match: { unit: offeredUnit.unit } },
                {
                    $lookup: {
                        from: 'semesters',
                        localField: 'semester',
                        foreignField: '_id',
                        as: 'semesterInfo'
                    }
                },
                { $unwind: '$semesterInfo' },
                {
                    $project: {
                        _id: 0,
                        student: '$semesterInfo.student'
                    }
                }
            ]);

            if (registeredStudents.length > 0) {
                const detailRecords = registeredStudents.map(reg => ({
                    attendance: attendance._id,
                    student: reg.student,
                    status: false
                }));

                await AttendanceDetail.insertMany(detailRecords);
            }
        }

        const url = await QRCode.toDataURL(attendance.code);
        res.send(url);

    } catch (error) {
        console.error('Error in attendanceQRCode:', error);
        res.status(500).json({ err: 'Internal server error' });
    }
};

//atendance qrscanner
const attendanceQRScanner = async (req, res) => {
    const { student, code, unit } = req.body // unit is OfferedUnit ID
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    try {
        const attendanceRecord = await AttendanceRecord.findOne({
            unit,
            code,
            createdAt: { $gte: start, $lte: end }
        })

        if (attendanceRecord) {
            const attendanceId = attendanceRecord._id

            let detail = await AttendanceDetail.findOne({ attendance: attendanceId, student })
            if (detail) {
                await AttendanceDetail.findByIdAndUpdate(detail._id, { status: true })
            } else {
                await AttendanceDetail.create({ attendance: attendanceId, student, status: true })
            }
            res.json({ success: 'Attendance verification passed. You were marked as present' })
        } else {
            res.json({ err: 'Invalid/Expired QR Code!' })
        }
    } catch (error) {
        console.error('Error in attendanceQRScanner:', error)
        res.status(500).json({ err: 'Internal server error' })
    }
}

//fetch unit attendance details
const unitAttendance = async (req, res) => {
    const { unitId } = req.params // OfferedUnit ID
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    try {
        const attendanceRecord = await AttendanceRecord.findOne({
            unit: unitId,
            createdAt: { $gte: start, $lte: end }
        })

        if (!attendanceRecord) {
            return res.json([]);
        }

        const attendance = await AttendanceDetail.aggregate([
            { $match: { attendance: attendanceRecord._id } },
            {
                $lookup: {
                    from: 'students',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'students'
                }
            },
            { $unwind: '$students' },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    student: {
                        _id: '$students._id',
                        adm: '$students.adm',
                        fname: '$students.fname',
                        mname: '$students.mname',
                        lname: '$students.lname',
                        email: '$students.email'
                    }
                }
            }
        ])
        res.json(attendance)
    } catch (error) {
        console.error('Error in unitAttendance:', error)
        res.status(500).json({ err: 'Internal server error' })
    }
}

// All Attendance Sessions (Records)
const allAttendanceRecords = async (req, res) => {
    try {
        const records = await AttendanceRecord.find()
            .populate({
                path: 'unit',
                populate: { path: 'unit' }
            })
            .sort({ createdAt: -1 });
        res.json(records);
    } catch (error) {
        console.error('Error in allAttendanceRecords:', error);
        res.status(500).json({ err: 'Internal server error' });
    }
};

// All Attendance Details (History)
const allAttendanceDetails = async (req, res) => {
    try {
        const details = await AttendanceDetail.aggregate([
            {
                $lookup: {
                    from: 'attendancerecords',
                    localField: 'attendance',
                    foreignField: '_id',
                    as: 'record'
                }
            },
            { $unwind: '$record' },
            {
                $lookup: {
                    from: 'offeredunits',
                    localField: 'record.unit',
                    foreignField: '_id',
                    as: 'offeredUnit'
                }
            },
            { $unwind: '$offeredUnit' },
            {
                $lookup: {
                    from: 'students',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentInfo'
                }
            },
            { $unwind: '$studentInfo' },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    attendancedetails: { status: '$status' },
                    attendancerecords: { createdAt: '$record.createdAt' },
                    offeredunits: { _id: '$offeredUnit._id' },
                    students: {
                        _id: '$studentInfo._id',
                        fname: '$studentInfo.fname',
                        lname: '$studentInfo.lname',
                        regNo: '$studentInfo.adm',
                        email: '$studentInfo.email'
                    }
                }
            }
        ]);
        res.json(details);
    } catch (error) {
        console.error('Error in allAttendanceDetails:', error);
        res.status(500).json({ err: 'Internal server error' });
    }
};

// Availability: Fetch
const fetchAvailability = async (req, res) => {
    const { lecturerId } = req.params;
    try {
        const availability = await LecturerAvailability.find({ lecturer: lecturerId });
        res.json(availability);
    } catch (error) {
        console.error('Error in fetchAvailability:', error);
        res.status(500).json({ err: 'Internal server error' });
    }
};

// Availability: Toggle
const toggleAvailability = async (req, res) => {
    const { lecturer, day, start, end, period } = req.body;
    try {
        const existing = await LecturerAvailability.findOne({ lecturer, day, start, end, period });
        if (existing) {
            await LecturerAvailability.findByIdAndDelete(existing._id);
            res.json({ success: 'Slot removed' });
        } else {
            await LecturerAvailability.create({ lecturer, day, start, end, period, available: true });
            res.json({ success: 'Slot added' });
        }
    } catch (error) {
        console.error('Error in toggleAvailability:', error);
        res.status(500).json({ err: 'Internal server error' });
    }
};

module.exports = {
    attendanceQRCode,
    attendanceQRScanner,
    unitAttendance,
    allAttendanceRecords,
    allAttendanceDetails,
    fetchAvailability,
    toggleAvailability
};
