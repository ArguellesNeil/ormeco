const db = require("../config/db");

let cachedMaintenanceSettings = null;
let cacheExpiry = 0;

const CACHE_TTL_MS = 5000; // Cache for 5 seconds

async function getMaintenanceSettings() {
    const now = Date.now();

    // Return cached value if still valid
    if (cachedMaintenanceSettings && cacheExpiry > now) {
        return cachedMaintenanceSettings;
    }

    try {
        const [rows] = await db.query(
            "SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1",
            ["maintenance"]
        );

        const defaultSettings = {
            enabled: false,
            startTime: null,
            durationMinutes: 30,
            message: "The mobile app is currently under maintenance. Please try again later.",
        };

        if (!rows.length) {
            cachedMaintenanceSettings = defaultSettings;
            cacheExpiry = now + CACHE_TTL_MS;
            return defaultSettings;
        }

        const rawValue = rows[0].setting_value;
        let parsed = defaultSettings;

        if (rawValue) {
            try {
                if (typeof rawValue === "string") {
                    parsed = JSON.parse(rawValue);
                } else if (typeof rawValue === "object") {
                    parsed = rawValue;
                }
                parsed = { ...defaultSettings, ...parsed };
            } catch (_) {
                parsed = defaultSettings;
            }
        }

        cachedMaintenanceSettings = parsed;
        cacheExpiry = now + CACHE_TTL_MS;
        return parsed;
    } catch (err) {
        console.error("Error loading maintenance settings:", err);
        return {
            enabled: false,
            startTime: null,
            durationMinutes: 30,
            message: "The mobile app is currently under maintenance. Please try again later.",
        };
    }
}

function isMaintenanceActive(settings) {
    if (!settings || !settings.enabled) return false;
    if (!settings.startTime) return false;

    const startTime = new Date(settings.startTime);
    if (isNaN(startTime)) return false;

    const durationMs = (settings.durationMinutes || 30) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    const now = new Date();

    return now >= startTime && now < endTime;
}

async function maintenanceMiddleware(req, res, next) {
    try {
        const settings = await getMaintenanceSettings();

        if (isMaintenanceActive(settings)) {
            return res.status(503).json({
                status: "fail",
                message: settings.message || "The mobile app is under maintenance",
                maintenance: {
                    active: true,
                    startTime: settings.startTime,
                    durationMinutes: settings.durationMinutes,
                    estimatedEndTime: new Date(
                        new Date(settings.startTime).getTime() +
                        (settings.durationMinutes || 30) * 60 * 1000
                    ).toISOString(),
                },
            });
        }

        next();
    } catch (err) {
        console.error("Maintenance middleware error:", err);
        // Don't block requests if there's an error checking maintenance
        next();
    }
}

function clearMaintenanceCache() {
    cachedMaintenanceSettings = null;
    cacheExpiry = 0;
}

module.exports = {
    maintenanceMiddleware,
    getMaintenanceSettings,
    isMaintenanceActive,
    clearMaintenanceCache,
};
