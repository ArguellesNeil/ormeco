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

      <button @click="logout" class="logout-btn">
        Logout
      </button>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from "../store/auth";
import { useRouter } from "vue-router";
import { computed } from "vue";
import { useRoute } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

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

const logout = () => {
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
