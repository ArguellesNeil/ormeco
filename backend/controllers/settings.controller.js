const db = require("../config/db");
const { listAuditLogs, logAuditEvent } = require("../services/audit-log.service");

const DEFAULT_SETTINGS = {
    emailTemplates: {
        benefitApproval: "Hello {{name}}, your benefit application for {{benefit_name}} is now {{status}}.",
        incidentAcknowledgement: "Hello {{name}}, your incident report #{{incident_id}} has been received and is under review.",
        seminarReminder: "Reminder: Your seminar schedule is set for {{seminar_date}}. Please arrive 15 minutes early.",
    },
    notificationPreferences: {
        emailEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        adminContactNumber: "",
    },
    thresholds: {
        incidentsPerDayAlert: 5,
        benefitsPerDayAlert: 10,
        highBillAmount: 5000,
        seminarWindowDays: 7,
    },
    appearance: {
        darkModeEnabled: false,
    },
    securityPolicies: {
        minPasswordLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSpecialChar: false,
        sessionTimeoutMinutes: 30,
        enforceAdmin2FA: false,
    },
    reportScheduling: {
        enabled: false,
        frequency: "weekly",
        sendTime: "08:00",
        weekday: 0,
        dayOfMonth: 1,
        recipients: "",
    },
    maintenance: {
        enabled: false,
        startTime: null,
        durationMinutes: 30,
        message: "The mobile app is currently under maintenance. Please try again later.",
    },
};

