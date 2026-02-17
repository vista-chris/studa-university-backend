const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student-controller');
const { requireAuth, studentRequireAuth } = require('../middleware/auth-middleware');

// Admin/Staff Routes
router.get('/fetch/all', requireAuth, studentController.getAllStudents);
router.post('/update/:id', requireAuth, studentController.updateStudent);
router.post('/delete', requireAuth, studentController.deleteStudents);

// Student Routes
router.get('/profile', studentRequireAuth, studentController.getStudentProfile);
router.get('/dashboard-data/:studentId', studentRequireAuth, studentController.getStudentDashboardData);
router.get('/available-sessions/:studentId', studentRequireAuth, studentController.getAvailableSessions);

module.exports = router;
