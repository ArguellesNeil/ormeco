// backend/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    const header = req.headers["authorization"];
    if (!header) {
        return res.status(401).json({ message: "No authorization header" });
    }

    const parts = header.split(" ");
    const token = parts.length === 2 ? parts[1] : null;

    if (!token) {
        return res.status(401).json({ message: "Token missing" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Normalize token payloads: support tokens that use `id` or `user_id`.
        // e.g. admin tokens: { id, email, role }
        // mobile QR tokens: { user_id, role, member_code }
        const normalized = Object.assign({}, decoded, { id: decoded.id || decoded.user_id });
        req.user = normalized;
        next();
    } catch (err) {
        const isExpired = err && err.name === "TokenExpiredError";
        const message = isExpired ? "Token expired" : "Invalid token";

        // Keep logs concise and avoid flooding the console with stack traces.
        console.warn("JWT verify error:", message);
        return res.status(401).json({ message });
    }
}

module.exports = { authMiddleware };