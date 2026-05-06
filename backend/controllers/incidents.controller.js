const db = require("../config/db");
const {
    listEvidenceFiles,
    getEvidenceFilePath,
} = require("../services/incident-evidence.service");

const appendEvidenceToIncident = (row, baseUrl) => {
    const evidenceFiles = listEvidenceFiles(row.id, baseUrl);

    return {
        ...row,
        evidence_files: evidenceFiles,
        evidence_count: evidenceFiles.length,
    };
};

// GET all incidents
async function getAllIncidents(req, res) {
    try {
        const baseUrl = req && req.protocol && req.get ? `${req.protocol}://${req.get("host")}` : "";

        const [rows] = await db.query(
            `SELECT i.*, u.full_name AS user_name
       FROM incident_reports i
       JOIN users u ON i.user_id = u.id`
        );
        res.json(rows.map((r) => appendEvidenceToIncident(r, baseUrl)));
    } catch (err) {
        console.error("getAllIncidents error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// GET by ID
async function getIncidentById(req, res) {
    try {
        const { id } = req.params;
        const baseUrl = req && req.protocol && req.get ? `${req.protocol}://${req.get("host")}` : "";
        const [rows] = await db.query(
            "SELECT * FROM incident_reports WHERE id = ?", [id]
        );
        if (!rows.length) return res.status(404).json({ message: "Not found" });
        res.json(appendEvidenceToIncident(rows[0], baseUrl));
    } catch (err) {
        console.error("getIncidentById error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// CREATE incident
async function createIncident(req, res) {
    try {
        const { user_id, meter_id, category, description } = req.body;

        const [r] = await db.query(
            `INSERT INTO incident_reports 
       (user_id, meter_id, category, description)
       VALUES (?, ?, ?, ?)`, [user_id, meter_id, category, description]
        );

        res.json({ id: r.insertId });
    } catch (err) {
        console.error("createIncident error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// UPDATE status
async function updateIncidentStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, handled_by } = req.body;

        await db.query(
            `UPDATE incident_reports 
       SET status = ?, handled_by = ?, resolved_at = NOW()
       WHERE id = ?`, [status, handled_by, id]
        );

        res.json({ message: "Status updated" });
    } catch (err) {
        console.error("updateIncidentStatus error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

// DELETE incident
async function deleteIncident(req, res) {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM incident_reports WHERE id = ?", [id]);
        res.json({ message: "Incident deleted" });
    } catch (err) {
        console.error("deleteIncident error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

async function getIncidentEvidenceFile(req, res) {
    try {
        const { id, fileName } = req.params;
        const absolutePath = getEvidenceFilePath(id, fileName);

        if (!absolutePath) {
            return res.status(404).json({ message: "Evidence file not found" });
        }

        res.setHeader("Content-Disposition", `inline; filename=\"${fileName}\"`);
        return res.sendFile(absolutePath);
    } catch (err) {
        console.error("getIncidentEvidenceFile error:", err);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
    getAllIncidents,
    getIncidentById,
    createIncident,
    updateIncidentStatus,
    deleteIncident,
    getIncidentEvidenceFile,
};