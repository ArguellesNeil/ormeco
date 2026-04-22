<template>
  <header class="topbar">
    <div class="topbar-left">
      <h1 class="title">{{ pageTitle }}</h1>
      <p class="subtitle">Operational overview and management</p>
    </div>

    <div class="topbar-center">
      <span class="status-badge"><span class="dot"></span> System Live</span>
    </div>

    <div class="topbar-right">
      <div v-if="auth.user" class="user-info">
        <div class="user-avatar">
          {{ getInitials(auth.user.full_name) }}
        </div>
        <span class="user-name">{{ auth.user.full_name }}</span>
      </div>

      <button type="button" @click="openLogoutConfirm" class="logout-btn">
        Logout
      </button>
    </div>
  </header>

  <div
    v-if="showLogoutConfirm"
    class="modal-overlay logout-confirm-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Logout confirmation"
    @click.self="closeLogoutConfirm"
  >
    <div class="modal-panel glass-soft logout-confirm-panel">
      <span class="logout-confirm-chip">Session</span>
      <h3 class="modal-title logout-confirm-title">Are you sure you want to logout?</h3>
      <p class="logout-confirm-message">
        You will need to sign in again to continue managing the system.
      </p>
      <div class="modal-actions logout-confirm-actions">
        <button type="button" class="btn btn-secondary" @click="closeLogoutConfirm">No</button>
        <button type="button" class="btn btn-primary logout-confirm-yes" @click="confirmLogout">Yes</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "../store/auth";
import { useRouter } from "vue-router";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const showLogoutConfirm = ref(false);

const pageTitle = computed(() => {
  const map = {
    "/stats": "Dashboard",
    "/users": "Users",
    "/meters": "Meters",
    "/incidents": "Incidents",
    "/announcements": "Announcements",
    "/notifications": "Notifications & Alerts",
    "/seminar-scheduling": "Seminar Scheduling",
    "/reports": "Reports",
    "/system-settings": "System Settings & Configuration",
    "/benefits": "Benefits",
    "/benefit-approvals": "Benefit Approvals",
    "/billing-rates": "Billing Rates"
  };
  return map[route.path] || "Dashboard";
});

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const openLogoutConfirm = () => {
  showLogoutConfirm.value = true;
};

const closeLogoutConfirm = () => {
  showLogoutConfirm.value = false;
};

const confirmLogout = () => {
  showLogoutConfirm.value = false;
  auth.logout();
  router.push("/login");
};
</script>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.82);
  color: #10233e;
  padding: 14px 22px;
  border-bottom: 1px solid #dce5ef;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 84px;
  z-index: 120;
}

.title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 2px 0;
}

.subtitle {
  margin: 0;
  color: #6b809b;
  font-size: 12px;
  font-weight: 600;
}

.topbar-center {
  margin-left: auto;
  margin-right: 10px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 6px 10px;
  border: 1px solid #cfe8dc;
  background: #ecfaf5;
  color: #176a54;
  font-size: 12px;
  font-weight: 800;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #17a57f;
  box-shadow: 0 0 0 0 rgba(23, 165, 127, 0.55);
  animation: ping 1.8s infinite;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 10px;
  background: #f7fafc;
  border: 1px solid #dce5ef;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0f8b6f 0%, #13a57f 100%);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  color: #10233e;
  border: 1px solid #dce5ef;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.logout-btn:hover {
  background: #f2f8ff;
  border-color: #cddced;
}

.logout-btn:active {
  background: #ebf3fb;
}

.logout-confirm-overlay {
  z-index: 1600;
}

.logout-confirm-panel {
  width: min(460px, 92vw);
  border-radius: 18px;
}

.logout-confirm-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid #bde5cd;
  background: #e9f9f0;
  color: #1c7f53;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
}

.logout-confirm-title {
  margin: 14px 0 8px 0;
  font-size: 22px;
}

.logout-confirm-message {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.55;
}

.logout-confirm-actions {
  justify-content: stretch;
}

.logout-confirm-actions .btn {
  flex: 1;
  min-height: 42px;
}

.logout-confirm-yes {
  box-shadow: 0 10px 22px rgba(15, 139, 111, 0.26);
}

.logout-confirm-yes:hover {
  box-shadow: 0 13px 26px rgba(15, 139, 111, 0.33);
}

:global(html.ormeco-dark) .logout-confirm-overlay {
  background: rgba(4, 10, 20, 0.48);
}

:global(html.ormeco-dark) .logout-confirm-chip {
  color: #74e8c9;
  background: rgba(41, 201, 163, 0.16);
  border-color: rgba(41, 201, 163, 0.42);
}

@keyframes ping {
  0% {
    box-shadow: 0 0 0 0 rgba(23, 165, 127, 0.55);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(23, 165, 127, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(23, 165, 127, 0);
  }
}

@media (max-width: 900px) {
  .subtitle,
  .user-name,
  .topbar-center {
    display: none;
  }

  .topbar {
    padding: 12px 14px;
    height: 72px;
  }
}
</style>
