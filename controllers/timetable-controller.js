const Timetable = require('../models/timetable-model');
const { OfferedUnit } = require('../models/unit-model');
const Hall = require('../models/hall-model');
const LecturerAvailability = require('../models/lecturer-availability-model');
const mongoose = require('mongoose');

// Generate Timetable
const generateTimetable = async (req, res) => {
    const { periodId } = req.params;
    if (!periodId) return res.status(400).json({ err: 'Period ID is required' });

    try {
        // 1. Clear existing for this period to allow re-generation
        await Timetable.deleteMany({ period: periodId });

        // 2. Pre-fetch everything to avoid queries inside loops
        const [offeredUnits, halls, allAvailability] = await Promise.all([
            OfferedUnit.find({ period: periodId }).populate('unit'),
            Hall.find(),
            LecturerAvailability.find({ period: periodId })
        ]);

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const slots = [
            { start: '08:00 AM', end: '11:00 AM' },
            { start: '11:00 AM', end: '02:00 PM' },
            { start: '02:00 PM', end: '05:00 PM' }
        ];

        const finalSchedule = [];
        
        // Tracking sets to prevent conflicts in memory
        const busyLecturers = new Set(); // Format: "lecturerId-day-slot"
        const busyHalls = new Set();     // Format: "hallId-day-slot"

        for (const ou of offeredUnits) {
            let scheduled = false;

            for (const day of days.sort(() => Math.random() - 0.5)) {
                if (scheduled) break;
                for (const slot of slots.sort(() => Math.random() - 0.5)) {
                    const timeKey = `${day}-${slot.start}`;
                    const lectKey = `${ou.lecturer}-${timeKey}`;

                    // Check if lecturer is available (from pre-fetched list)
                    const isAvailable = allAvailability.find(a => 
                        a.lecturer.toString() === ou.lecturer.toString() && 
                        a.day === day && a.start === slot.start && a.end === slot.end
                    );

                    if (!isAvailable || busyLecturers.has(lectKey)) continue;

                    // Find first free hall
                    for (const hall of halls) {
                        const hallKey = `${hall._id}-${timeKey}`;

                        if (!busyHalls.has(hallKey)) {
                            // Record the assignment
                            const entry = {
                                unit: ou._id,
                                hall: hall._id,
                                day,
                                start: slot.start,
                                end: slot.end,
                                period: periodId
                            };
console.log(entry);
                            finalSchedule.push(entry);
                            busyLecturers.add(lectKey);
                            busyHalls.add(hallKey);
                            scheduled = true;
                            break;
                        }
                    }
                    if (scheduled) break;
                }
            }
        }

        // 3. Batch Insert (Much faster!)
        if (finalSchedule.length > 0) {
            await Timetable.insertMany(finalSchedule);
        }

        res.status(201).json({ 
            success: 'Timetable generated', 
            count: finalSchedule.length,
            unscheduled: offeredUnits.length - finalSchedule.length 
        });

    } catch (error) {
        console.error('Generation Error:', error);
        res.status(500).json({ err: 'Failed to generate' });
    }
};

// Fetch Timetable
const fetchTimetable = async (req, res) => {
    const { periodId } = req.params;

    // 1. Basic Validation
    if (!mongoose.Types.ObjectId.isValid(periodId)) {
        return res.status(400).json({ err: 'Invalid Period ID format' });
    }

    try {
        const timetable = await Timetable.aggregate([
            { 
                $match: { 
                    "period": new mongoose.Types.ObjectId(periodId) 
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
                    as: "unitDetails"
                }
            },
            { $unwind: { path: "$unitDetails", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "halls",
                    localField: "hall",
                    foreignField: "_id",
                    as: "hallDetails"
                }
            },
            { $unwind: { path: "$hallDetails", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "users",
                    localField: "offeredunit.lecturer",
                    foreignField: "_id",
                    as: "lecturer"
                }
            },
            { $unwind: { path: "$lecturer", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "courses",
                    localField: "unitDetails.course",
                    foreignField: "_id",
                    as: "courseDetails"
                }
            },
            { $unwind: { path: "$courseDetails", preserveNullAndEmptyArrays: true } },

            { $sort: { day: 1, start: 1 } },

            {
                $project: {
                    _id: 1,
                    day: 1,
                    start: 1,
                    end: 1,
                    unit: {
                        _id: "$offeredunit._id",
                        code: "$unitDetails.code",
                        name: "$unitDetails.name"
                    },
                    hall: { $ifNull: ["$hallDetails.name", "Unassigned"] },
                    lecturer: {
                        _id: "$lecturer._id",
                        name: { $concat: ["$lecturer.fname", " ", "$lecturer.lname"] }
                    },
                    courseCode: "$courseDetails.code"
                }
            }
        ]);

        res.status(200).json(timetable);
    } catch (error) {
        console.error('Fetch Error:', error);
        res.status(500).json({ err: 'Internal server error' });
    }
};

// Delete Timetable
const deleteTimetable = async (req, res) => {
    const { periodId } = req.params;
    try {
        await Timetable.deleteMany({ period: periodId });
        res.status(200).json({ success: 'Timetable deleted successfully' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ err: 'Failed to delete timetable' });
    }
};

module.exports = {
    generateTimetable,
    fetchTimetable,
    deleteTimetable
};
