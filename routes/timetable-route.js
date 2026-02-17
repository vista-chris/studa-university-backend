const express = require('express');
const timetableController = require('../controllers/timetable-controller');
const { requireAuth } = require('../middleware/auth-middleware');

const router = express.Router();

router.post('/generate/:periodId', requireAuth, timetableController.generateTimetable);
router.get('/fetch/:periodId', requireAuth, timetableController.fetchTimetable);
router.delete('/delete/:periodId', requireAuth, timetableController.deleteTimetable);

module.exports = router;
