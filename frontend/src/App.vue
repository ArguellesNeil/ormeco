<template>
  <div v-if="auth.token" class="app-layout">
    <TopBar />
    <div class="app-body">
      <Sidebar />
      <main class="app-content">
        <div class="content-veil"></div>
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
  <div v-else class="auth-layout">
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>

  <div v-if="auth.token && showInactivityWarning" class="session-warning-backdrop">
    <div class="session-warning-modal" role="alertdialog" aria-live="assertive" aria-modal="true">
      <h3>Inactivity Detected</h3>
      <p>
        Magla-logout ka in
        <strong>{{ warningSecondsLeft }}</strong>
        second<span v-if="warningSecondsLeft !== 1">s</span>
        due to inactivity.
      </p>
      <div class="session-warning-actions">
        <button type="button" class="btn btn-primary" @click="stayLoggedIn">Stay Logged In</button>
        <button type="button" class="btn" @click="performAutoLogout">Logout Now</button>
      </div>
    </div>
  </div>
  <div v-if="showMaintenanceModal" class="maintenance-backdrop">
    <div class="maintenance-modal" role="alertdialog" aria-live="assertive" aria-modal="true">
      <h3>Scheduled Maintenance</h3>
      <p class="maintenance-message">{{ maintenanceInfo.message }}</p>
      <p v-if="maintenanceInfo.estimatedEndTime" class="maintenance-eta">
        Expected back: {{ new Date(maintenanceInfo.estimatedEndTime).toLocaleString() }}
      </p>
      <div class="maintenance-actions">
        <button class="btn btn-primary" @click="checkMaintenanceStatus">Retry Status</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./store/auth";
import api from "./api";
import TopBar from "./components/TopBar.vue";
import Sidebar from "./components/Sidebar.vue";
import { syncThemeFromServer } from "./services/theme";

const auth = useAuthStore();
const router = useRouter();

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
const WARNING_DURATION_MS = 60 * 1000;

const showInactivityWarning = ref(false);
const warningSecondsLeft = ref(60);
const showMaintenanceModal = ref(false);
const maintenanceInfo = ref({ message: "", startTime: null, estimatedEndTime: null });
const isMobileClient = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|Mobile|Cordova|Capacitor/i.test(navigator.userAgent || "");

let inactivityTimerId = null;
let warningTimerId = null;
let warningCountdownId = null;
let listenersAttached = false;
let lastResetAt = 0;

const getInactivityTimeoutMs = () => {
  const minutes = Number(auth.sessionTimeoutMinutes || 30);
  const safeMinutes = Number.isFinite(minutes) ? Math.min(720, Math.max(5, minutes)) : 30;
  return Math.trunc(safeMinutes * 60 * 1000);
};

const clearInactivityTimer = () => {
  if (inactivityTimerId) {
    window.clearTimeout(inactivityTimerId);
    inactivityTimerId = null;
  }
};

const clearWarningTimer = () => {
  if (warningTimerId) {
    window.clearTimeout(warningTimerId);
    warningTimerId = null;
  }
};

const clearWarningCountdown = () => {
  if (warningCountdownId) {
    window.clearInterval(warningCountdownId);
    warningCountdownId = null;
  }
};

const hideInactivityWarning = () => {
  showInactivityWarning.value = false;
  clearWarningCountdown();
};

const showWarningWithCountdown = (seconds) => {
  const initialSeconds = Math.max(1, Math.ceil(seconds));
  warningSecondsLeft.value = initialSeconds;
  showInactivityWarning.value = true;

  clearWarningCountdown();
  warningCountdownId = window.setInterval(() => {
    warningSecondsLeft.value = Math.max(0, warningSecondsLeft.value - 1);
    if (warningSecondsLeft.value <= 0) {
      clearWarningCountdown();
    }
  }, 1000);
};

const performAutoLogout = async () => {
  if (!auth.token) return;
  hideInactivityWarning();
  auth.logout();
  if (router.currentRoute.value.path !== "/login") {
    await router.push("/login");
  }
};

const stayLoggedIn = () => {
  if (!auth.token) return;
  scheduleInactivityLogout();
};

const scheduleInactivityLogout = () => {
  if (!auth.token) return;

  hideInactivityWarning();
  clearInactivityTimer();
  clearWarningTimer();

  const timeoutMs = getInactivityTimeoutMs();
  const warningDelayMs = timeoutMs - WARNING_DURATION_MS;

  if (warningDelayMs <= 0) {
    showWarningWithCountdown(timeoutMs / 1000);
  } else {
    warningTimerId = window.setTimeout(() => {
      showWarningWithCountdown(WARNING_DURATION_MS / 1000);
    }, warningDelayMs);
  }

  inactivityTimerId = window.setTimeout(performAutoLogout, timeoutMs);
  lastResetAt = Date.now();
};

const onUserActivity = () => {
  if (!auth.token) return;

  if (showInactivityWarning.value) {
    scheduleInactivityLogout();
    return;
  }

  const now = Date.now();
  // Throttle high-frequency events like mousemove.
  if (now - lastResetAt < 1000) return;
  scheduleInactivityLogout();
};

const addActivityListeners = () => {
  if (listenersAttached || typeof window === "undefined") return;
  ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, onUserActivity, { passive: true }));
  listenersAttached = true;
};

