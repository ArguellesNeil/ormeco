const db = require("../config/db");

function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatBucket(date, period) {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    if (period === "daily") return `${y}-${m}-${d}`;
    if (period === "weekly") {
        const weekStart = new Date(date);
        weekStart.setHours(0, 0, 0, 0);
        const weekday = (weekStart.getDay() + 6) % 7;
        weekStart.setDate(weekStart.getDate() - weekday);
        return `${weekStart.getFullYear()}-${pad2(weekStart.getMonth() + 1)}-${pad2(weekStart.getDate())}`;
    }
    if (period === "monthly") return `${y}-${m}`;
    return String(y);
}

function shiftPeriod(date, period, step) {
    const d = new Date(date);
    if (period === "daily") d.setDate(d.getDate() + step);
    else if (period === "weekly") d.setDate(d.getDate() + step * 7);
    else if (period === "monthly") d.setMonth(d.getMonth() + step);
    else d.setFullYear(d.getFullYear() + step);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function getPeriodConfig(period) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (period === "daily") {
        return {
            period: "daily",
            labelPeriod: "daily",
            points: 1,
            bucketExpr: "DATE(%COL%)",
        };
    }
    if (period === "weekly") {
        return {
            period: "weekly",
            labelPeriod: "daily",
            points: 7,
            bucketExpr: "DATE(%COL%)",
        };
    }
    if (period === "yearly") {
        return {
            period: "yearly",
            labelPeriod: "monthly",
            points: 12,
            bucketExpr: "DATE_FORMAT(%COL%, '%Y-%m')",
        };
    }
    return {
        period: "monthly",
        labelPeriod: "daily",
        points: daysInMonth,
        bucketExpr: "DATE(%COL%)",
    };
}

function makeLabels(period, points, startFrom) {
    const start = new Date(startFrom || new Date());
    start.setHours(0, 0, 0, 0);
    const labels = [];
    for (let i = 0; i < points; i += 1) {
        labels.push(formatBucket(shiftPeriod(start, period, i), period));
    }
    return labels;
}

function toSqlDateTime(value) {
    const d = value instanceof Date ? value : new Date(value);
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function buildRangeParams(startAt, endAt, repeatCount) {
    const params = [];
    for (let i = 0; i < repeatCount; i += 1) {
        params.push(startAt, endAt);
    }
    return params;
}

function getPeriodWindow(period) {
    const now = new Date();
    const start = new Date(now);
    let end = new Date(now);

    if (period === "daily") {
        start.setHours(0, 0, 0, 0);
        end = endOfDay(now);
        return { startAt: start, endAt: end, labelStart: start };
    }

    if (period === "weekly") {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6);
        end = endOfDay(now);
        return { startAt: start, endAt: end, labelStart: start };
    }

    if (period === "yearly") {
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { startAt: start, endAt: end, labelStart: start };
    }

    // monthly
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startAt: start, endAt: end, labelStart: start };
}

async function getSeries({ table, dateColumn, labels, config, startAt, endAt }) {
    const bucketExpr = config.bucketExpr.split("%COL%").join(dateColumn);
    const sql = `
    SELECT ${bucketExpr} AS bucket, COUNT(*) AS total
    FROM ${table}
    WHERE ${dateColumn} IS NOT NULL
      AND ${dateColumn} >= ?
      AND ${dateColumn} <= ?
    GROUP BY bucket
    ORDER BY bucket
  `;

    const [rows] = await db.query(sql, [startAt, endAt]);
    const map = new Map(rows.map((r) => [String(r.bucket), Number(r.total)]));
    return labels.map((label) => map.get(label) || 0);
}

async function getStatusBreakdown({ table, dateExpr, startAt, endAt }) {
    const [rows] = await db.query(
        `SELECT LOWER(COALESCE(status, 'unknown')) AS status, COUNT(*) AS total
     FROM ${table}
     WHERE ${dateExpr} IS NOT NULL
       AND ${dateExpr} >= ?
       AND ${dateExpr} <= ?
     GROUP BY LOWER(COALESCE(status, 'unknown'))
     ORDER BY total DESC`, [startAt, endAt]
    );
    return rows;
}

