const express = require("express");
const router = express.Router();
const { checkMaintenanceStatus } = require("../controllers/mobile.check_maintenance.controller");

/**
 * GET /api/mobile/check-maintenance
 * Check if the app is currently under maintenance (public endpoint, no auth required)
 */
router.get("/check-maintenance", checkMaintenanceStatus);
router.post("/check-maintenance", checkMaintenanceStatus);

module.exports = router;
