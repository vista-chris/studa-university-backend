const express = require('express');
const router = express.Router();
const { getInstitutionalAnalytics } = require('../controllers/academic-analytics-controller');
const { requireAuth } = require('../middleware/auth-middleware');

// @route   GET /api/academic-analytics
// @desc    Get comprehensive institutional analytics
// @access  Private (Admin)
router.get('/', requireAuth, getInstitutionalAnalytics);

module.exports = router;
