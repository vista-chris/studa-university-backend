const express = require('express');
const courseController = require('../controllers/course-controller')
const { requireAuth } = require('../middleware/auth-middleware');

const router = express.Router();

//add course
router.post('/add', requireAuth, courseController.addCourse)

//fetch courses
router.get('/fetch/all', requireAuth, courseController.fetchCourses)

//remove course
router.post('/delete', requireAuth, courseController.deleteCourse)

//update course
router.post('/update/:id', requireAuth, courseController.updateCourse)

module.exports = router