const removeActivityListeners = () => {
  if (!listenersAttached || typeof window === "undefined") return;
  ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, onUserActivity));
  listenersAttached = false;
};

const startInactivityGuard = () => {
  if (!auth.token) return;
  addActivityListeners();
  scheduleInactivityLogout();
};

const stopInactivityGuard = () => {
  hideInactivityWarning();
  clearInactivityTimer();
  clearWarningTimer();
  removeActivityListeners();
};

onMounted(() => {
  if (auth.token) {
    syncThemeFromServer();
    startInactivityGuard();
  }
  // Only run maintenance checks for unauthenticated mobile clients
  if (!auth.token && isMobileClient) {
    checkMaintenanceStatus();
    startMaintenancePoll();
  }
});

watch(
  () => auth.token,
  (token) => {
    if (token) {
      syncThemeFromServer();
      startInactivityGuard();
      // stop maintenance polling when admin logs in
      stopMaintenancePoll();
      showMaintenanceModal.value = false;
      return;
    }

    stopInactivityGuard();
    // start maintenance polling when signed out (login screen) only on mobile clients
    if (isMobileClient) {
      checkMaintenanceStatus();
      startMaintenancePoll();
    }
  }
);

watch(
  () => auth.sessionTimeoutMinutes,
  () => {
    if (auth.token) {
      scheduleInactivityLogout();
    }
  }
);

onBeforeUnmount(() => {
  stopInactivityGuard();
  stopMaintenancePoll();
});

// Maintenance polling logic
let maintenanceIntervalId = null;
const MAINTENANCE_POLL_MS = 5000;

async function checkMaintenanceStatus() {
  try {
    const resp = await api.get("/mobile/check-maintenance");
    // If service returns 200 ok, ensure modal is hidden
    // Only hide/show modal for unauthenticated mobile clients
    if (!auth.token && isMobileClient) showMaintenanceModal.value = false;
    maintenanceInfo.value = { message: "", startTime: null, estimatedEndTime: null };
  } catch (err) {
    const status = err && err.response && err.response.status;
    if (status === 503) {
      const data = (err.response && err.response.data) || {};
      if (!auth.token && isMobileClient) showMaintenanceModal.value = true;
      maintenanceInfo.value = {
        message: data.message || "The mobile app is under maintenance",
        startTime: data.startTime || data.maintenance && data.maintenance.startTime || null,
        estimatedEndTime:
          data.estimatedEndTime || (data.maintenance && data.maintenance.estimatedEndTime) || null,
      };
      // Do not force admin logout; admin panel should remain usable during maintenance.
    }
  }
}

function startMaintenancePoll() {
  stopMaintenancePoll();
  maintenanceIntervalId = window.setInterval(checkMaintenanceStatus, MAINTENANCE_POLL_MS);
}

function stopMaintenancePoll() {
  if (maintenanceIntervalId) {
    window.clearInterval(maintenanceIntervalId);
    maintenanceIntervalId = null;
  }
}
</script>

<style>
.app-layout {
  --topbar-height: 84px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.app-body {
  display: block;
  flex: 1;
  min-height: 0;
  padding-top: var(--topbar-height);
}

.app-content {
  position: relative;
  margin-left: 272px;
  min-height: calc(100vh - var(--topbar-height));
  overflow-y: auto;
  background: transparent;
  transition: margin-left 0.2s ease;
}

.content-veil {
  position: sticky;
  top: 0;
  z-index: 0;
  height: 1px;
}

.auth-layout {
  min-height: 100vh;
  background: transparent;
}

@media (max-width: 900px) {
  .app-layout {
    --topbar-height: 72px;
  }

  .app-content {
    margin-left: 86px;
  }
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.session-warning-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(10, 26, 48, 0.38);
  display: grid;
  place-items: center;
  padding: 16px;
}

.session-warning-modal {
  width: min(420px, calc(100vw - 32px));
  background: #ffffff;
  border: 1px solid #d7e2ef;
  border-radius: 16px;
  box-shadow: 0 22px 48px rgba(16, 35, 62, 0.26);
  padding: 22px;
}

.session-warning-modal h3 {
  margin: 0;
  color: #10233e;
}

.session-warning-modal p {
  margin: 10px 0 0;
  color: #3c526f;
}

.session-warning-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.maintenance-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(8, 14, 26, 0.6);
  display: grid;
  place-items: center;
  padding: 20px;
}

.maintenance-modal {
  width: min(520px, calc(100vw - 32px));
  background: #ffffff;
  border: 1px solid #d7e2ef;
  border-radius: 14px;
  box-shadow: 0 30px 80px rgba(6, 20, 35, 0.5);
  padding: 24px;
  text-align: center;
}

.maintenance-modal h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #0f2942;
}

.maintenance-message {
  color: #2f4359;
  margin: 8px 0 12px 0;
}

.maintenance-eta {
  color: #536b84;
  font-size: 13px;
  margin-bottom: 14px;
}

.maintenance-actions { display:flex; justify-content:center }

@media (max-width: 520px) {
  .session-warning-actions {
    flex-direction: column;
  }

  .session-warning-actions .btn {
    width: 100%;
  }
}
</style>