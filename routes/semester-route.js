const express = require('express');
const semesterController = require('../controllers/semester-controller');
const { studentRequireAuth } = require('../middleware/auth-middleware');

const router = express.Router();

// Register Semester
router.post('/reg', studentRequireAuth, semesterController.regSemester);

// Fetch Registered Semesters
router.get('/fetch/:student', studentRequireAuth, semesterController.fetchRegSemester);

module.exports = router;
