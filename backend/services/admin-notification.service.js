const db = require("../config/db");

async function listAdminIds() {
    const [rows] = await db.query(
        `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r_ur ON r_ur.id = ur.role_id
      LEFT JOIN roles r_direct ON r_direct.id = u.role_id
      WHERE LOWER(COALESCE(r_ur.name, "")) = 'admin'
         OR LOWER(COALESCE(r_direct.name, "")) = 'admin'
    `
    );

    return (Array.isArray(rows) ? rows : [])
        .map((row) => Number(row.id))
        .filter((id) => Number.isInteger(id) && id > 0);
}

async function notifyAdmins({ title, body }) {
    if (!title || !body) return 0;

    const adminIds = await listAdminIds();
    if (!adminIds.length) return 0;

    let inserted = 0;
    for (const adminId of adminIds) {
        await db.query(
            `INSERT INTO notifications (user_id, title, body, is_read) VALUES (?, ?, ?, 0)`,
            [adminId, String(title), String(body)]
        );
        inserted += 1;
    }

    return inserted;
}

module.exports = {
    notifyAdmins,
};
