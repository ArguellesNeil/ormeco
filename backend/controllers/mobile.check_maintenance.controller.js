const { getMaintenanceSettings, isMaintenanceActive } = require("../middleware/maintenance.middleware");

async function checkMaintenanceStatus(req, res) {
    try {
        if (req.method !== "GET" && req.method !== "POST") {
            return res.status(405).json({ status: "fail", message: "Invalid method" });
        }

        const settings = await getMaintenanceSettings();
        const isActive = isMaintenanceActive(settings);

        if (isActive) {
            return res.status(503).json({
                status: "maintenance",
                active: true,
                message: settings.message || "The mobile app is under maintenance",
                startTime: settings.startTime,
                durationMinutes: settings.durationMinutes,
                estimatedEndTime: new Date(
                    new Date(settings.startTime).getTime() +
                    (settings.durationMinutes || 30) * 60 * 1000
                ).toISOString(),
            });
        }

        return res.json({
            status: "ok",
            active: false,
            message: "App is operational",
        });
    } catch (err) {
        console.error("checkMaintenanceStatus error:", err);
        return res.status(500).json({ status: "fail", message: "Server error" });
    }
}

module.exports = { checkMaintenanceStatus };
