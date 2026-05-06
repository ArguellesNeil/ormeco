const db = require("../config/db");
const { runScheduledReportNow } = require("../services/report-scheduler.service");

const WEEKDAY_NAME_TO_INDEX = {
    mon: 0,
    monday: 0,
    tue: 1,
    tues: 1,
    tuesday: 1,
    wed: 2,
    wednesday: 2,
    thu: 3,
    thurs: 3,
    thursday: 3,
    fri: 4,
    friday: 4,
    sat: 5,
    saturday: 5,
    sun: 6,
    sunday: 6,
};

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

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function parseDateOnly(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return startOfDay(date);
}

function parseWeekdayIndexes(value) {
    if (typeof value === "undefined" || value === null || value === "") return [];

    const tokens = Array.isArray(value) ?
        value :
        String(value)
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);

    const set = new Set();
    for (const tokenRaw of tokens) {
        const token = String(tokenRaw).trim().toLowerCase();
        if (!token) continue;

        if (/^\d+$/.test(token)) {
            const parsed = Number(token);
            if (parsed >= 0 && parsed <= 6) {
                set.add(parsed);
            }
            continue;
        }

        if (Object.prototype.hasOwnProperty.call(WEEKDAY_NAME_TO_INDEX, token)) {
            set.add(WEEKDAY_NAME_TO_INDEX[token]);
        }
    }

    return Array.from(set).sort((a, b) => a - b);
}

function buildDateFilterClause(dateExpr, startAt, endAt, weekdayIndexes = []) {
    const parts = [
        `${dateExpr} IS NOT NULL`,
        `${dateExpr} >= ?`,
        `${dateExpr} <= ?`,
    ];
    const params = [startAt, endAt];

    if (weekdayIndexes.length) {
        parts.push(`WEEKDAY(${dateExpr}) IN (${weekdayIndexes.map(() => "?").join(",")})`);
        params.push(...weekdayIndexes);
    }

    return {
        clause: parts.join(" AND "),
        params,
    };
}

function getCustomWindow(query) {
    const now = new Date();
    const scopeType = String(query.scope_type || "last_n_days").toLowerCase();

    if (scopeType === "specific_day") {
        let selected = parseDateOnly(query.custom_date);

        if (!selected) {
            const year = Number(query.custom_year);
            const month = Number(query.custom_month);
            const day = Number(query.custom_day);
            if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
                selected = parseDateOnly(`${year}-${pad2(month)}-${pad2(day)}`);
            }
        }

        const startAt = selected || startOfDay(now);
        return {
            scopeType,
            startAt,
            endAt: endOfDay(startAt),
        };
    }

    if (scopeType === "month") {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const year = Number.isInteger(Number(query.custom_year)) ? Number(query.custom_year) : currentYear;
        const month = Number.isInteger(Number(query.custom_month)) ? clamp(Number(query.custom_month), 1, 12) : currentMonth;
        const safeYear = clamp(year, 2000, 2100);
        const startAt = new Date(safeYear, month - 1, 1, 0, 0, 0, 0);
        const endAt = new Date(safeYear, month, 0, 23, 59, 59, 999);
        return { scopeType, startAt, endAt };
    }

    if (scopeType === "year") {
        const currentYear = now.getFullYear();
        const year = Number.isInteger(Number(query.custom_year)) ? Number(query.custom_year) : currentYear;
        const safeYear = clamp(year, 2000, 2100);
        const startAt = new Date(safeYear, 0, 1, 0, 0, 0, 0);
        const endAt = new Date(safeYear, 11, 31, 23, 59, 59, 999);
        return { scopeType, startAt, endAt };
    }

    if (scopeType === "date_range") {
        const from = parseDateOnly(query.date_from);
        const to = parseDateOnly(query.date_to);

        if (from && to) {
            const rangeStart = from <= to ? from : to;
            const rangeEnd = from <= to ? to : from;
            return {
                scopeType,
                startAt: rangeStart,
                endAt: endOfDay(rangeEnd),
            };
        }

        if (from) {
            return {
                scopeType,
                startAt: from,
                endAt: endOfDay(from),
            };
        }

        if (to) {
            return {
                scopeType,
                startAt: to,
                endAt: endOfDay(to),
            };
        }
    }

    const lastNDaysRaw = Number(query.last_n_days || query.custom_days || 7);
    const lastNDays = clamp(Number.isFinite(lastNDaysRaw) ? Math.floor(lastNDaysRaw) : 7, 1, 366);
    const endAt = endOfDay(now);
    const startAt = startOfDay(now);
    startAt.setDate(startAt.getDate() - (lastNDays - 1));

    return {
        scopeType: "last_n_days",
        startAt,
        endAt,
        lastNDays,
    };
}

