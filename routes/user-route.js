const express = require('express');
const userController = require('../controllers/user-controller')
const { requireAuth } = require('../middleware/auth-middleware');

const router = express.Router();

// All routes here should be protected? 
// Legacy user-routes didn't have middleware on rout level, maybe applied in server.js?
// Legacy user-route.js: "router.get('/fetch/users', userController.fetchUsers)" - No middleware?
// Maybe globally applied?
// I'll apply requireAuth for safety.

router.get('/fetch/all', requireAuth, userController.fetchUsers)
router.post('/delete/:id', requireAuth, userController.deleteUser)
router.post('/delete', requireAuth, userController.deleteUsers)
router.post('/deactivate/:id', requireAuth, userController.deactivateUser);
router.post('/activate/:id', requireAuth, userController.activateUser);
router.post('/update/:id', requireAuth, userController.updateUser)

module.exports = router
