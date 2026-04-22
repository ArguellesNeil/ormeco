const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { getSecurityPolicies } = require("../services/security-policy.service");
const { logAuditEvent } = require("../services/audit-log.service");
require("dotenv").config();

exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        const [rows] = await db.query(
            `SELECT u.id, u.email, u.full_name, r.name AS role_name
             FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN roles r       ON r.id = ur.role_id
             WHERE u.email = ?
                 AND u.password_hash = SHA2(?, 256)
                 AND u.is_active = 1
                 AND LOWER(r.name) = 'admin'
             LIMIT 1`, [email, password]
        );

        if (!rows.length) {
            await logAuditEvent({
                req,
                actionType: "login",
                action: "admin_login_failed",
                entityType: "auth",
                details: { email: String(email || "") },
            });
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];
        const policies = await getSecurityPolicies();
        const sessionTimeoutMinutes = Number(policies.sessionTimeoutMinutes || 30);
        const fallbackTokenTtlSeconds = Math.max(3600, sessionTimeoutMinutes * 60 * 24);
        const adminJwtExpiresIn = process.env.ADMIN_JWT_EXPIRES_IN || fallbackTokenTtlSeconds;
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role_name },
            process.env.JWT_SECRET, { expiresIn: adminJwtExpiresIn }
        );

        await logAuditEvent({
            req,
            userId: user.id,
            actionType: "login",
            action: "admin_login_success",
            entityType: "auth",
            entityId: user.id,
            targetUserId: user.id,
            details: { email: user.email },
        });

        return res.json({
            token,
            user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role_name },
            security: {
                session_timeout_minutes: sessionTimeoutMinutes,
                admin_2fa_policy_enabled: !!policies.enforceAdmin2FA,
            },
        });

    } catch (err) {
        console.error("auth login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};