function getCustomConfig({ startAt, endAt, scopeType }) {
    const daySpan = Math.max(1, Math.floor((endAt.getTime() - startAt.getTime()) / 86400000) + 1);
    const useMonthly = scopeType === "year" || daySpan > 90;

    return {
        period: "custom",
        labelPeriod: useMonthly ? "monthly" : "daily",
        bucketExpr: useMonthly ? "DATE_FORMAT(%COL%, '%Y-%m')" : "DATE(%COL%)",
    };
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

function makeLabelsFromRange({ labelPeriod, startAt, endAt, weekdayIndexes = [] }) {
    const labels = [];

    if (labelPeriod === "monthly") {
        const cursor = new Date(startAt.getFullYear(), startAt.getMonth(), 1, 0, 0, 0, 0);
        while (cursor <= endAt) {
            labels.push(formatBucket(cursor, "monthly"));
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return labels;
    }

    const weekdaySet = new Set(weekdayIndexes);
    const cursor = startOfDay(startAt);
    const rangeEnd = endOfDay(endAt);

    while (cursor <= rangeEnd) {
        const weekday = (cursor.getDay() + 6) % 7;
        if (!weekdaySet.size || weekdaySet.has(weekday)) {
            labels.push(formatBucket(cursor, "daily"));
        }
        cursor.setDate(cursor.getDate() + 1);
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

async function getSeries({ table, dateColumn, labels, config, startAt, endAt, weekdayIndexes = [] }) {
    if (!labels.length) return [];

    let bucketExpr = config.bucketExpr.split("%COL%").join(dateColumn);
    // Ensure bucket is returned as a string in the correct format for matching labels
    // For DATE() results, explicitly cast to CHAR; for DATE_FORMAT, already returns string
    if (bucketExpr.includes("DATE(") && !bucketExpr.includes("DATE_FORMAT")) {
        // Replace DATE(...) with DATE_FORMAT(..., '%Y-%m-%d') to ensure consistent string format
        bucketExpr = bucketExpr.replace(/DATE\(([^)]+)\)/, "DATE_FORMAT($1, '%Y-%m-%d')");
    }
    
    const filter = buildDateFilterClause(dateColumn, startAt, endAt, weekdayIndexes);
    const sql = `
    SELECT ${bucketExpr} AS bucket, COUNT(*) AS total
    FROM ${table}
    WHERE ${filter.clause}
    GROUP BY ${bucketExpr}
    ORDER BY bucket
  `;

    const [rows] = await db.query(sql, filter.params);
    // Normalize bucket strings (trim and ensure consistent format)
    const map = new Map(rows.map((r) => {
        const bucketStr = String(r.bucket).trim();
        return [bucketStr, Number(r.total)];
    }));
    
    // Return array with counts for each label; debug log if no data found
    const result = labels.map((label) => map.get(label) || 0);
    
    // If all results are 0 and we have rows, log mismatch for debugging
    if (result.every((v) => v === 0) && rows.length > 0) {
        console.warn(`[Reports] getSeries mismatch for ${table}: got ${rows.length} rows but no label matches.`);
        console.warn(`  Buckets from query:`, rows.slice(0, 3).map((r) => r.bucket));
        console.warn(`  Expected labels:`, labels.slice(0, 3));
    }
    
    return result;
}

async function getStatusBreakdown({ table, dateExpr, startAt, endAt, weekdayIndexes = [] }) {
    const filter = buildDateFilterClause(dateExpr, startAt, endAt, weekdayIndexes);
    const [rows] = await db.query(
        `SELECT LOWER(COALESCE(status, 'unknown')) AS status, COUNT(*) AS total
     FROM ${table}
     WHERE ${filter.clause}
     GROUP BY LOWER(COALESCE(status, 'unknown'))
     ORDER BY total DESC`, filter.params
    );
    return rows;
}

async function runCountQuery(sql, params, field = "total") {
    const [rows] = await db.query(sql, params);
    return Number(rows?.[0]?.[field] || 0);
}

async function getOverview(req, res) {
    try {
        const requested = String(req.query.period || "monthly").toLowerCase();
        const weekdayIndexes = parseWeekdayIndexes(req.query.weekdays);

        let config;
        let startAt;
        let endAt;
        let labels;
        let scopeType = null;

        if (requested === "custom") {
            const customWindow = getCustomWindow(req.query || {});
            startAt = customWindow.startAt;
            endAt = customWindow.endAt;
            scopeType = customWindow.scopeType;
            config = getCustomConfig({ startAt, endAt, scopeType });
            labels = makeLabelsFromRange({
                labelPeriod: config.labelPeriod,
                startAt,
                endAt,
                weekdayIndexes,
            });
        } else {
            config = getPeriodConfig(requested);
            const periodWindow = getPeriodWindow(config.period);
            startAt = periodWindow.startAt;
            endAt = periodWindow.endAt;
            labels = makeLabels(config.labelPeriod || config.period, config.points, periodWindow.labelStart || startAt);
        }

        const startAtSql = toSqlDateTime(startAt);
        const endAtSql = toSqlDateTime(endAt);

        const usersFilter = buildDateFilterClause("created_at", startAtSql, endAtSql, weekdayIndexes);
        const userMembersFilter = buildDateFilterClause("u.created_at", startAtSql, endAtSql, weekdayIndexes);
        const metersFilter = buildDateFilterClause("installed_at", startAtSql, endAtSql, weekdayIndexes);
        const incidentsFilter = buildDateFilterClause("reported_at", startAtSql, endAtSql, weekdayIndexes);
        const benefitsAppliedFilter = buildDateFilterClause("applied_at", startAtSql, endAtSql, weekdayIndexes);
        const benefitsApprovedFilter = buildDateFilterClause("COALESCE(reviewed_at, applied_at)", startAtSql, endAtSql, weekdayIndexes);
        const seminarsFilter = buildDateFilterClause("created_at", startAtSql, endAtSql, weekdayIndexes);
        const announcementsFilter = buildDateFilterClause("created_at", startAtSql, endAtSql, weekdayIndexes);

        const [
            totalUsers,
            totalMembers,
            totalMeters,
            activeMeters,
            totalIncidents,
            openIncidents,
            totalBenefitApps,
            pendingBenefits,
            activeBenefits,
            totalSeminarRequests,
            pendingSeminarRequests,
            totalAnnouncements,
        ] = await Promise.all([
            runCountQuery(`SELECT COUNT(*) AS total_users FROM users WHERE ${usersFilter.clause}`, usersFilter.params, "total_users"),
            runCountQuery(
                `SELECT COUNT(DISTINCT m.user_id) AS total_members
                 FROM members m
                 JOIN users u ON u.id = m.user_id
                 WHERE ${userMembersFilter.clause}`,
                userMembersFilter.params,
                "total_members"
            ),
            runCountQuery(`SELECT COUNT(*) AS total_meters FROM meters WHERE ${metersFilter.clause}`, metersFilter.params, "total_meters"),
            runCountQuery(
                `SELECT COUNT(*) AS active_meters
                 FROM meters
                 WHERE status='active' AND ${metersFilter.clause}`,
                metersFilter.params,
                "active_meters"
            ),
            runCountQuery(
                `SELECT COUNT(*) AS total_incidents
                 FROM incident_reports
                 WHERE ${incidentsFilter.clause}`,
                incidentsFilter.params,
                "total_incidents"
            ),
            runCountQuery(
                `SELECT COUNT(*) AS open_incidents
                 FROM incident_reports
                 WHERE status='open' AND ${incidentsFilter.clause}`,
                incidentsFilter.params,
                "open_incidents"
            ),
            runCountQuery(
                `SELECT COUNT(*) AS total_benefit_apps
                 FROM benefit_applications
                 WHERE ${benefitsAppliedFilter.clause}`,
                benefitsAppliedFilter.params,
                "total_benefit_apps"
            ),
            runCountQuery(
                `SELECT COUNT(*) AS pending_benefits
                 FROM benefit_applications
                 WHERE status='pending' AND ${benefitsAppliedFilter.clause}`,
                benefitsAppliedFilter.params,
                "pending_benefits"
            ),
            runCountQuery(
                `SELECT COUNT(DISTINCT benefit_id) AS active_benefits
                 FROM benefit_applications
                 WHERE status='approved' AND ${benefitsApprovedFilter.clause}`,
                benefitsApprovedFilter.params,
                "active_benefits"
            ),
            runCountQuery(
                `SELECT COUNT(*) AS total_seminar_requests
                 FROM seminar_schedule_requests
                 WHERE ${seminarsFilter.clause}`,
                seminarsFilter.params,
                "total_seminar_requests"
            ),
            runCountQuery(
                `SELECT COUNT(*) AS pending_seminar_requests
                 FROM seminar_schedule_requests
                 WHERE status='pending' AND ${seminarsFilter.clause}`,
                seminarsFilter.params,
                "pending_seminar_requests"
            ),
            runCountQuery(
                `SELECT COUNT(*) AS total_announcements
                 FROM announcements
                 WHERE ${announcementsFilter.clause}`,
                announcementsFilter.params,
                "total_announcements"
            ),
        ]);

        const summary = {
            total_users: totalUsers,
            total_members: totalMembers,
            total_meters: totalMeters,
            active_meters: activeMeters,
            total_incidents: totalIncidents,
            open_incidents: openIncidents,
            total_benefit_apps: totalBenefitApps,
            pending_benefits: pendingBenefits,
            active_benefits: activeBenefits,
            total_seminar_requests: totalSeminarRequests,
            pending_seminar_requests: pendingSeminarRequests,
            total_announcements: totalAnnouncements,
        };

        const [users, meters, incidents, seminars, announcements] = await Promise.all([
            getSeries({ table: "users", dateColumn: "created_at", labels, config, startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
            getSeries({ table: "meters", dateColumn: "installed_at", labels, config, startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
            getSeries({ table: "incident_reports", dateColumn: "reported_at", labels, config, startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
            getSeries({ table: "seminar_schedule_requests", dateColumn: "created_at", labels, config, startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
            getSeries({ table: "announcements", dateColumn: "created_at", labels, config, startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
        ]);

        // Benefit Distribution (pie chart data) scoped to the selected reporting window.
        const benefitApprovedDateExpr = "COALESCE(ba.reviewed_at, ba.applied_at)";
        const benefitDistributionFilter = buildDateFilterClause(benefitApprovedDateExpr, startAtSql, endAtSql, weekdayIndexes);
        const [benefitDistribution] = await db.query(
            `
            SELECT b.id, b.name, COUNT(ba.id) AS count
            FROM benefits b
            LEFT JOIN benefit_applications ba
              ON b.id = ba.benefit_id
             AND ba.status = 'approved'
             AND ${benefitDistributionFilter.clause}
            GROUP BY b.id, b.name
            ORDER BY count DESC
                `, benefitDistributionFilter.params
        );



        // Incident Trends (bar chart data - status count per period)
        const incidentBucketExpr = config.bucketExpr.split("%COL%").join("reported_at");
        const incidentTrendFilter = buildDateFilterClause("reported_at", startAtSql, endAtSql, weekdayIndexes);
        const [incidentTrends] = await db.query(`
            SELECT 
                ${incidentBucketExpr} AS period,
                status,
                COUNT(*) AS count
            FROM incident_reports
            WHERE ${incidentTrendFilter.clause}
            GROUP BY period, status
            ORDER BY period, status
        `, incidentTrendFilter.params);

        const [incidentStatus, meterStatus, benefitStatus, seminarStatus] = await Promise.all([
            getStatusBreakdown({ table: "incident_reports", dateExpr: "reported_at", startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
            getStatusBreakdown({ table: "meters", dateExpr: "installed_at", startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
            getStatusBreakdown({ table: "benefit_applications", dateExpr: "applied_at", startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
            getStatusBreakdown({ table: "seminar_schedule_requests", dateExpr: "created_at", startAt: startAtSql, endAt: endAtSql, weekdayIndexes }),
        ]);

        const recentActivitiesFilter = buildDateFilterClause("happened_at", startAtSql, endAtSql, weekdayIndexes);

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
            WHERE ${recentActivitiesFilter.clause}
      ORDER BY happened_at DESC
      LIMIT 12
        `, recentActivitiesFilter.params);

        res.json({
            period: config.period,
            labelPeriod: config.labelPeriod,
            scopeType,
            range: {
                startAt: startAtSql,
                endAt: endAtSql,
            },
            weekdays: weekdayIndexes,
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

async function sendScheduledNow(req, res) {
    try {
        const result = await runScheduledReportNow({
            triggeredBy: Number((req.user && req.user.id) || 0) || null,
            req,
        });
        res.json({
            message: result && result.sent ? "Scheduled report email sent." : "Scheduled report email skipped.",
            result,
        });
    } catch (err) {
        console.error("reports.sendScheduledNow error:", err);
        res.status(500).json({ message: err.message || "Failed to send scheduled report email" });
    }
}

module.exports = {
    getOverview,
    sendScheduledNow,
};