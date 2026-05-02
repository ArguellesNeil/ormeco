// backend/routes/dashboard.routes.js
const express = require("express");
const router = express.Router();

const controller = require("../controllers/dashboard.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { adminOnly } = require("../middleware/admin.middleware");

router.get("/stats", authMiddleware, adminOnly, controller.getStats);

module.exports = router;