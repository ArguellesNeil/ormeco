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
</template>

<script setup>
import { onMounted, watch } from "vue";
import { useAuthStore } from "./store/auth";
import TopBar from "./components/TopBar.vue";
import Sidebar from "./components/Sidebar.vue";
import { syncThemeFromServer } from "./services/theme";

const auth = useAuthStore();

onMounted(() => {
  if (auth.token) syncThemeFromServer();
});

watch(
  () => auth.token,
  (token) => {
    if (token) syncThemeFromServer();
  }
);
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
</style>