async function ensureSettingsTable() {
    await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(80) PRIMARY KEY,
      setting_value JSON NOT NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

function parseRowValue(raw, fallback) {
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw === "object") return raw;

    try {
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

async function loadSettings() {
    await ensureSettingsTable();

    const [rows] = await db.query(
        `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?, ?, ?, ?, ?, ?)`, ["emailTemplates", "notificationPreferences", "thresholds", "appearance", "securityPolicies", "reportScheduling", "maintenance"]
    );

    const merged = {
        emailTemplates: {...DEFAULT_SETTINGS.emailTemplates },
        notificationPreferences: {...DEFAULT_SETTINGS.notificationPreferences },
        thresholds: {...DEFAULT_SETTINGS.thresholds },
        appearance: {...DEFAULT_SETTINGS.appearance },
        securityPolicies: {...DEFAULT_SETTINGS.securityPolicies },
        reportScheduling: {...DEFAULT_SETTINGS.reportScheduling },
        maintenance: {...DEFAULT_SETTINGS.maintenance },
    };

    for (const row of rows) {
        if (!merged[row.setting_key]) continue;
        const parsed = parseRowValue(row.setting_value, {});
        merged[row.setting_key] = {...merged[row.setting_key], ...parsed };
    }

    return merged;
}

function sanitizePayload(payload = {}) {
    const safe = {
        emailTemplates: {
            ...DEFAULT_SETTINGS.emailTemplates,
            ...(payload.emailTemplates || {}),
        },
        notificationPreferences: {
            ...DEFAULT_SETTINGS.notificationPreferences,
            ...(payload.notificationPreferences || {}),
        },
        thresholds: {
            ...DEFAULT_SETTINGS.thresholds,
            ...(payload.thresholds || {}),
        },
        appearance: {
            ...DEFAULT_SETTINGS.appearance,
            ...(payload.appearance || {}),
        },
        securityPolicies: {
            ...DEFAULT_SETTINGS.securityPolicies,
            ...(payload.securityPolicies || {}),
        },
        reportScheduling: {
            ...DEFAULT_SETTINGS.reportScheduling,
            ...(payload.reportScheduling || {}),
        },
        maintenance: {
            ...DEFAULT_SETTINGS.maintenance,
            ...(payload.maintenance || {}),
        },
    };

    safe.notificationPreferences.emailEnabled = !!safe.notificationPreferences.emailEnabled;
    safe.notificationPreferences.smsEnabled = !!safe.notificationPreferences.smsEnabled;
    safe.notificationPreferences.inAppEnabled = !!safe.notificationPreferences.inAppEnabled;
    safe.notificationPreferences.adminContactNumber = String(
        safe.notificationPreferences.adminContactNumber || ""
    ).trim();

    safe.thresholds.incidentsPerDayAlert = Math.max(
        1,
        Number(safe.thresholds.incidentsPerDayAlert || DEFAULT_SETTINGS.thresholds.incidentsPerDayAlert)
    );
    safe.thresholds.benefitsPerDayAlert = Math.max(
        1,
        Number(safe.thresholds.benefitsPerDayAlert || DEFAULT_SETTINGS.thresholds.benefitsPerDayAlert)
    );
    safe.thresholds.highBillAmount = Math.max(
        1,
        Number(safe.thresholds.highBillAmount || DEFAULT_SETTINGS.thresholds.highBillAmount)
    );
    safe.thresholds.seminarWindowDays = Math.max(
        1,
        Number(safe.thresholds.seminarWindowDays || DEFAULT_SETTINGS.thresholds.seminarWindowDays)
    );

    safe.emailTemplates.benefitApproval = String(safe.emailTemplates.benefitApproval || "").trim();
    safe.emailTemplates.incidentAcknowledgement = String(
        safe.emailTemplates.incidentAcknowledgement || ""
    ).trim();
    safe.emailTemplates.seminarReminder = String(safe.emailTemplates.seminarReminder || "").trim();
    safe.appearance.darkModeEnabled = !!safe.appearance.darkModeEnabled;

    safe.securityPolicies.minPasswordLength = Math.min(
        128,
        Math.max(
            6,
            Number(
                safe.securityPolicies.minPasswordLength || DEFAULT_SETTINGS.securityPolicies.minPasswordLength
            )
        )
    );
    safe.securityPolicies.requireUppercase = !!safe.securityPolicies.requireUppercase;
    safe.securityPolicies.requireNumber = !!safe.securityPolicies.requireNumber;
    safe.securityPolicies.requireSpecialChar = !!safe.securityPolicies.requireSpecialChar;
    safe.securityPolicies.sessionTimeoutMinutes = Math.min(
        720,
        Math.max(
            5,
            Number(
                safe.securityPolicies.sessionTimeoutMinutes || DEFAULT_SETTINGS.securityPolicies.sessionTimeoutMinutes
            )
        )
    );
    safe.securityPolicies.enforceAdmin2FA = !!safe.securityPolicies.enforceAdmin2FA;

    safe.reportScheduling.enabled = !!safe.reportScheduling.enabled;
    const frequency = String(safe.reportScheduling.frequency || "weekly").toLowerCase();
    safe.reportScheduling.frequency = ["daily", "weekly", "monthly"].includes(frequency) ? frequency : "weekly";
    const rawSendTime = String(safe.reportScheduling.sendTime || "08:00").trim();
    safe.reportScheduling.sendTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(rawSendTime) ? rawSendTime : "08:00";
    safe.reportScheduling.weekday = Math.min(6, Math.max(0, Number(safe.reportScheduling.weekday || 0)));
    safe.reportScheduling.dayOfMonth = Math.min(28, Math.max(1, Number(safe.reportScheduling.dayOfMonth || 1)));
    safe.reportScheduling.recipients = String(safe.reportScheduling.recipients || "").trim();

    safe.maintenance.enabled = !!safe.maintenance.enabled;
    safe.maintenance.durationMinutes = Math.max(1, Math.min(1440, Number(safe.maintenance.durationMinutes || 30)));
    safe.maintenance.message = String(safe.maintenance.message || DEFAULT_SETTINGS.maintenance.message).trim();
    if (safe.maintenance.startTime) {
        const startTime = new Date(safe.maintenance.startTime);
        safe.maintenance.startTime = startTime instanceof Date && !isNaN(startTime) ? startTime.toISOString() : null;
    }

    return safe;
}

exports.getSystemSettings = async(req, res) => {
    try {
        const settings = await loadSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: "Failed to load settings", details: err.message });
    }
};

exports.updateSystemSettings = async(req, res) => {
    try {
        const userId = Number((req.user && req.user.id) || 0) || null;
        const payload = sanitizePayload(req.body || {});

        await ensureSettingsTable();

        await db.query(
            `
      INSERT INTO system_settings (setting_key, setting_value, updated_by)
      VALUES (?, CAST(? AS JSON), ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
      `, ["emailTemplates", JSON.stringify(payload.emailTemplates), userId]
        );

        await db.query(
            `
      INSERT INTO system_settings (setting_key, setting_value, updated_by)
      VALUES (?, CAST(? AS JSON), ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
      `, ["notificationPreferences", JSON.stringify(payload.notificationPreferences), userId]
        );

        await db.query(
            `
      INSERT INTO system_settings (setting_key, setting_value, updated_by)
      VALUES (?, CAST(? AS JSON), ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
      `, ["thresholds", JSON.stringify(payload.thresholds), userId]
        );

        await db.query(
            `
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES (?, CAST(? AS JSON), ?)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
            `, ["appearance", JSON.stringify(payload.appearance), userId]
        );

        await db.query(
            `
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES (?, CAST(? AS JSON), ?)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
            `, ["securityPolicies", JSON.stringify(payload.securityPolicies), userId]
        );

        await db.query(
            `
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES (?, CAST(? AS JSON), ?)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
            `, ["reportScheduling", JSON.stringify(payload.reportScheduling), userId]
        );

        await db.query(
            `
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES (?, CAST(? AS JSON), ?)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
            `, ["maintenance", JSON.stringify(payload.maintenance), userId]
        );

        await logAuditEvent({
            req,
            actionType: "settings",
            action: "system_settings_updated",
            entityType: "system_settings",
            entityId: "global",
            details: {
                sections: ["emailTemplates", "notificationPreferences", "thresholds", "appearance", "securityPolicies", "reportScheduling", "maintenance"],
            },
        });

        const latest = await loadSettings();
        res.json({ message: "Settings saved", settings: latest });
    } catch (err) {
        res.status(500).json({ message: "Failed to update settings", details: err.message });
    }
};

