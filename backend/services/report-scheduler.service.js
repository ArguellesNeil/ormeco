const db = require("../config/db");
const emailService = require("./email.services");
const { logAuditEvent } = require("./audit-log.service");

const DEFAULT_SCHEDULING = {
    enabled: false,
    frequency: "weekly",
    sendTime: "08:00",
    weekday: 0,
    dayOfMonth: 1,
    recipients: "",
};

let timerId = null;
let jobInProgress = false;
let initialized = false;

// ----------------- HELPERS -----------------

function pad2(value) {
    return String(value).padStart(2, "0");
}

function toSqlDateTime(value) {
    const d = value instanceof Date ? value : new Date(value);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function parseJson(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normalizeScheduling(raw = {}) {
    const merged = {...DEFAULT_SCHEDULING, ...raw };
    const frequency = String(merged.frequency).toLowerCase();

    return {
        enabled: !!merged.enabled,
        frequency: ["daily", "weekly", "monthly"].includes(frequency) ? frequency : "weekly",
        sendTime: /^([01]\d|2[0-3]):([0-5]\d)$/.test(merged.sendTime) ? merged.sendTime : "08:00",
        weekday: Math.min(6, Math.max(0, Number(merged.weekday))),
        dayOfMonth: Math.min(28, Math.max(1, Number(merged.dayOfMonth))),
        recipients: String(merged.recipients || "").trim(),
    };
}

function parseRecipients(raw) {
    return String(raw || "")
        .split(",")
        .map(e => e.trim())
        .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ----------------- DB -----------------

async function ensureSettingsTable() {
    if (initialized) return;

    await db.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(80) PRIMARY KEY,
            setting_value JSON NOT NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    initialized = true;
}

async function readSetting(key, fallback = {}) {
    const [rows] = await db.query(
        "SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1", [key]
    );

    if (!rows.length) return fallback;
    return parseJson(rows[0].setting_value, fallback);
}

async function writeSetting(key, value, updatedBy = null) {
    await db.query(`
        INSERT INTO system_settings (setting_key, setting_value, updated_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_by = VALUES(updated_by),
            updated_at = CURRENT_TIMESTAMP
    `, [key, JSON.stringify(value), updatedBy]);
}

// ----------------- PERIOD -----------------

function getScheduledDateForNow(now, config) {
    const [hh, mm] = config.sendTime.split(":").map(Number);
    const d = new Date(now);
    d.setHours(hh, mm, 0, 0);
    return d;
}

function buildPeriod(config, now) {
    if (config.frequency === "daily") {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        return { key: `daily:${start.toISOString().slice(0, 10)}`, label: start.toISOString().slice(0, 10), start, end };
    }

    if (config.frequency === "monthly") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        return { key: `monthly:${start.getFullYear()}-${pad2(start.getMonth() + 1)}`, label: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}`, start, end };
    }

    // weekly
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { key: `weekly:${start.toISOString().slice(0, 10)}`, label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`, start, end };
}

// ----------------- SUMMARY -----------------

async function buildSummary(startAt, endAt) {
    const startSql = toSqlDateTime(startAt);
    const endSql = toSqlDateTime(endAt);

    const count = async(sql, params, key) => {
        const [rows] = await db.query(sql, params);
        return Number(rows ?.[0] ?.[key] || 0);
    };

    const [
        totalUsers,
        totalIncidents,
        openIncidents,
        totalBenefits,
        approvedBenefits,
        pendingSeminars,
    ] = await Promise.all([
        count("SELECT COUNT(*) AS total FROM users WHERE created_at BETWEEN ? AND ?", [startSql, endSql], "total"),
        count("SELECT COUNT(*) AS total FROM incident_reports WHERE reported_at BETWEEN ? AND ?", [startSql, endSql], "total"),
        count("SELECT COUNT(*) AS total FROM incident_reports WHERE status='open' AND reported_at BETWEEN ? AND ?", [startSql, endSql], "total"),
        count("SELECT COUNT(*) AS total FROM benefit_applications WHERE applied_at BETWEEN ? AND ?", [startSql, endSql], "total"),
        count("SELECT COUNT(*) AS total FROM benefit_applications WHERE status='approved' AND COALESCE(reviewed_at, applied_at) BETWEEN ? AND ?", [startSql, endSql], "total"),
        count("SELECT COUNT(*) AS total FROM seminar_schedule_requests WHERE status='pending' AND created_at BETWEEN ? AND ?", [startSql, endSql], "total"),
    ]);

    return { totalUsers, totalIncidents, openIncidents, totalBenefits, approvedBenefits, pendingSeminars };
}

// ----------------- MAIN -----------------

async function runScheduledReport({ triggeredBy = null, req = null, force = false } = {}) {
    if (jobInProgress) return { skipped: true, reason: "job_in_progress" };

    jobInProgress = true;

    try {
        await ensureSettingsTable();

        const config = normalizeScheduling(await readSetting("reportScheduling", DEFAULT_SCHEDULING));
        const prefs = await readSetting("notificationPreferences", { emailEnabled: true });

        if (!config.enabled && !force) return { skipped: true, reason: "disabled" };
        if (!prefs.emailEnabled) return { skipped: true, reason: "email_disabled" };

        const now = new Date();
        const scheduleTime = getScheduledDateForNow(now, config);

        if (!force && now < scheduleTime) return { skipped: true, reason: "too_early" };

        const period = buildPeriod(config, now);
        const state = await readSetting("reportSchedulingState", {});

        if (!force && state.lastSentPeriodKey === period.key) {
            return { skipped: true, reason: "already_sent" };
        }

        const summary = await buildSummary(period.start, period.end);

        const recipients = parseRecipients(config.recipients);
        const fallback = process.env.ADMIN_EMAIL;

        if (!recipients.length && isValidEmail(fallback)) {
            recipients.push(fallback);
        }

        if (!recipients.length) return { skipped: true, reason: "no_recipients" };

        const result = await emailService.sendReportDigestEmail({
            to: recipients,
            subject: `[ORMECO] ${config.frequency.toUpperCase()} Report (${period.label})`,
            text: JSON.stringify(summary, null, 2),
        });

        await writeSetting("reportSchedulingState", {
            lastSentAt: now.toISOString(),
            lastSentPeriodKey: period.key,
            lastMessageId: result ?.messageId || null,
        });

        await logAuditEvent({
            req,
            userId: triggeredBy,
            actionType: "system_event",
            action: "scheduled_report_sent",
            entityType: "reports",
            entityId: period.key,
        });

        return { sent: true, recipients };

    } finally {
        jobInProgress = false;
    }
}

// ----------------- TIMER -----------------

function startReportScheduler() {
    if (timerId) return;
    timerId = setInterval(runScheduledReport, 60000);
    runScheduledReport();
}

function stopReportScheduler() {
    if (timerId) clearInterval(timerId);
    timerId = null;
}

function runScheduledReportNow(opts) {
    return runScheduledReport({...opts, force: true });
}

module.exports = {
    startReportScheduler,
    stopReportScheduler,
    runScheduledReportNow,
};