const express = require('express');
const router = express.Router();
const {
    createHostel, getHostels, updateHostel, deleteHostel, bulkDeleteHostels,
    createRoom, getAllRooms, getRoomsByHostel, updateRoom, deleteRoom, bulkDeleteRooms,
    allocateRoom, getMyAllocation, getAllAllocations, getRoommateSuggestions, reportMaintenance,
    getMaintenanceRequests, logVisitor, getVisitors, postEvent, getEvents
} = require('../controllers/accommodation-controller');
const { requireAuth, requireAnyUser } = require('../middleware/auth-middleware');

// Public/Student routes
router.get('/hostels', requireAnyUser, getHostels);
router.get('/my-allocation', requireAnyUser, getMyAllocation);
router.get('/rooms', requireAnyUser, getAllRooms);
router.get('/rooms/:hostelId', requireAnyUser, getRoomsByHostel);
router.get('/suggestions/:studentId', requireAnyUser, getRoommateSuggestions);
router.post('/maintenance', requireAnyUser, reportMaintenance);
router.get('/events', requireAnyUser, getEvents);

// Admin/Staff routes
router.post('/hostels', requireAuth, createHostel);
router.post('/hostels/bulk-delete', requireAuth, bulkDeleteHostels);
router.put('/hostels/:id', requireAuth, updateHostel);
router.delete('/hostels/:id', requireAuth, deleteHostel);

router.post('/rooms', requireAuth, createRoom);
router.post('/rooms/bulk-delete', requireAuth, bulkDeleteRooms);
router.put('/rooms/:id', requireAuth, updateRoom);
router.delete('/rooms/:id', requireAuth, deleteRoom);

router.post('/allocate', requireAuth, allocateRoom);
router.get('/allocations', requireAuth, getAllAllocations);
router.get('/maintenance', requireAuth, getMaintenanceRequests);
router.post('/visitors', requireAuth, logVisitor);
router.get('/visitors', requireAuth, getVisitors);
router.post('/events', requireAuth, postEvent);

module.exports = router;
