const express = require('express');
const unitController = require('../controllers/unit-controller')
const { checkUser, requireAuth, studentRequireAuth, requireAnyAuth } = require('../middleware/auth-middleware');


const router = express.Router();


//add unit
router.post('/add', requireAuth, unitController.addUnit)

//fetch units
router.get('/fetch/all', requireAuth, unitController.fetchUnits)

//remove unit
router.post('/delete', requireAuth, unitController.deleteUnit)

//update unit
router.post('/update/:id', requireAuth, unitController.updateUnit)

//apply selected units
router.post('/apply', requireAuth, unitController.applyUnits)

//fetch offered units
router.get('/offered/fetch/:periodId', requireAnyAuth, unitController.fetchOfferedUnits)


//delete selected offered units
router.post('/offered/delete', requireAuth, unitController.removeOfferedUnit)

//register units (student)
router.post('/student/reg', studentRequireAuth, unitController.regUnits)

//fetch registered units (student)
router.post('/student/reg/fetch/:student', studentRequireAuth, unitController.fetchRegUnits)

//delete registered units (student)
router.post('/student/reg/delete', studentRequireAuth, unitController.removeRegUnit)

//upload notes
router.post('/notes/upload', requireAuth, unitController.uploadNotes)

//upload assignment
router.post('/assignments/upload', requireAuth, unitController.uploadAssignment)

//delete assignment
router.post('/lecturer/assignments/delete/:assignmentId', requireAuth, unitController.deleteAssignment)

//fetch student assignments
router.get('/student/assignments/fetch/:studentId/:unitId', studentRequireAuth, unitController.fetchStudentAssignments)

// fetch unit materials (notes and assignments)
router.get('/materials/fetch/:unitId', requireAnyAuth, unitController.fetchUnitMaterials)

// submit assignment
router.post('/student/assignments/submit', studentRequireAuth, unitController.submitAssignment)

// fetch assignments for a specific unit
router.post('/assignments/fetch/:unitId', requireAnyAuth, unitController.fetchUnitAssignments)

// fetch submissions for a specific assignment (lecturer/admin)
router.post('/lecturer/submissions/fetch', requireAuth, unitController.fetchAssignmentSubmissions)

// save submission mark (lecturer)
router.post('/lecturer/submissions/save-mark', requireAuth, unitController.saveSubmissionMark)

// update assignment (lecturer/admin)
router.post('/lecturer/assignments/update/:assignmentId', requireAuth, unitController.updateAssignment)

// fetch lecturer units
router.get('/lecturer/fetch/units/:lecturerId/:periodId', requireAuth, unitController.fetchLecturerUnits)

// fetch unit students
router.get('/lecturer/fetch/students/:unitId', requireAuth, unitController.fetchUnitStudents)

// save unit grade (lecturer)
router.post('/lecturer/grading/save', requireAuth, unitController.saveUnitGrade)

// fetch unit grades (lecturer)
router.get('/lecturer/grading/fetch/:unitId', requireAuth, unitController.fetchUnitGrades)

// publish unit results (lecturer)
router.post('/lecturer/grading/publish', requireAuth, unitController.publishUnitResults)

// fetch class analytics (lecturer)
router.get('/lecturer/analytics/class/:unitId', requireAuth, unitController.fetchClassAnalytics)

module.exports = router
