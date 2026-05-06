const pool7 = require("../db.cjs");
const { saveEvidenceFiles } = require("../services/incident-evidence.service");

async function notifyAdminsOfIncident({ incidentId, userId, category, location }) {
    const [adminRows] = await pool7.execute(
        `
      SELECT u.id
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE LOWER(r.name) = 'admin'
    `
    );

    if (!Array.isArray(adminRows) || !adminRows.length) {
        return 0;
    }

    const title = "New Incident Reported";
    const details = [
        `Incident #${incidentId}`,
        category ? `Category: ${category}` : null,
        location ? `Location: ${location}` : null,
        `Reported by user #${userId}`,
    ].filter(Boolean).join(" | ");

    let inserted = 0;
    for (const admin of adminRows) {
        const adminId = Number(admin.id);
        if (!Number.isFinite(adminId) || adminId <= 0) continue;

        await pool7.execute(
            `
        INSERT INTO notifications (user_id, title, body, is_read)
        VALUES (?, ?, ?, 0)
      `,
            [adminId, title, details]
        );
        inserted += 1;
    }

    return inserted;
}

/**
 * POST report_incident.php
 * body: user_id, category, description, location(optional)
 */
async function reportIncident(req, res) {
    if (req.method !== "POST") {
        return res.json({ status: "fail", message: "Invalid method" });
    }

    const userId = Number.parseInt(String(req.body?.user_id ?? "0"), 10);
    const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
    const description =
        typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";

    if (!Number.isFinite(userId) || userId <= 0 || !category || !description) {
        return res.json({ status: "fail", message: "Missing required fields" });
    }

    try {
        const insertSql = `
      INSERT INTO incident_reports (user_id, category, description)
      VALUES (?, ?, ?)
    `;
        const [result] = await pool7.execute(insertSql, [userId, category, description]);
        const incidentId = Number(result.insertId);

        const files = Array.isArray(req.files) ? req.files : [];
        const baseUrl = req && req.protocol && req.get ? `${req.protocol}://${req.get("host")}` : "";
        const savedEvidence = await saveEvidenceFiles({
            incidentId,
            userId,
            files,
            baseUrl
        });

        let notificationsSent = 0;
        try {
            notificationsSent = await notifyAdminsOfIncident({
                incidentId,
                userId,
                category,
                location,
            });
        } catch (notifyErr) {
            console.warn("Failed to notify admins about incident:", notifyErr.message);
        }

        if (location) {
            const logSql = `
        INSERT INTO system_logs (user_id, action, details)
        VALUES (?, 'report_incident', ?)
      `;
            const details = `Location: ${location} | Incident ID: ${incidentId}`;
            await pool7.execute(logSql, [userId, details]);
        }

        return res.json({
            status: "success",
            message: "Incident reported",
            incident_id: incidentId,
            uploaded_files: savedEvidence.length,
            notifications_sent: notificationsSent,
        });
    } catch (err) {
        return res.json({
            status: "fail",
            message: `Server error: ${err?.message || String(err)}`,
        });
    }
}

module.exports = { reportIncident };