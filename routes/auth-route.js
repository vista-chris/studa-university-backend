const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');

router.post('/login', authController.login);
router.post('/signin', authController.signin); // User login
router.post('/signup', authController.signup); // User signup
router.post('/logout', authController.logout);
router.post('/student/add', authController.addStudent);

module.exports = router;
