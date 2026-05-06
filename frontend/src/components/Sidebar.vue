<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">
        <img
          src="/ormeconnect-logo.jpg"
          alt="ORMEConnect system logo"
          class="brand-logo"
        />
      </div>
      <div class="brand-copy">
        <span class="brand-name">ORMEConnect</span>
        <p class="brand-sub">Admin Console</p>
      </div>
    </div>

    <nav class="nav-menu">
      <router-link
        v-for="item in menu"
        :key="item.to"
        :to="item.to"
        class="nav-link"
        :class="[{ 'nav-link-active': isActive(item.to) }, `tone-${item.tone}`]"
      >
        <span class="nav-icon" aria-hidden="true">
          <svg
            class="nav-icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              v-for="(d, idx) in item.iconPaths"
              :key="`${item.to}-icon-${idx}`"
              :d="d"
            />
          </svg>
          <span
            v-if="item.to === '/notifications' && unreadNotifications > 0"
            class="nav-notification-badge"
          >
            {{ toBadgeText(unreadNotifications) }}
          </span>
        </span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <span>Operations Workspace</span>
    </div>
  </aside>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../api";

const route = useRoute();
const unreadNotifications = ref(0);
let unreadPollTimer = null;

const toBadgeText = (count) => {
  if (count > 99) return "99+";
  return String(count);
};

const setUnreadFromValue = (value) => {
  const parsed = Number(value);
  unreadNotifications.value = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const loadUnreadNotifications = async () => {
  try {
    const { data } = await api.get("/notifications", {
      params: {
        status: "unread",
        limit: 500,
      },
    });

    if (typeof data?.summary?.unread !== "undefined") {
      setUnreadFromValue(data.summary.unread);
      return;
    }

    setUnreadFromValue(Array.isArray(data?.items) ? data.items.length : 0);
  } catch (_err) {
    setUnreadFromValue(0);
  }
};

const handleNotificationsUpdated = (event) => {
  if (event && event.detail && typeof event.detail.unread !== "undefined") {
    setUnreadFromValue(event.detail.unread);
    return;
  }

  loadUnreadNotifications();
};

const menu = [
  {
    label: "Dashboard",
    to: "/stats",
    tone: "teal",
    iconPaths: ["M4 19V10", "M10 19V5", "M16 19V13", "M22 19V8"]
  },
  {
    label: "Users",
    to: "/users",
    tone: "indigo",
    iconPaths: [
      "M9 11C7.34 11 6 9.66 6 8C6 6.34 7.34 5 9 5C10.66 5 12 6.34 12 8C12 9.66 10.66 11 9 11Z",
      "M15 10C13.9 10 13 9.1 13 8C13 6.9 13.9 6 15 6C16.1 6 17 6.9 17 8C17 9.1 16.1 10 15 10Z",
      "M4 19C4 16.79 6.24 15 9 15C11.76 15 14 16.79 14 19",
      "M14 19C14.22 17.6 15.56 16.5 17.2 16.5C18.84 16.5 20.18 17.6 20.4 19"
    ]
  },
  { label: "Meters", to: "/meters", tone: "amber", iconPaths: ["M13 3L6 13H11L10 21L18 10H13L13 3Z"] },
  {
    label: "Meter Readings",
    to: "/meters/readings",
    tone: "amber",
    iconPaths: ["M5 5H19V19H5V5Z", "M8 14L10.8 11.2L13 13.4L16 10.4", "M8 8H16"]
  },
  {
    label: "Incidents",
    to: "/incidents",
    tone: "orange",
    iconPaths: ["M12 4L21 20H3L12 4Z", "M12 10V14", "M12 17H12.01"]
  },
  {
    label: "Announcements",
    to: "/announcements",
    tone: "rose",
    iconPaths: ["M3 13V11", "M5 11L13 7V17L5 13Z", "M13 10H16C17.66 10 19 11.34 19 13V17", "M5 13V19"]
  },
  {
    label: "Notifications",
    to: "/notifications",
    tone: "gold",
    iconPaths: ["M8 18H16", "M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18", "M6 16V11C6 7.69 8.69 5 12 5C15.31 5 18 7.69 18 11V16L20 18H4L6 16Z"]
  },
  {
    label: "Seminar Scheduling",
    to: "/seminar-scheduling",
    tone: "blue",
    iconPaths: ["M7 3V6", "M17 3V6", "M4 9H20", "M6 5H18C19.1 5 20 5.9 20 7V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V7C4 5.9 4.9 5 6 5Z"]
  },
  {
    label: "Benefits",
    to: "/benefits",
    tone: "violet",
    iconPaths: [
      "M4 10H20V20H4V10Z",
      "M12 10V20",
      "M4 14H20",
      "M12 10C10.2 10 8.5 8.8 8.5 7.2C8.5 5.9 9.5 5 10.8 5C11.6 5 12.3 5.4 12 6.3",
      "M12 10C13.8 10 15.5 8.8 15.5 7.2C15.5 5.9 14.5 5 13.2 5C12.4 5 11.7 5.4 12 6.3"
    ]
  },
  { label: "Benefit Approvals", to: "/benefit-approvals", tone: "mint", iconPaths: ["M4 12L9 17L20 6"] },
  { label: "Billing Rates", to: "/billing-rates", tone: "emerald", iconPaths: ["M4 7H20V17H4V7Z", "M8 12H16", "M12 10V14"] },
  {
    label: "Reports & Analytics",
    to: "/reports",
    tone: "slate",
    iconPaths: ["M7 3H14L19 8V21H7V3Z", "M14 3V8H19", "M10 13H16", "M10 17H16"]
  },
  {
    label: "System Settings",
    to: "/system-settings",
    tone: "steel",
    iconPaths: [
      "M21 4H14",
      "M10 4H3",
      "M21 12H12",
      "M8 12H3",
      "M21 20H16",
      "M12 20H3",
      "M14 2V6",
      "M8 10V14",
      "M16 18V22"
    ]
  }
];

const isActive = (path) => route.path === path;

onMounted(() => {
  loadUnreadNotifications();

  unreadPollTimer = window.setInterval(() => {
    loadUnreadNotifications();
  }, 60000);

  window.addEventListener("ormeco:notifications-updated", handleNotificationsUpdated);
});

watch(
  () => route.path,
  () => {
    loadUnreadNotifications();
  }
);

onBeforeUnmount(() => {
  if (unreadPollTimer) {
    window.clearInterval(unreadPollTimer);
    unreadPollTimer = null;
  }

  window.removeEventListener("ormeco:notifications-updated", handleNotificationsUpdated);
});
</script>

<style scoped>
.sidebar {
  width: 272px;
  height: calc(100vh - 84px);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-right: 1px solid #dce5ef;
  display: flex;
  flex-direction: column;
  padding: 18px 14px 14px;
  gap: 14px;
  position: fixed;
  left: 0;
  top: 84px;
  z-index: 95;
  overflow-y: auto;
  box-shadow: 6px 0 24px rgba(16, 35, 62, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 13px;
  border: 1px solid #c8d8ea;
  border-radius: 18px;
  background: linear-gradient(180deg, #f6f8fb 0%, #f0f4f8 100%);
  box-shadow: 0 10px 22px rgba(16, 35, 62, 0.08);
  min-height: 72px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.brand:hover {
  transform: translateY(-1px);
  border-color: #a9c2de;
  box-shadow: 0 14px 26px rgba(16, 35, 62, 0.11);
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #ffffff;
  border: 1px solid #d7e2ee;
  box-shadow: 0 10px 18px rgba(16, 35, 62, 0.13);
  flex-shrink: 0;
}

.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  object-fit: cover;
}

.brand-copy {
  min-width: 0;
}

.brand-name {
  display: block;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #2e4f73;
  line-height: 1.2;
  white-space: nowrap;
}

.brand-sub {
  margin: 1px 0 0 0;
  font-size: 14px;
  color: #47678a;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-link {
  --tone: #4a617d;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  color: #314a68;
  background: transparent;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  position: relative;
}

.nav-link:hover {
  background: #f2f8ff;
  border-color: #d8e4f3;
  transform: translateX(1px);
}

.nav-link-active {
  background: #e9f7f3;
  color: var(--tone);
  border-color: #bfe8db;
}

.nav-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--tone);
  background: transparent;
  box-shadow: none;
  border: none;
  transition: color 0.2s ease;
  overflow: visible;
  position: relative;
  flex-shrink: 0;
}

.nav-notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #d53434;
  color: #ffffff;
  border: 1px solid #ffffff;
  font-size: 10px;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 6px 12px rgba(179, 34, 34, 0.3);
  z-index: 3;
}

