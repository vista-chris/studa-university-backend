const express = require('express');
const attendanceController = require('../controllers/attendance-controller');
const { requireAuth, studentRequireAuth } = require('../middleware/auth-middleware');

const router = express.Router();

// Generate QR Code (Lecturer)
router.get('/qrcode/:unitId', requireAuth, attendanceController.attendanceQRCode);

// Scan QR Code (Student)
router.post('/qrscanner', studentRequireAuth, attendanceController.attendanceQRScanner);

// Fetch Unit Attendance (Lecturer)
router.get('/unit/:unitId', requireAuth, attendanceController.unitAttendance);

// Attendance Records & Details (Lecturer)
router.get('/records', requireAuth, attendanceController.allAttendanceRecords);
router.get('/details', requireAuth, attendanceController.allAttendanceDetails);

// Availability (Lecturer)
router.get('/availability/fetch/:lecturerId', requireAuth, attendanceController.fetchAvailability);
router.post('/availability/toggle', requireAuth, attendanceController.toggleAvailability);

module.exports = router;
