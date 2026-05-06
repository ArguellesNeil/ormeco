import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../store/auth";

import Login from "../views/Login.vue";
import Dashboard from "../views/Dashboard.vue";
import Users from "../views/Users.vue";
import Meters from "../views/Meters.vue";
import MeterReadings from "../views/MeterReadings.vue";
import Incidents from "../views/Incidents.vue";
import Benefits from "../views/Benefits.vue";
import BillingRates from "../views/BillingRates.vue";
import Announcements from "../views/Announcements.vue";
import Reports from "../views/Reports.vue";
import SeminarScheduling from "../views/SeminarScheduling.vue";
import BenefitApprovals from "../views/BenefitApprovals.vue";
import NotificationsCenter from "../views/NotificationsCenter.vue";
import SystemSettings from "../views/SystemSettings.vue";

const routes = [
    { path: "/", redirect: "/stats" },
    { path: "/login", component: Login },
    { path: "/stats", component: Dashboard },
    { path: "/users", component: Users },
    { path: "/meters", component: Meters },
    { path: "/meters/readings", component: MeterReadings },
    { path: "/incidents", component: Incidents },
    { path: "/benefits", component: Benefits },
    { path: "/billing-rates", component: BillingRates },
    { path: "/announcements", component: Announcements },
    { path: "/reports", component: Reports },
    { path: "/notifications", component: NotificationsCenter },
    { path: "/system-settings", component: SystemSettings },
    { path: "/seminar-scheduling", component: SeminarScheduling },
    { path: "/benefit-approvals", component: BenefitApprovals }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, from, next) => {
    const auth = useAuthStore();
    const role = String(auth.user && auth.user.role ? auth.user.role : "").toLowerCase();
    const hasAdminSession = !!auth.token && role === "admin";

    if (to.path !== "/login" && !hasAdminSession) {
        auth.logout();
        return next("/login");
    }

    if (to.path === "/login" && hasAdminSession) return next("/stats");
    next();
});

export default router;