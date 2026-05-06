const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.middleware");
const { adminOnly } = require("../middleware/admin.middleware");
const controller = require("../controllers/settings.controller");

router.get("/system", authMiddleware, adminOnly, controller.getSystemSettings);
router.get("/audit-logs", authMiddleware, adminOnly, controller.getAuditLogs);
router.put("/system", authMiddleware, adminOnly, controller.updateSystemSettings);

// Maintenance management
router.get("/maintenance/status", authMiddleware, adminOnly, controller.getMaintenanceStatus);
router.post("/maintenance/start", authMiddleware, adminOnly, controller.updateMaintenanceStatus);
router.post("/maintenance/stop", authMiddleware, adminOnly, controller.disableMaintenance);

module.exports = router;