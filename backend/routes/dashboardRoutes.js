// routes/dashboardRoutes.js - Dashboard Routes
const express = require('express');
const router = express.Router();
const { getDashboardStats, getGrowthRate } = require('../controllers/dashboardController');
const { auth, authorize, scopeSector } = require('../middleware/auth');

router.use(auth);
router.use(scopeSector);
router.use(authorize('admin', 'sector_officer', 'expert'));

router.get('/stats', getDashboardStats);
router.get('/growth', getGrowthRate);
router.get('/organization', require('../controllers/organizationController').getOrganization);

module.exports = router;
