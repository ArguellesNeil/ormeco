const pool = require("../db.cjs");

async function ensureAnnouncementAttachmentsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS announcement_attachments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            announcement_id INT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NULL,
            mime_type VARCHAR(120) NULL,
            file_size INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_announcement_attachments_announcement_id (announcement_id)
        )
    `);
}

function mapAttachment(row) {
    const mimeType = row.mime_type || "application/octet-stream";
    return {
        id: Number(row.id),
        file_name: row.file_name,
        original_name: row.original_name || row.file_name,
        mime_type: mimeType,
        file_size: Number(row.file_size || 0),
        file_type: mimeType.startsWith("image/") ? "image" : "file",
        url: `/api/announcements/attachments/${encodeURIComponent(row.file_name)}`,
    };
}

async function getMobileRoleIds(userId) {
    if (Number.isInteger(userId) && userId > 0) {
        const [rows] = await pool.execute(
            `SELECT r.id
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = ?`,
            [userId]
        );

        const ids = (Array.isArray(rows) ? rows : [])
            .map((row) => Number(row.id))
            .filter((id) => Number.isInteger(id) && id > 0);

        if (ids.length) return ids;
    }

    const [memberRows] = await pool.execute("SELECT id FROM roles WHERE name = 'member' LIMIT 1");
    if (Array.isArray(memberRows) && memberRows.length) {
        return [Number(memberRows[0].id)];
    }

    return [];
}

async function getAnnouncements(req, res) {
    const userId = Number.parseInt(String(req.query?.user_id ?? "0"), 10);

    try {
        await ensureAnnouncementAttachmentsTable();

        const roleIds = await getMobileRoleIds(userId);
        const rolePlaceholders = roleIds.map(() => "?").join(",");
        const roleFilter = roleIds.length
            ? `WHERE a.target_role IS NULL OR a.target_role IN (${rolePlaceholders})`
            : "WHERE a.target_role IS NULL";

        const [rows] = await pool.execute(
            `SELECT
                a.id,
                a.title,
                a.body,
                a.target_role,
                a.created_at,
                COALESCE(r.name, 'all') AS target_role_name,
                u.full_name AS created_by_name
             FROM announcements a
             LEFT JOIN roles r ON r.id = a.target_role
             LEFT JOIN users u ON u.id = a.created_by
             ${roleFilter}
             ORDER BY a.created_at DESC, a.id DESC`,
            roleIds
        );

        const announcements = Array.isArray(rows) ? rows : [];
        if (!announcements.length) {
            return res.json({ status: "success", count: 0, announcements: [] });
        }

        const ids = announcements.map((row) => Number(row.id));
        const placeholders = ids.map(() => "?").join(",");
        const [attachmentRows] = await pool.execute(
            `SELECT id, announcement_id, file_name, original_name, mime_type, file_size
             FROM announcement_attachments
             WHERE announcement_id IN (${placeholders})
             ORDER BY id ASC`,
            ids
        );

        const attachmentsByAnnouncement = new Map();
        for (const attachment of Array.isArray(attachmentRows) ? attachmentRows : []) {
            const announcementId = Number(attachment.announcement_id);
            const list = attachmentsByAnnouncement.get(announcementId) || [];
            list.push(mapAttachment(attachment));
            attachmentsByAnnouncement.set(announcementId, list);
        }

        const payload = announcements.map((row) => {
            const attachments = attachmentsByAnnouncement.get(Number(row.id)) || [];
            return {
                id: Number(row.id),
                title: row.title,
                body: row.body,
                target_role: row.target_role == null ? null : Number(row.target_role),
                target_role_name: row.target_role_name || "all",
                created_by_name: row.created_by_name || null,
                created_at: row.created_at,
                attachments,
                images: attachments.filter((item) => item.file_type === "image"),
            };
        });

        return res.json({ status: "success", count: payload.length, announcements: payload });
    } catch (err) {
        return res.json({
            status: "fail",
            message: `Server error: ${err?.message || String(err)}`,
        });
    }
}

module.exports = { getAnnouncements };