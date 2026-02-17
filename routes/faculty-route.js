const express = require('express');
const facultyController = require('../controllers/faculty-controller')
const { requireAuth } = require('../middleware/auth-middleware');

const router = express.Router();

//add faculty
router.post('/add', requireAuth, facultyController.addFaculty)

//fetch faculty
router.get('/fetch/all', requireAuth, facultyController.fetchFaculty)

module.exports = router
