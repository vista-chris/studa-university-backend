const Hostel = require('../models/hostel-model');
const Room = require('../models/room-model');
const Allocation = require('../models/accommodation-allocation-model');
const MaintenanceRequest = require('../models/maintenance-model');
const Visitor = require('../models/visitor-model');
const HostelEvent = require('../models/hostel-event-model');
const Student = require('../models/student-model');
const mongoose = require('mongoose');

// --- Hostel Management ---

const createHostel = async (req, res) => {
    try {
        const hostel = await Hostel.create(req.body);
        res.status(201).json(hostel);
    } catch (error) {
        res.status(400).json({ err: error.message });
    }
};

const getHostels = async (req, res) => {
    try {
        const hostels = await Hostel.find();
        res.json(hostels);
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch hostels' });
    }
};

const updateHostel = async (req, res) => {
    try {
        const hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!hostel) return res.status(404).json({ err: 'Hostel not found' });
        res.json(hostel);
    } catch (error) {
        res.status(400).json({ err: error.message });
    }
};

const deleteHostel = async (req, res) => {
    try {
        // Check if there are rooms in the hostel
        const rooms = await Room.find({ hostel: req.params.id });
        if (rooms.length > 0) {
            return res.status(400).json({ err: 'Cannot delete hostel with existing rooms' });
        }
        const hostel = await Hostel.findByIdAndDelete(req.params.id);
        if (!hostel) return res.status(404).json({ err: 'Hostel not found' });
        res.json({ message: 'Hostel deleted successfully' });
    } catch (error) {
        res.status(500).json({ err: 'Failed to delete hostel' });
    }
};

const bulkDeleteHostels = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ err: 'No hostel IDs provided' });
        }

        // Check if there are rooms in any of the selected hostels
        const rooms = await Room.find({ hostel: { $in: ids } });
        if (rooms.length > 0) {
            return res.status(400).json({ err: 'Cannot delete hostels with existing rooms' });
        }

        const result = await Hostel.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${result.deletedCount} hostels deleted successfully` });
    } catch (error) {
        res.status(500).json({ err: 'Failed to delete hostels' });
    }
};

// --- Room Management ---

const createRoom = async (req, res) => {
    try {
        const room = await Room.create(req.body);
        res.status(201).json(room);
    } catch (error) {
        res.status(400).json({ err: error.message });
    }
};

const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find().populate('hostel');
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch rooms' });
    }
};

const getRoomsByHostel = async (req, res) => {
    try {
        const rooms = await Room.find({ hostel: req.params.hostelId });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch rooms' });
    }
};

const updateRoom = async (req, res) => {
    try {
        const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!room) return res.status(404).json({ err: 'Room not found' });
        res.json(room);
    } catch (error) {
        res.status(400).json({ err: error.message });
    }
};

const deleteRoom = async (req, res) => {
    try {
        // Check for active allocations
        const allocations = await Allocation.find({ room: req.params.id, status: 'Active' });
        if (allocations.length > 0) {
            return res.status(400).json({ err: 'Cannot delete room with active allocations' });
        }
        const room = await Room.findByIdAndDelete(req.params.id);
        if (!room) return res.status(404).json({ err: 'Room not found' });
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        res.status(500).json({ err: 'Failed to delete room' });
    }
};

const bulkDeleteRooms = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ err: 'No room IDs provided' });
        }

        // Check for active allocations in any of the selected rooms
        const allocations = await Allocation.find({ room: { $in: ids }, status: 'Active' });
        if (allocations.length > 0) {
            return res.status(400).json({ err: 'Cannot delete rooms with active allocations' });
        }

        const result = await Room.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${result.deletedCount} rooms deleted successfully` });
    } catch (error) {
        res.status(500).json({ err: 'Failed to delete rooms' });
    }
};

// --- Allocation Logic ---

