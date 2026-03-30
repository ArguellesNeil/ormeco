<template>
  <div class="login-page">
    <div class="login-brand-panel">
      <div class="brand-pill">ORMECO ADMIN</div>
      <h1>Power your operations with clarity.</h1>
      <p>
        Monitor users, meters, incidents, benefits, and billing from one secure,
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
    radial-gradient(circle at 20% 20%, #dff5ef 0%, transparent 42%),
    radial-gradient(circle at 100% 0%, #ffe9d8 0%, transparent 34%),
    #eef4fa;
}

.login-brand-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px;
  color: #10233e;
}

.brand-pill {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 999px;
  background: #dff5ef;
  color: #0b6a55;
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
  color: #4d6380;
  max-width: 480px;
  font-size: 16px;
}

.login-card {
  margin: auto;
  width: min(420px, calc(100% - 32px));
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dce5ef;
  border-radius: 20px;
  box-shadow: 0 24px 50px rgba(16, 35, 62, 0.16);
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

@media (max-width: 950px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .login-brand-panel {
    padding: 18px 10px 8px;
  }

  .login-card {
    margin: 0 auto 24px;
  }
}
</style>
