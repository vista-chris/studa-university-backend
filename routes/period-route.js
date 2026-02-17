const express = require('express');
const periodController = require('../controllers/period-controller')
const { requireAuth, requireAnyAuth } = require('../middleware/auth-middleware');

const router = express.Router();

//fetch periods
router.get('/fetch/all', requireAnyAuth, periodController.fetchPeriods)

//add period
router.post('/add', requireAuth, periodController.addPeriod)

module.exports = router