const allocateRoom = async (req, res) => {
    const { studentId, roomId, semesterId } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const room = await Room.findById(roomId).session(session);
        if (!room || room.occupancy >= room.capacity || room.status !== 'Available') {
            throw new Error('Room is unavailable or full');
        }

        // Check for existing active allocation for this semester
        const existing = await Allocation.findOne({ student: studentId, semester: semesterId, status: 'Active' }).session(session);
        if (existing) {
            throw new Error('Student already has an active allocation for this semester');
        }

        const allocation = await Allocation.create([{
            student: studentId,
            room: roomId,
            semester: semesterId
        }], { session });

        // Update room occupancy
        room.occupancy += 1;
        if (room.occupancy === room.capacity) {
            room.status = 'Full';
        }
        await room.save({ session });

        await session.commitTransaction();
        res.status(201).json(allocation[0]);
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ err: error.message });
    } finally {
        session.endSession();
    }
};

const getMyAllocation = async (req, res) => {
    try {
        const allocation = await Allocation.findOne({ student: req.user._id, status: 'Active' })
            .populate({
                path: 'room',
                populate: { path: 'hostel' }
            })
            .populate('semester');

        if (!allocation) return res.json(null);

        // Find roommates (other active allocations for the same room)
        const roommates = await Allocation.find({
            room: allocation.room._id,
            status: 'Active',
            student: { $ne: req.user._id }
        }).populate({ path: 'student', select: 'fname lname adm course' });

        res.json({
            allocation,
            roommates: roommates.map(r => r.student)
        });
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch your allocation' });
    }
};

const getAllAllocations = async (req, res) => {
    try {
        const allocations = await Allocation.find()
            .populate('student', 'fname lname adm')
            .populate({
                path: 'room',
                populate: { path: 'hostel' }
            })
            .populate('semester')
            .sort({ createdAt: -1 });
        res.json(allocations);
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch allocations' });
    }
};

// --- Roommate Matching (Simple Preference) ---

const getRoommateSuggestions = async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student) return res.status(404).json({ err: 'Student not found' });

        // Simple suggestion: same course and year
        const suggestions = await Student.find({
            course: student.course,
            adm: { $regex: student.adm.split('/')[0] }, // Rough year match based on admission format
            _id: { $ne: student._id }
        }).limit(5);

        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ err: 'Failed to get suggestions' });
    }
};

// --- Maintenance ---

const reportMaintenance = async (req, res) => {
    try {
        const request = await MaintenanceRequest.create(req.body);
        res.status(201).json(request);
    } catch (error) {
        res.status(400).json({ err: error.message });
    }
};

const getMaintenanceRequests = async (req, res) => {
    try {
        const requests = await MaintenanceRequest.find()
            .populate('room')
            .populate({ path: 'student', select: 'fname lname adm' })
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch requests' });
    }
};

// --- Visitor Logging ---

const logVisitor = async (req, res) => {
    try {
        const visitor = await Visitor.create(req.body);
        res.status(201).json(visitor);
    } catch (error) {
        res.status(400).json({ err: error.message });
    }
};

const getVisitors = async (req, res) => {
    try {
        const visitors = await Visitor.find()
            .populate('student', 'fname lname adm')
            .populate('hostel', 'name')
            .sort({ checkIn: -1 });
        res.json(visitors);
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch visitors' });
    }
};

// --- Events & Announcements ---

const postEvent = async (req, res) => {
    try {
        const event = await HostelEvent.create({
            ...req.body,
            postedBy: req.user._id
        });
        res.status(201).json(event);
    } catch (error) {
        res.status(400).json({ err: error.message });
    }
};

const getEvents = async (req, res) => {
    try {
        const events = await HostelEvent.find()
            .populate('hostel', 'name')
            .sort({ date: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ err: 'Failed to fetch events' });
    }
};

module.exports = {
    createHostel,
    getHostels,
    updateHostel,
    deleteHostel,
    createRoom,
    getAllRooms,
    getRoomsByHostel,
    updateRoom,
    deleteRoom,
    allocateRoom,
    getMyAllocation,
    getAllAllocations,
    getRoommateSuggestions,
    reportMaintenance,
    getMaintenanceRequests,
    logVisitor,
    getVisitors,
    postEvent,
    getEvents,
    bulkDeleteHostels,
    bulkDeleteRooms
};
