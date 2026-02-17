const express = require('express');
const router = express.Router();
const gradingController = require('../controllers/grading-controller');
const { studentRequireAuth } = require('../middleware/auth-middleware');

// Get comprehensive student results data for dashboard
router.get('/results-data/:studentId', studentRequireAuth, gradingController.getStudentResultsData);

module.exports = router;
