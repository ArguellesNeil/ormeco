import { defineStore } from "pinia";
import api from "../api";

function normalizeSessionTimeoutMinutes(value) {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return 30;
    return Math.min(720, Math.max(5, Math.trunc(minutes)));
}

export const useAuthStore = defineStore("auth", {
    state: () => ({
        token: localStorage.getItem("token") || "",
        user: JSON.parse(localStorage.getItem("user") || "null"),
        sessionTimeoutMinutes: normalizeSessionTimeoutMinutes(localStorage.getItem("sessionTimeoutMinutes") || 30)
    }),
    actions: {
        async login(email, password) {
            const { data } = await api.post("/auth/login", { email, password });
            const role = String(data && data.user && data.user.role ? data.user.role : "").toLowerCase();
            if (role !== "admin") {
                throw new Error("Admin role required");
            }
            this.token = data.token;
            this.user = data.user;
            this.sessionTimeoutMinutes = normalizeSessionTimeoutMinutes(
                data && data.security && data.security.session_timeout_minutes
            );
            localStorage.setItem("token", this.token);
            localStorage.setItem("user", JSON.stringify(this.user));
            localStorage.setItem("sessionTimeoutMinutes", String(this.sessionTimeoutMinutes));
        },
        logout() {
            this.token = "";
            this.user = null;
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("sessionTimeoutMinutes");
        }
    }
});