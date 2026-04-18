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
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./store/auth";
import TopBar from "./components/TopBar.vue";
import Sidebar from "./components/Sidebar.vue";
import { syncThemeFromServer } from "./services/theme";

const auth = useAuthStore();
const router = useRouter();

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
const WARNING_DURATION_MS = 60 * 1000;

const showInactivityWarning = ref(false);
const warningSecondsLeft = ref(60);

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
});

watch(
  () => auth.token,
  (token) => {
    if (token) {
      syncThemeFromServer();
      startInactivityGuard();
      return;
    }

    stopInactivityGuard();
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
});
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

@media (max-width: 520px) {
  .session-warning-actions {
    flex-direction: column;
  }

  .session-warning-actions .btn {
    width: 100%;
  }
}
</style>