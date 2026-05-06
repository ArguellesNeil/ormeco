const router = require("express").Router();
const controller = require("../controllers/mobile.get_announcements.controller");

router.get("/announcements", controller.getAnnouncements);

module.exports = router;