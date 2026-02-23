const mongoose = require('mongoose');
const Semester = require('../models/semester-model');
const { Structure, Academic, Accommodation } = require('../models/fee-model');
const Room = require('../models/room-model');
const Allocation = require('../models/accommodation-allocation-model');
const Student = require('../models/student-model');
const Hostel = require('../models/hostel-model');

// Register Semester
const regSemester = async (req, res) => {
    const { session, period, hostel, student, course } = req.body;

    try {
        // Check if already registered for this period or session
        const existingSemester = await Semester.find({
            $and: [
                { student: new mongoose.Types.ObjectId(student) },
                {
                    $or: [
                        { session },
                        { period: new mongoose.Types.ObjectId(period) }
                    ]
                }
            ]
        });

        if (existingSemester.length > 0) {
            return res.status(400).json({ err: 'Semester registration already exists for this period or session.' });
        }

        const structure = await Structure.findOne({ course, session });
        if (!structure) {
            return res.status(404).json({ err: 'No fee structure found for this course and session!' });
        }

        // Randomly assign a room if hostel is requested
        let assignedRoom = null;
        if (hostel) {
            // Fetch student to check gender
            const studentDetails = await Student.findById(student);
            if (!studentDetails) {
                return res.status(404).json({ err: 'Student not found!' });
            }

            const studentGender = studentDetails.gender; // Usually 'Male' or 'Female'

            // Find hostels that match student gender
            const matchingHostels = await Hostel.find({
                gender: { $in: [studentGender, 'Mixed'] }
            });

            if (matchingHostels.length === 0) {
                return res.status(400).json({ err: `No hostels available for ${studentGender} students!` });
            }

            const hostelIds = matchingHostels.map(h => h._id);

            // Find available rooms in these hostels
            const availableRooms = await Room.find({
                hostel: { $in: hostelIds },
                status: 'Available'
            });

            if (availableRooms.length === 0) {
                return res.status(400).json({ err: 'No available hostel rooms for your gender at the moment!' });
            }

            // Pick a random room
            assignedRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
        }

        const newSemester = await Semester.create({
            session,
            period,
            hostel: Boolean(hostel),
            student,
            structure: structure._id,
        });

        // Initialize Academic values
        let payable = structure.academics;
        let paid = 0;
        let balance = payable;
        let excess = 0;

        // Ported logic for excess fee from previous semesters
        const academicStatements = await Academic.aggregate([
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
                $match: {
                    'sem.student': new mongoose.Types.ObjectId(student),
                    excess: { $gt: 0 }
                }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
        ]);

        if (academicStatements.length > 0) {
            const excessFee = academicStatements[0].excess;
            if (excessFee >= payable) {
                paid = payable;
                balance = 0;
                excess = excessFee - payable;
            } else {
                paid = excessFee;
                balance = payable - paid;
                excess = 0;
            }
        }

        await Academic.create({
            semester: newSemester._id,
            payable,
            paid,
            balance,
            excess
        });

        if (hostel && assignedRoom) {
            // Create Allocation
            await Allocation.create({
                student,
                room: assignedRoom._id,
                semester: newSemester._id,
                status: 'Active'
            });

            // Update Room Occupancy
            assignedRoom.occupancy += 1;
            if (assignedRoom.occupancy >= assignedRoom.capacity) {
                assignedRoom.status = 'Full';
            }
            await assignedRoom.save();

            // Link room price to accommodation payable
            let hPayable = assignedRoom.price;
            let hPaid = 0;
            let hBalance = hPayable;
            let hExcess = 0;

            const accommodationStatements = await Accommodation.aggregate([
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
                    $match: {
                        'sem.student': new mongoose.Types.ObjectId(student),
                        excess: { $gt: 0 }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 1 }
            ]);

            if (accommodationStatements.length > 0) {
                const hExcessFee = accommodationStatements[0].excess;
                if (hExcessFee >= hPayable) {
                    hPaid = hPayable;
                    hBalance = 0;
                    hExcess = hExcessFee - hPayable;
                } else {
                    hPaid = hExcessFee;
                    hBalance = hPayable - hPaid;
                    hExcess = 0;
                }
            }

            await Accommodation.create({
                semester: newSemester._id,
                payable: hPayable,
                paid: hPaid,
                balance: hBalance,
                excess: hExcess
            });
        }

        res.status(201).json({ success: 'Semester registration completed successfully.' });

    } catch (error) {
        console.error('Reg Semester Error:', error);
        res.status(500).json({ err: 'Failed to register semester!' });
    }
};

// Fetch Registered Semesters
const fetchRegSemester = async (req, res) => {
    const { student } = req.params;
    try {
        const semesters = await Semester.find({ student: new mongoose.Types.ObjectId(student) })
            .populate('period')
            .sort({ createdAt: -1 });
        res.status(200).json(semesters);
    } catch (error) {
        console.error('Fetch Semesters Error:', error);
        res.status(500).json({ err: 'Failed to fetch registered semesters' });
    }
};

module.exports = { regSemester, fetchRegSemester };
