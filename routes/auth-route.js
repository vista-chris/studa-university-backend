const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');

router.post('/login', authController.login);
router.post('/signin', authController.signin); // User login
router.post('/signup', authController.signup); // User signup
router.post('/logout', authController.logout);
router.post('/student/add', authController.addStudent);

// Password Reset Routes
router.get('/reset/user/:id/:token', authController.resetUser);
router.get('/reset/student/:id/:token', authController.resetStudent);
router.post('/reset-password/user/:id/:token', authController.resetUserPassword);
router.post('/reset-password/student/:id/:token', authController.resetStudentPassword);

module.exports = router;