exports.getAuditLogs = async(req, res) => {
    try {
        const userId = req.query && req.query.user_id ? Number(req.query.user_id) : null;
        const actionType = String((req.query && req.query.action_type) || "").trim();
        const dateFrom = String((req.query && req.query.date_from) || "").trim();
        const dateTo = String((req.query && req.query.date_to) || "").trim();
        const search = String((req.query && req.query.search) || "").trim();
        const limit = Math.min(500, Math.max(1, Number((req.query && req.query.limit) || 100)));
        const page = Math.max(1, Number((req.query && req.query.page) || 1));
        const offset = (page - 1) * limit;

        const data = await listAuditLogs({
            userId: Number.isFinite(userId) && userId > 0 ? userId : null,
            actionType: actionType || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            search: search || null,
            limit,
            offset,
        });

        res.json({
            items: data.items,
            total: data.total,
            page,
            limit,
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to load audit logs", details: err.message });
    }
};

exports.getMaintenanceStatus = async(req, res) => {
    try {
        await ensureSettingsTable();
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
            return res.json(defaultSettings);
        }

        const rawValue = rows[0].setting_value;
        if (typeof rawValue === "object") {
            return res.json({ ...defaultSettings, ...rawValue });
        }

        try {
            const parsed = JSON.parse(rawValue);
            return res.json({ ...defaultSettings, ...parsed });
        } catch (_) {
            return res.json(defaultSettings);
        }
    } catch (err) {
        res.status(500).json({ message: "Failed to load maintenance status", details: err.message });
    }
};

exports.updateMaintenanceStatus = async(req, res) => {
    try {
        const userId = Number((req.user && req.user.id) || 0) || null;
        const { enabled, durationMinutes, message } = req.body;

        await ensureSettingsTable();

        const maintenance = {
            enabled: !!enabled,
            startTime: enabled ? new Date().toISOString() : null,
            durationMinutes: Math.max(1, Math.min(1440, Number(durationMinutes || 30))),
            message: String(message || "The mobile app is currently under maintenance. Please try again later.").trim(),
        };

        await db.query(
            `
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES (?, CAST(? AS JSON), ?)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
            `, ["maintenance", JSON.stringify(maintenance), userId]
        );

        await logAuditEvent({
            req,
            actionType: "settings",
            action: "maintenance_status_updated",
            entityType: "system_settings",
            entityId: "maintenance",
            details: {
                enabled: maintenance.enabled,
                durationMinutes: maintenance.durationMinutes,
            },
        });

        // Clear cache to reflect changes immediately
        const { clearMaintenanceCache } = require("../middleware/maintenance.middleware");
        clearMaintenanceCache();

        res.json({ message: "Maintenance status updated", maintenance });
    } catch (err) {
        res.status(500).json({ message: "Failed to update maintenance status", details: err.message });
    }
};

exports.disableMaintenance = async(req, res) => {
    try {
        const userId = Number((req.user && req.user.id) || 0) || null;

        await ensureSettingsTable();

        const maintenance = {
            enabled: false,
            startTime: null,
            durationMinutes: 30,
            message: "The mobile app is currently under maintenance. Please try again later.",
        };

        await db.query(
            `
            INSERT INTO system_settings (setting_key, setting_value, updated_by)
            VALUES (?, CAST(? AS JSON), ?)
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP
            `, ["maintenance", JSON.stringify(maintenance), userId]
        );

        await logAuditEvent({
            req,
            actionType: "settings",
            action: "maintenance_disabled",
            entityType: "system_settings",
            entityId: "maintenance",
            details: { disabled: true },
        });

        // Clear cache
        const { clearMaintenanceCache } = require("../middleware/maintenance.middleware");
        clearMaintenanceCache();

        res.json({ message: "Maintenance mode disabled", maintenance });
    } catch (err) {
        res.status(500).json({ message: "Failed to disable maintenance", details: err.message });
    }
};