.nav-icon::after {
  content: none;
}

.nav-icon-svg {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.5));
  transition: transform 0.2s ease, filter 0.2s ease;
}

.nav-icon-svg path {
  stroke: currentColor;
  stroke-width: 2.05;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  transition: stroke 0.2s ease, stroke-width 0.2s ease;
}

.nav-label {
  flex: 1;
}

.nav-link::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: #0f8b6f;
  border-radius: 0 2px 2px 0;
  transition: height 0.15s ease;
}

.nav-link-active::before {
  height: 60%;
}

.nav-link-active .nav-icon {
  background: transparent;
  box-shadow: none;
}

.nav-link-active .nav-icon-svg {
  animation: navIconPulse 2.8s ease-in-out infinite;
  filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--tone) 28%, transparent));
}

.nav-link-active .nav-icon-svg path {
  stroke-width: 2.2;
}

.nav-link:hover .nav-icon {
  background: transparent;
}

.nav-link:hover .nav-icon-svg path {
  stroke-width: 2.3;
}

.nav-link:hover .nav-icon-svg {
  transform: translateY(-1px) scale(1.08);
  filter: drop-shadow(0 6px 12px color-mix(in srgb, var(--tone) 24%, transparent));
}

.tone-teal { --tone: #0f8b6f; }
.tone-indigo { --tone: #4f5fa8; }
.tone-amber { --tone: #ca8a04; }
.tone-orange { --tone: #d97706; }
.tone-rose { --tone: #be3d6e; }
.tone-gold { --tone: #b8871f; }
.tone-blue { --tone: #2f6ea8; }
.tone-violet { --tone: #6f51c6; }
.tone-mint { --tone: #1f8b77; }
.tone-emerald { --tone: #1f7a5a; }
.tone-slate { --tone: #4e647d; }
.tone-steel { --tone: #5d6f86; }

@keyframes navIconPulse {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-1px) scale(1.08);
  }
}

.sidebar-footer {
  margin-top: auto;
  border: 1px solid #dce5ef;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  color: #5f738f;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .sidebar {
    width: 86px;
    height: calc(100vh - 72px);
    top: 72px;
    padding: 10px;
  }

  .brand-sub,
  .brand-name,
  .nav-label,
  .sidebar-footer {
    display: none;
  }

  .brand {
    justify-content: center;
    padding: 8px;
  }

  .nav-link {
    justify-content: center;
    padding: 11px 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-link,
  .nav-icon,
  .nav-icon-svg path {
    transition: none;
  }

  .nav-link-active .nav-icon {
    animation: none;
  }
}
</style>