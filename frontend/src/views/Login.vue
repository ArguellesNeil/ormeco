<template>
  <div class="login-page">
    <div class="login-brand-panel">
      <div class="brand-pill">ORMECO ADMIN</div>
      <h1>Power your operations with clarity.</h1>
      <p>
        Monitor users, meters, incidents, benefits, seminar schedulings, and billing rates from one secure,
        modern dashboard.
      </p>
    </div>

    <div class="login-card">
      <h2>Welcome Back</h2>
      <p class="login-subtitle">Sign in to continue to the admin dashboard.</p>

      <form @submit.prevent="submit">
        <label class="form-field">
          <span class="form-label">Email</span>
          <input
            v-model="email"
            type="email"
            required
            class="input"
            placeholder="admin@ormeco.com"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Password</span>
          <input
            v-model="password"
            type="password"
            required
            class="input"
            placeholder="Enter your password"
          />
        </label>

        <button
          type="submit"
          :disabled="loading"
          class="btn btn-primary login-btn"
        >
          {{ loading ? "Signing In..." : "Sign In" }}
        </button>

        <p v-if="error" class="error-text">
          {{ error }}
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "../store/auth";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

const auth = useAuthStore();
const router = useRouter();

const submit = async () => {
  loading.value = true;
  error.value = "";

  try {
    await auth.login(email.value, password.value);
    router.push("/stats");
  } catch (e) {
    error.value = e.response?.data?.message || "Login failed";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  width: 100%;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  align-items: stretch;
  background:
    linear-gradient(115deg, rgba(4, 25, 21, 0.68) 0%, rgba(5, 22, 17, 0.45) 45%, rgba(3, 12, 10, 0.74) 100%),
    url("/login-bg.jpg") center center / cover no-repeat;
}

.login-brand-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px;
  color: #f3fbf8;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.brand-pill {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(223, 245, 239, 0.18);
  color: #e8fff8;
  border: 1px solid rgba(223, 245, 239, 0.38);
  backdrop-filter: blur(4px);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin-bottom: 16px;
}

.login-brand-panel h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.1;
}

.login-brand-panel p {
  margin: 16px 0 0 0;
  color: rgba(235, 247, 255, 0.92);
  max-width: 480px;
  font-size: 16px;
}

.login-card {
  margin: auto;
  width: min(420px, calc(100% - 32px));
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(220, 229, 239, 0.74);
  border-radius: 20px;
  box-shadow: 0 24px 50px rgba(6, 20, 16, 0.34);
  backdrop-filter: blur(6px);
  padding: 30px;
}

.login-card h2 {
  margin: 0;
  font-size: 26px;
}

.login-subtitle {
  margin: 8px 0 18px 0;
  color: #5f738f;
  font-size: 14px;
}

.login-btn {
  width: 100%;
  margin-top: 6px;
}

.error-text {
  margin-top: 10px;
  color: #d64545;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
}

:global(html.ormeco-dark) .login-page {
  background:
    linear-gradient(115deg, rgba(4, 25, 21, 0.68) 0%, rgba(5, 22, 17, 0.45) 45%, rgba(3, 12, 10, 0.74) 100%),
    url("/login-bg.jpg") center center / cover no-repeat !important;
}

:global(html.ormeco-dark) .login-card {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(220, 229, 239, 0.74) !important;
  box-shadow: 0 24px 50px rgba(6, 20, 16, 0.34) !important;
  color: #1b3555 !important;
}

:global(html.ormeco-dark) .login-card h2,
:global(html.ormeco-dark) .login-subtitle,
:global(html.ormeco-dark) .login-page .form-label {
  color: #1b3555 !important;
}

:global(html.ormeco-dark) .login-page .input,
:global(html.ormeco-dark) .login-page input {
  background: #ffffff !important;
  color: #1c3555 !important;
  border-color: #d3dfed !important;
}

:global(html.ormeco-dark) .login-page input::placeholder {
  color: #7a8da8 !important;
}

@media (max-width: 950px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 16px;
    background-position: 52% center;
  }

  .login-brand-panel {
    padding: 18px 10px 8px;
  }

  .login-card {
    margin: 0 auto 24px;
  }
}
</style>
