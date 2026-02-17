const express = require('express');
const hallController = require('../controllers/hall-controller')
const { requireAuth } = require('../middleware/auth-middleware');

const router = express.Router();

//add hall
router.post('/add', requireAuth, hallController.addHall)

//update hall
router.post('/update/:id', requireAuth, hallController.updateHall)

//delete hall
router.post('/delete', requireAuth, hallController.deleteHall)

//fetch halls
router.get('/fetch/all', requireAuth, hallController.fetchHall)

module.exports = router
