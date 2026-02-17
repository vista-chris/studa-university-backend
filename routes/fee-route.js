const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fee-controller');

const { studentRequireAuth } = require('../middleware/auth-middleware');

router.get('/fetch/all', feeController.getStructures);
router.post('/add', feeController.addStructure);
router.post('/update/:id', feeController.updateStructure);
router.post('/delete', feeController.deleteStructure);

// Student Routes
router.get('/student/statements/:studentId', studentRequireAuth, feeController.getStudentStatements);
router.get('/student/payments/:studentId', studentRequireAuth, feeController.getPaymentHistory);
router.get('/student/structure/:studentId', studentRequireAuth, feeController.getStudentStructure);

module.exports = router;