async function getOverview(req, res) {
    try {
        const requested = String(req.query.period || "monthly").toLowerCase();
        const config = getPeriodConfig(requested);
        const { startAt, endAt, labelStart } = getPeriodWindow(config.period);
        const labels = makeLabels(config.labelPeriod || config.period, config.points, labelStart || startAt);
        const startAtSql = toSqlDateTime(startAt);
        const endAtSql = toSqlDateTime(endAt);

        const [
            [summary]
        ] = await db.query(`
      SELECT
                (SELECT COUNT(*) FROM users WHERE created_at IS NOT NULL AND created_at >= ? AND created_at <= ?) AS total_users,
                (
                        SELECT COUNT(DISTINCT m.user_id)
                        FROM members m
                        JOIN users u ON u.id = m.user_id
                        WHERE u.created_at IS NOT NULL
                            AND u.created_at >= ?
                            AND u.created_at <= ?
                ) AS total_members,
                (SELECT COUNT(*) FROM meters WHERE installed_at IS NOT NULL AND installed_at >= ? AND installed_at <= ?) AS total_meters,
                (
                        SELECT COUNT(*)
                        FROM meters
                        WHERE status='active'
                            AND installed_at IS NOT NULL
                            AND installed_at >= ?
                            AND installed_at <= ?
                ) AS active_meters,
                (SELECT COUNT(*) FROM incident_reports WHERE reported_at IS NOT NULL AND reported_at >= ? AND reported_at <= ?) AS total_incidents,
                (
                        SELECT COUNT(*)
                        FROM incident_reports
                        WHERE status='open'
                            AND reported_at IS NOT NULL
                            AND reported_at >= ?
                            AND reported_at <= ?
                ) AS open_incidents,
                (SELECT COUNT(*) FROM benefit_applications WHERE applied_at IS NOT NULL AND applied_at >= ? AND applied_at <= ?) AS total_benefit_apps,
                (
                        SELECT COUNT(*)
                        FROM benefit_applications
                        WHERE status='pending'
                            AND applied_at IS NOT NULL
                            AND applied_at >= ?
                            AND applied_at <= ?
                ) AS pending_benefits,
                (
                        SELECT COUNT(DISTINCT benefit_id)
                        FROM benefit_applications
                        WHERE status='approved'
                            AND COALESCE(reviewed_at, applied_at) IS NOT NULL
                            AND COALESCE(reviewed_at, applied_at) >= ?
                            AND COALESCE(reviewed_at, applied_at) <= ?
                ) AS active_benefits,
                (
                        SELECT COUNT(*)
                        FROM seminar_schedule_requests
                        WHERE created_at IS NOT NULL
                            AND created_at >= ?
                            AND created_at <= ?
                ) AS total_seminar_requests,
                (
                        SELECT COUNT(*)
                        FROM seminar_schedule_requests
                        WHERE status='pending'
                            AND created_at IS NOT NULL
                            AND created_at >= ?
                            AND created_at <= ?
                ) AS pending_seminar_requests,
                (
                        SELECT COUNT(*)
                        FROM announcements
                        WHERE created_at IS NOT NULL
                            AND created_at >= ?
                            AND created_at <= ?
                ) AS total_announcements
        `, buildRangeParams(startAtSql, endAtSql, 12));

        const [users, meters, incidents, seminars, announcements] = await Promise.all([
            getSeries({ table: "users", dateColumn: "created_at", labels, config, startAt: startAtSql, endAt: endAtSql }),
            getSeries({ table: "meters", dateColumn: "installed_at", labels, config, startAt: startAtSql, endAt: endAtSql }),
            getSeries({ table: "incident_reports", dateColumn: "reported_at", labels, config, startAt: startAtSql, endAt: endAtSql }),
            getSeries({ table: "seminar_schedule_requests", dateColumn: "created_at", labels, config, startAt: startAtSql, endAt: endAtSql }),
            getSeries({ table: "announcements", dateColumn: "created_at", labels, config, startAt: startAtSql, endAt: endAtSql }),
        ]);

        // Benefit Distribution (pie chart data) scoped to the selected reporting window.
        const benefitApprovedDateExpr = "COALESCE(ba.reviewed_at, ba.applied_at)";
        const [benefitDistribution] = await db.query(
            `
            SELECT b.id, b.name, COUNT(ba.id) AS count
            FROM benefits b
            LEFT JOIN benefit_applications ba
              ON b.id = ba.benefit_id
             AND ba.status = 'approved'
             AND ${benefitApprovedDateExpr} IS NOT NULL
                         AND ${benefitApprovedDateExpr} >= ?
                         AND ${benefitApprovedDateExpr} <= ?
            GROUP BY b.id, b.name
            ORDER BY count DESC
                `, [startAtSql, endAtSql]
        );



        // Incident Trends (bar chart data - status count per period)
        const incidentBucketExpr = config.bucketExpr.split("%COL%").join("reported_at");
        const [incidentTrends] = await db.query(`
            SELECT 
                ${incidentBucketExpr} AS period,
                status,
                COUNT(*) AS count
            FROM incident_reports
            WHERE reported_at IS NOT NULL
              AND reported_at >= ?
              AND reported_at <= ?
            GROUP BY period, status
            ORDER BY period, status
        `, [startAtSql, endAtSql]);

        const [incidentStatus, meterStatus, benefitStatus, seminarStatus] = await Promise.all([
            getStatusBreakdown({ table: "incident_reports", dateExpr: "reported_at", startAt: startAtSql, endAt: endAtSql }),
            getStatusBreakdown({ table: "meters", dateExpr: "installed_at", startAt: startAtSql, endAt: endAtSql }),
            getStatusBreakdown({ table: "benefit_applications", dateExpr: "applied_at", startAt: startAtSql, endAt: endAtSql }),
            getStatusBreakdown({ table: "seminar_schedule_requests", dateExpr: "created_at", startAt: startAtSql, endAt: endAtSql }),
        ]);

        const [recentActivities] = await db.query(`
      SELECT *
      FROM (
        SELECT 'Incident' AS source, CONCAT('Incident #', id, ' - ', COALESCE(category, 'General')) AS title, reported_at AS happened_at
        FROM incident_reports
        WHERE reported_at IS NOT NULL

        UNION ALL

        SELECT 'Announcement' AS source, COALESCE(title, 'Announcement') AS title, created_at AS happened_at
        FROM announcements
        WHERE created_at IS NOT NULL

        UNION ALL

        SELECT 'Meter' AS source, CONCAT('Meter ', COALESCE(meter_number, '#N/A'), ' installed') AS title, installed_at AS happened_at
        FROM meters
        WHERE installed_at IS NOT NULL

        UNION ALL

                SELECT 'Seminar' AS source, CONCAT('Seminar request #', id, ' (', LOWER(COALESCE(status, 'pending')), ') submitted') AS title, created_at AS happened_at
                FROM seminar_schedule_requests
                WHERE created_at IS NOT NULL

                UNION ALL

                SELECT 'Seminar' AS source, CONCAT('Seminar request #', id, ' marked ', LOWER(COALESCE(status, 'pending'))) AS title, reviewed_at AS happened_at
                FROM seminar_schedule_requests
                WHERE reviewed_at IS NOT NULL

                UNION ALL

        SELECT 'User' AS source, CONCAT('New user ', COALESCE(full_name, CONCAT('#', id))) AS title, created_at AS happened_at
        FROM users
        WHERE created_at IS NOT NULL
      ) logs
            WHERE happened_at >= ?
                AND happened_at <= ?
      ORDER BY happened_at DESC
      LIMIT 12
        `, [startAtSql, endAtSql]);

        res.json({
            period: config.period,
            labels,
            summary,
            trends: {
                users,
                meters,
                incidents,
                seminars,
                announcements,
            },
            statusBreakdown: {
                incidents: incidentStatus,
                meters: meterStatus,
                benefitApplications: benefitStatus,
                seminarSchedule: seminarStatus,
            },
            benefitDistribution,
            incidentTrends,
            recentActivities,
            generatedAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error("reports.getOverview error:", err);
        res.status(500).json({ message: err.sqlMessage || err.message || "Failed to load reports" });
    }
}

module.exports = {
    getOverview,
};