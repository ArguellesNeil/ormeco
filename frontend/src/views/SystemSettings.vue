<template>
  <div class="settings-page" :class="{ 'theme-dark': settings.appearance.darkModeEnabled }">
    <div class="bg-orb orb-a" />
    <div class="bg-orb orb-b" />

    <header class="hero">
      <div>
        <p class="kicker">Administration</p>
        <h2 class="page-title">System Settings & Configuration</h2>
        <p class="page-subtitle">
          A single control center for templates, notifications, thresholds, security policies, benefit types, and billing rates.
        </p>
      </div>
      <div class="hero-actions">
        <label class="theme-switch" title="Enable dark mode for this settings workspace">
          <input v-model="settings.appearance.darkModeEnabled" type="checkbox" />
          <span class="switch-track">
            <span class="switch-dot" />
          </span>
          <span class="switch-label">Dark Mode</span>
        </label>

        <button class="btn btn-primary" :disabled="savingSettings" @click="saveSettings">
          {{ savingSettings ? "Saving changes..." : "Save All Settings" }}
        </button>
      </div>
    </header>

    <section class="quick-stats">
      <article class="stat-card">
        <p>Benefit Types</p>
        <strong>{{ benefits.length }}</strong>
      </article>
      <article class="stat-card">
        <p>Billing Rates</p>
        <strong>{{ billingRates.length }}</strong>
      </article>
      <article class="stat-card">
        <p>Alert Baseline</p>
        <strong>{{ settings.thresholds.incidentsPerDayAlert }}/day</strong>
      </article>
    </section>

    <section class="settings-grid">
      <article class="panel">
        <div class="panel-header">
          <h3>Email Templates</h3>
          <span class="chip">Comms</span>
        </div>

        <label class="field">
          <span>Benefit Application Status</span>
          <textarea v-model="settings.emailTemplates.benefitApproval" rows="3" />
        </label>

        <label class="field">
          <span>Incident Acknowledgement</span>
          <textarea v-model="settings.emailTemplates.incidentAcknowledgement" rows="3" />
        </label>

        <label class="field">
          <span>Seminar Reminder</span>
          <textarea v-model="settings.emailTemplates.seminarReminder" rows="3" />
        </label>

        <p class="hint">
          Placeholders: <code v-pre>{{name}}</code>, <code v-pre>{{status}}</code>,
          <code v-pre>{{seminar_date}}</code>.
        </p>
      </article>

      <article class="panel">
        <div class="panel-header">
          <h3>Notification Preferences</h3>
          <span class="chip">Alerts</span>
        </div>

        <label class="toggle-row">
          <input v-model="settings.notificationPreferences.emailEnabled" type="checkbox" />
          <span>Email notifications enabled</span>
        </label>

        <label class="toggle-row">
          <input v-model="settings.notificationPreferences.smsEnabled" type="checkbox" />
          <span>SMS notifications enabled</span>
        </label>

        <label class="toggle-row">
          <input v-model="settings.notificationPreferences.inAppEnabled" type="checkbox" />
          <span>In-app alerts enabled</span>
        </label>

        <label class="field">
          <span>Admin Contact Number</span>
          <input
            v-model="settings.notificationPreferences.adminContactNumber"
            type="text"
            placeholder="e.g. +639171234567"
          />
        </label>
      </article>

      <article class="panel">
        <div class="panel-header">
          <h3>System Thresholds</h3>
          <span class="chip">Monitoring</span>
        </div>

        <label class="field">
          <span>Incidents per Day Alert</span>
          <input v-model.number="settings.thresholds.incidentsPerDayAlert" type="number" min="1" />
        </label>

        <label class="field">
          <span>Benefits per Day Alert</span>
          <input v-model.number="settings.thresholds.benefitsPerDayAlert" type="number" min="1" />
        </label>

        <label class="field">
          <span>High Bill Amount Alert</span>
          <input v-model.number="settings.thresholds.highBillAmount" type="number" min="1" step="0.01" />
        </label>

        <label class="field">
          <span>Seminar Alert Window (days)</span>
          <input v-model.number="settings.thresholds.seminarWindowDays" type="number" min="1" />
        </label>
      </article>

      <article class="panel">
        <div class="panel-header">
          <h3>Security Policies</h3>
          <span class="chip">Security</span>
        </div>

        <label class="field">
          <span>Minimum Password Length</span>
          <input v-model.number="settings.securityPolicies.minPasswordLength" type="number" min="6" max="128" />
        </label>

        <label class="toggle-row">
          <input v-model="settings.securityPolicies.requireUppercase" type="checkbox" />
          <span>Require uppercase characters</span>
        </label>

        <label class="toggle-row">
          <input v-model="settings.securityPolicies.requireNumber" type="checkbox" />
          <span>Require numeric characters</span>
        </label>

        <label class="toggle-row">
          <input v-model="settings.securityPolicies.requireSpecialChar" type="checkbox" />
          <span>Require special characters</span>
        </label>

        <label class="field">
          <span>Session Timeout (minutes)</span>
          <input v-model.number="settings.securityPolicies.sessionTimeoutMinutes" type="number" min="5" max="720" />
        </label>

        <label class="toggle-row">
          <input v-model="settings.securityPolicies.enforceAdmin2FA" type="checkbox" />
          <span>Require 2FA for admin users</span>
        </label>
      </article>
    </section>

    <section class="panel panel-table">
      <div class="section-head">
        <h3>Benefit Types Management</h3>
        <button class="btn btn-secondary" @click="openCreateBenefit">Add Benefit Type</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in benefits" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.description || "-" }}</td>
              <td>
                <span :class="['badge', item.is_active ? 'active' : 'inactive']">
                  {{ item.is_active ? "Active" : "Inactive" }}
                </span>
              </td>
              <td class="actions">
                <button class="btn-link" @click="openEditBenefit(item)">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20H8L18.5 9.5L14.5 5.5L4 16V20Z" />
                    <path d="M13.5 6.5L17.5 10.5" />
                  </svg>
                  Edit
                </button>
                <button class="btn-link danger" @click="deleteBenefit(item)">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7H20" />
                    <path d="M9 7V5H15V7" />
                    <path d="M7 7L8 20H16L17 7" />
                    <path d="M10 11V17" />
                    <path d="M14 11V17" />
                  </svg>
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel panel-table">
      <div class="section-head">
        <h3>Billing Rate Configuration</h3>
        <button class="btn btn-secondary" @click="openCreateRate">Add Billing Rate</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Effective From</th>
              <th>Effective To</th>
              <th>Rate / kWh</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in billingRates" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ formatDate(item.effective_from) }}</td>
              <td>{{ formatDate(item.effective_to) }}</td>
              <td>{{ Number(item.rate_per_kwh || 0).toFixed(4) }}</td>
              <td>{{ item.description || "-" }}</td>
              <td class="actions">
                <button class="btn-link" @click="openEditRate(item)">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20H8L18.5 9.5L14.5 5.5L4 16V20Z" />
                    <path d="M13.5 6.5L17.5 10.5" />
                  </svg>
                  Edit
                </button>
                <button class="btn-link danger" @click="deleteRate(item)">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7H20" />
                    <path d="M9 7V5H15V7" />
                    <path d="M7 7L8 20H16L17 7" />
                    <path d="M10 11V17" />
                    <path d="M14 11V17" />
                  </svg>
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel panel-table audit-panel">
      <div class="section-head">
        <div>
          <h3>System Audit Logs & Activity Trail</h3>
          <p class="section-subtitle">Track login history, admin actions, and system-level changes in one view.</p>
        </div>
        <div class="section-head-actions">
          <span class="chip chip-muted">{{ auditLogs.length }} Recent Events</span>
          <button class="btn btn-secondary btn-audit-refresh" @click="loadAuditLogs">Refresh Logs</button>
        </div>
      </div>

      <div class="audit-toolbar-wrap">
        <p class="audit-toolbar-title">Filter Activity</p>
        <div class="audit-toolbar">
          <label class="field compact">
            <span>Date From</span>
            <input v-model="auditFilters.date_from" type="date" />
          </label>

          <label class="field compact">
            <span>Date To</span>
            <input v-model="auditFilters.date_to" type="date" />
          </label>

          <label class="field compact">
            <span>User</span>
            <select v-model="auditFilters.user_id">
              <option value="">All Users</option>
              <option v-for="u in auditUsers" :key="u.id" :value="String(u.id)">
                {{ u.full_name || u.email || `User #${u.id}` }}
              </option>
            </select>
          </label>

          <label class="field compact">
            <span>Action Type</span>
            <select v-model="auditFilters.action_type">
              <option value="">All Types</option>
              <option value="login">Login History</option>
              <option value="approval">Approvals</option>
              <option value="data_change">Data Changes</option>
              <option value="system_event">System Events</option>
              <option value="settings">Settings</option>
            </select>
          </label>

          <label class="field compact search">
            <span>Search</span>
            <input v-model="auditFilters.search" type="text" placeholder="action, details, entity..." />
          </label>

          <div class="audit-toolbar-actions">
            <button class="btn btn-secondary" @click="resetAuditFilters">Reset</button>
            <button class="btn btn-primary" :disabled="loadingAudit" @click="loadAuditLogs">
              {{ loadingAudit ? "Loading..." : "Apply Filter" }}
            </button>
          </div>
        </div>
      </div>

      <div class="table-wrap audit-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Type</th>
              <th>Action</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!auditLogs.length">
              <td colspan="6" class="audit-empty">No audit logs found for the selected filter.</td>
            </tr>
            <tr v-for="item in auditLogs" :key="item.id" class="audit-row">
              <td class="audit-when">{{ formatDateTime(item.created_at) }}</td>
              <td>{{ item.actor_name || item.actor_email || `User #${item.user_id || '-'}` }}</td>
              <td>
                <span :class="['badge', 'audit-type', `type-${item.action_type || 'unknown'}`]">
                  {{ item.action_type || "unknown" }}
                </span>
              </td>
              <td class="audit-action">{{ item.action }}</td>
              <td class="audit-details">{{ item.details || "-" }}</td>
              <td><span class="audit-ip">{{ item.ip_address || "-" }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showBenefitModal" class="modal-overlay">
      <div class="modal-panel">
        <h3>{{ benefitForm.id ? "Edit Benefit Type" : "Add Benefit Type" }}</h3>

        <label class="field">
          <span>Name</span>
          <input v-model="benefitForm.name" type="text" />
        </label>

        <label class="field">
          <span>Description</span>
          <textarea v-model="benefitForm.description" rows="3" />
        </label>

        <label class="toggle-row">
          <input v-model="benefitForm.is_active" type="checkbox" />
          <span>Active</span>
        </label>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeBenefitModal">Cancel</button>
          <button class="btn btn-primary" @click="saveBenefit">Save</button>
        </div>
      </div>
    </div>

    <div v-if="showRateModal" class="modal-overlay">
      <div class="modal-panel">
        <h3>{{ rateForm.id ? "Edit Billing Rate" : "Add Billing Rate" }}</h3>

        <label class="field">
          <span>Effective From</span>
          <input v-model="rateForm.effective_from" type="date" />
        </label>

        <label class="field">
          <span>Effective To</span>
          <input v-model="rateForm.effective_to" type="date" />
        </label>

        <label class="field">
          <span>Rate per kWh</span>
          <input v-model.number="rateForm.rate_per_kwh" type="number" step="0.0001" min="0" />
        </label>

        <label class="field">
          <span>Description</span>
          <input v-model="rateForm.description" type="text" />
        </label>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeRateModal">Cancel</button>
          <button class="btn btn-primary" @click="saveRate">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import api from "../api";
import { applyTheme } from "../services/theme";

const defaultSettings = () => ({
  emailTemplates: {
    benefitApproval:
      "Hello {{name}}, your benefit application for {{benefit_name}} is now {{status}}.",
    incidentAcknowledgement:
      "Hello {{name}}, your incident report #{{incident_id}} has been received and is under review.",
    seminarReminder:
      "Reminder: Your seminar schedule is set for {{seminar_date}}. Please arrive 15 minutes early.",
  },
  notificationPreferences: {
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    adminContactNumber: "",
  },
  thresholds: {
    incidentsPerDayAlert: 5,
    benefitsPerDayAlert: 10,
    highBillAmount: 5000,
    seminarWindowDays: 7,
  },
  appearance: {
    darkModeEnabled: false,
  },
  securityPolicies: {
    minPasswordLength: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSpecialChar: false,
    sessionTimeoutMinutes: 30,
    enforceAdmin2FA: false,
  },
});

const settings = reactive(defaultSettings());
const savingSettings = ref(false);

const benefits = ref([]);
const billingRates = ref([]);
const auditLogs = ref([]);
const auditUsers = ref([]);
const loadingAudit = ref(false);

const auditFilters = reactive({
  date_from: "",
  date_to: "",
  user_id: "",
  action_type: "",
  search: "",
});

const showBenefitModal = ref(false);
const showRateModal = ref(false);

const benefitForm = ref({
  id: null,
  name: "",
  description: "",
  is_active: true,
});

const rateForm = ref({
  id: null,
  effective_from: "",
  effective_to: "",
  rate_per_kwh: 0,
  description: "",
});

const loadSettings = async () => {
  const { data } = await api.get("/settings/system");
  Object.assign(settings.emailTemplates, data.emailTemplates || {});
  Object.assign(settings.notificationPreferences, data.notificationPreferences || {});
  Object.assign(settings.thresholds, data.thresholds || {});
  Object.assign(settings.appearance, data.appearance || {});
  Object.assign(settings.securityPolicies, data.securityPolicies || {});
  applyTheme(settings.appearance.darkModeEnabled);
};

const loadBenefits = async () => {
  const { data } = await api.get("/benefits");
  benefits.value = data || [];
};

const loadBillingRates = async () => {
  const { data } = await api.get("/billing/rates");
  billingRates.value = data || [];
};

const loadAuditUsers = async () => {
  try {
    const { data } = await api.get("/users");
    auditUsers.value = Array.isArray(data) ? data : [];
  } catch (_err) {
    auditUsers.value = [];
  }
};

const loadAuditLogs = async () => {
  loadingAudit.value = true;
  try {
    const params = {
      limit: 200,
      page: 1,
    };

    if (auditFilters.date_from) params.date_from = auditFilters.date_from;
    if (auditFilters.date_to) params.date_to = auditFilters.date_to;
    if (auditFilters.user_id) params.user_id = auditFilters.user_id;
    if (auditFilters.action_type) params.action_type = auditFilters.action_type;
    if (auditFilters.search) params.search = auditFilters.search;

    const { data } = await api.get("/settings/audit-logs", { params });
    auditLogs.value = Array.isArray(data && data.items) ? data.items : [];
  } catch (err) {
    auditLogs.value = [];
    alert(err?.response?.data?.message || "Failed to load audit logs.");
  } finally {
    loadingAudit.value = false;
  }
};

const resetAuditFilters = async () => {
  auditFilters.date_from = "";
  auditFilters.date_to = "";
  auditFilters.user_id = "";
  auditFilters.action_type = "";
  auditFilters.search = "";
  await loadAuditLogs();
};

const loadAll = async () => {
  await Promise.all([loadSettings(), loadBenefits(), loadBillingRates(), loadAuditUsers(), loadAuditLogs()]);
};

const saveSettings = async () => {
  savingSettings.value = true;
  try {
    const payload = {
      emailTemplates: { ...settings.emailTemplates },
      notificationPreferences: { ...settings.notificationPreferences },
      thresholds: {
        incidentsPerDayAlert: Number(settings.thresholds.incidentsPerDayAlert || 1),
        benefitsPerDayAlert: Number(settings.thresholds.benefitsPerDayAlert || 1),
        highBillAmount: Number(settings.thresholds.highBillAmount || 1),
        seminarWindowDays: Number(settings.thresholds.seminarWindowDays || 1),
      },
      appearance: {
        darkModeEnabled: !!settings.appearance.darkModeEnabled,
      },
      securityPolicies: {
        minPasswordLength: Number(settings.securityPolicies.minPasswordLength || 8),
        requireUppercase: !!settings.securityPolicies.requireUppercase,
        requireNumber: !!settings.securityPolicies.requireNumber,
        requireSpecialChar: !!settings.securityPolicies.requireSpecialChar,
        sessionTimeoutMinutes: Number(settings.securityPolicies.sessionTimeoutMinutes || 30),
        enforceAdmin2FA: !!settings.securityPolicies.enforceAdmin2FA,
      },
    };

    await api.put("/settings/system", payload);
    alert("System settings saved.");
    await loadAuditLogs();
  } catch (err) {
    alert(err?.response?.data?.message || "Failed to save settings.");
  } finally {
    savingSettings.value = false;
  }
};

watch(
  () => settings.appearance.darkModeEnabled,
  (enabled) => {
    applyTheme(enabled);
  }
);

const openCreateBenefit = () => {
  benefitForm.value = { id: null, name: "", description: "", is_active: true };
  showBenefitModal.value = true;
};

const openEditBenefit = (item) => {
  benefitForm.value = {
    id: item.id,
    name: item.name,
    description: item.description || "",
    is_active: !!item.is_active,
  };
  showBenefitModal.value = true;
};

const closeBenefitModal = () => {
  showBenefitModal.value = false;
};

const saveBenefit = async () => {
  if (!benefitForm.value.name) {
    alert("Benefit name is required.");
    return;
  }

  if (benefitForm.value.id) {
    await api.put(`/benefits/${benefitForm.value.id}`, benefitForm.value);
  } else {
    await api.post("/benefits", benefitForm.value);
  }

  showBenefitModal.value = false;
  await loadBenefits();
  await loadAuditLogs();
};

const deleteBenefit = async (item) => {
  if (!confirm(`Delete benefit type \"${item.name}\"?`)) return;
  await api.delete(`/benefits/${item.id}`);
  await loadBenefits();
  await loadAuditLogs();
};

const openCreateRate = () => {
  rateForm.value = {
    id: null,
    effective_from: "",
    effective_to: "",
    rate_per_kwh: 0,
    description: "",
  };
  showRateModal.value = true;
};

const openEditRate = (item) => {
  rateForm.value = {
    id: item.id,
    effective_from: item.effective_from ? String(item.effective_from).slice(0, 10) : "",
    effective_to: item.effective_to ? String(item.effective_to).slice(0, 10) : "",
    rate_per_kwh: Number(item.rate_per_kwh || 0),
    description: item.description || "",
  };
  showRateModal.value = true;
};

const closeRateModal = () => {
  showRateModal.value = false;
};

const saveRate = async () => {
  if (!rateForm.value.effective_from || !Number(rateForm.value.rate_per_kwh)) {
    alert("Effective from and rate per kWh are required.");
    return;
  }

  if (rateForm.value.id) {
    await api.put(`/billing/rates/${rateForm.value.id}`, rateForm.value);
  } else {
    await api.post("/billing/rates", rateForm.value);
  }

  showRateModal.value = false;
  await loadBillingRates();
  await loadAuditLogs();
};

const deleteRate = async (item) => {
  if (!confirm(`Delete billing rate #${item.id}?`)) return;
  await api.delete(`/billing/rates/${item.id}`);
  await loadBillingRates();
  await loadAuditLogs();
};

const formatDate = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(loadAll);
</script>

<style scoped>
.settings-page {
  --bg-main: #f4f8fc;
  --bg-soft: #ffffff;
  --bg-elev: #ffffff;
  --text-primary: #0f223d;
  --text-muted: #5e7696;
  --border: #d7e3f0;
  --accent: #0d9f80;
  --accent-strong: #0a856b;
  --danger: #c84949;
  --row-hover: #f1f7ff;
  --shadow: 0 14px 40px rgba(20, 41, 67, 0.12);

  position: relative;
  overflow: hidden;
  min-height: calc(100vh - 84px);
  padding: 28px;
  border-radius: 18px;
  max-width: 1460px;
  margin: 0 auto;
  color: var(--text-primary);
  background:
    radial-gradient(circle at 2% 8%, rgba(13, 159, 128, 0.16) 0, rgba(13, 159, 128, 0) 25%),
    radial-gradient(circle at 95% 3%, rgba(30, 83, 163, 0.16) 0, rgba(30, 83, 163, 0) 23%),
    var(--bg-main);
  animation: fadeIn 0.35s ease;
}

.settings-page.theme-dark {
  --bg-main: #111a27;
  --bg-soft: #192434;
  --bg-elev: #1d293a;
  --text-primary: #ecf5ff;
  --text-muted: #9cb5cf;
  --border: #30455f;
  --accent: #33d2aa;
  --accent-strong: #24b58f;
  --danger: #ff7474;
  --row-hover: #223146;
  --shadow: 0 18px 42px rgba(2, 8, 18, 0.5);
}

.bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(50px);
  pointer-events: none;
}

.orb-a {
  width: 280px;
  height: 280px;
  background: rgba(5, 153, 123, 0.2);
  top: -90px;
  right: -90px;
}

.orb-b {
  width: 240px;
  height: 240px;
  background: rgba(46, 102, 191, 0.16);
  bottom: -80px;
  left: -80px;
}

.hero {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--bg-soft) 92%, #ffffff 8%), var(--bg-soft));
  box-shadow: var(--shadow);
}

.kicker {
  margin: 0 0 6px;
  letter-spacing: 0.14em;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--accent);
}

.page-title {
  margin: 0;
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 800;
}

.page-subtitle {
  margin: 8px 0 0;
  color: var(--text-muted);
  max-width: 700px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
}

.theme-switch input {
  display: none;
}

.switch-track {
  width: 52px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-soft) 80%, #dbe9f8 20%);
  position: relative;
  transition: all 0.2s ease;
}

.switch-dot {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #fff;
  position: absolute;
  top: 2px;
  left: 3px;
  transition: transform 0.2s ease;
}

.theme-switch input:checked + .switch-track {
  background: color-mix(in srgb, var(--accent) 28%, #132032 72%);
  border-color: color-mix(in srgb, var(--accent) 70%, var(--border) 30%);
}

.theme-switch input:checked + .switch-track .switch-dot {
  transform: translateX(23px);
}

.quick-stats {
  position: relative;
  z-index: 2;
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

.stat-card {
  border: 1px solid var(--border);
  background: var(--bg-elev);
  border-radius: 14px;
  padding: 14px;
  box-shadow: var(--shadow);
}

.stat-card p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 700;
}

.stat-card strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  color: var(--text-primary);
}

.settings-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 12px;
  margin-top: 14px;
  margin-bottom: 14px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: var(--bg-elev);
  box-shadow: var(--shadow);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.panel h3 {
  margin: 0;
  font-size: 16px;
}

.chip {
  border-radius: 999px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--accent) 14%, transparent 86%);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border) 60%);
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
}

.chip-muted {
  background: color-mix(in srgb, var(--bg-soft) 88%, #b7c9dd 12%);
  border-color: color-mix(in srgb, var(--border) 85%, #a8bfd6 15%);
  color: var(--text-muted);
}

.field {
  display: grid;
  gap: 7px;
  margin-bottom: 10px;
}

.field span {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 11px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-soft);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 70%, var(--border) 30%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent 82%);
}

.field.compact {
  margin-bottom: 0;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-weight: 700;
}

.toggle-row input {
  accent-color: var(--accent);
}

.hint {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.hint code {
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-soft) 90%);
  color: var(--accent);
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 700;
}

.panel-table {
  position: relative;
  z-index: 2;
  margin-bottom: 14px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-subtitle {
  margin: 5px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.section-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.audit-panel {
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--bg-elev) 94%, #ffffff 6%), var(--bg-elev));
}

.btn-audit-refresh {
  min-width: 132px;
}

.audit-toolbar-wrap {
  border: 1px solid color-mix(in srgb, var(--border) 90%, #d4e2f1 10%);
  background: color-mix(in srgb, var(--bg-soft) 92%, #f7fbff 8%);
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
}

.audit-toolbar-title {
  margin: 0 0 10px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 800;
  color: var(--text-muted);
}

.audit-toolbar {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 10px;
  align-items: end;
}

.audit-toolbar .field.search {
  grid-column: span 2;
  min-width: 0;
}

.audit-toolbar-actions {
  grid-column: 5 / -1;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 8px;
}

.audit-toolbar-actions .btn {
  min-height: 44px;
  min-width: 124px;
  white-space: nowrap;
}

.audit-table-wrap {
  border-radius: 14px;
  border-color: color-mix(in srgb, var(--border) 82%, #abc1da 18%);
}

.audit-row:nth-child(even) {
  background: color-mix(in srgb, var(--bg-soft) 92%, #eef5ff 8%);
}

.audit-when {
  white-space: nowrap;
  font-weight: 700;
}

.audit-type {
  text-transform: lowercase;
  letter-spacing: 0.02em;
}

.audit-type.type-login {
  background: color-mix(in srgb, #1f7dd6 16%, transparent 84%);
  color: #1f7dd6;
}

.audit-type.type-approval {
  background: color-mix(in srgb, #2a9d66 18%, transparent 82%);
  color: #237f53;
}

.audit-type.type-data_change {
  background: color-mix(in srgb, #9f6ae0 18%, transparent 82%);
  color: #7b47bc;
}

.audit-type.type-system_event {
  background: color-mix(in srgb, #e0962c 20%, transparent 80%);
  color: #b57114;
}

.audit-type.type-settings {
  background: color-mix(in srgb, #0f9f80 18%, transparent 82%);
  color: #0b7d64;
}

.audit-type.type-unknown {
  background: color-mix(in srgb, var(--text-muted) 16%, transparent 84%);
  color: var(--text-muted);
}

.audit-action {
  font-family: "Consolas", "SFMono-Regular", Menlo, Monaco, monospace;
  font-size: 12px;
  letter-spacing: 0.01em;
}

.audit-details {
  max-width: 420px;
  word-break: break-word;
  white-space: pre-wrap;
}

.audit-ip {
  font-family: "Consolas", "SFMono-Regular", Menlo, Monaco, monospace;
  font-size: 12px;
  color: var(--text-muted);
}

.audit-empty {
  text-align: center;
  color: var(--text-muted);
  font-weight: 700;
  padding: 22px 10px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid var(--border);
  padding: 11px 9px;
  text-align: left;
  font-size: 14px;
}

.data-table th {
  color: var(--text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.data-table tbody tr:hover {
  background: var(--row-hover);
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.badge {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.badge.active {
  background: color-mix(in srgb, var(--accent) 18%, transparent 82%);
  color: var(--accent);
}

.badge.inactive {
  background: color-mix(in srgb, var(--danger) 14%, transparent 86%);
  color: var(--danger);
}

.btn {
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 9px 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.btn:not(:disabled):active {
  transform: translateY(1px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
}

.btn-primary:hover {
  filter: brightness(1.04);
}

.btn-secondary {
  background: color-mix(in srgb, var(--bg-soft) 92%, #ffffff 8%);
  color: var(--text-primary);
  border-color: var(--border);
}

.btn-secondary:hover {
  background: color-mix(in srgb, var(--bg-soft) 85%, #ffffff 15%);
}

.btn-link {
  border: 1px solid #dce5ef;
  border-radius: 11px;
  background: #ffffff;
  color: #10233e;
  font-weight: 800;
  cursor: pointer;
  padding: 7px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
}

.btn-link:hover {
  background: #eef6ff;
  border-color: #ccddf0;
}

.btn-link:active {
  transform: translateY(1px);
}

.btn-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, #1f7dd6 22%, transparent 78%);
}

.btn-link.danger {
  border-color: #dce5ef;
  background: #ffffff;
  color: var(--danger);
}

.btn-link.danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.action-icon {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 16, 25, 0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
}

.modal-panel {
  width: min(520px, 92vw);
  background: var(--bg-elev);
  border-radius: 14px;
  border: 1px solid var(--border);
  padding: 16px;
  color: var(--text-primary);
  box-shadow: var(--shadow);
  animation: popIn 0.2s ease;
}

.modal-panel h3 {
  margin: 0 0 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

@keyframes popIn {
  from {
    transform: translateY(8px) scale(0.985);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 1200px) {
  .audit-toolbar {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .audit-toolbar .field.search {
    grid-column: span 2;
  }

  .audit-toolbar-actions {
    grid-column: span 2;
  }
}

@media (max-width: 900px) {
  .settings-page {
    padding: 16px;
  }

  .hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions {
    justify-content: space-between;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .section-head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .audit-toolbar {
    grid-template-columns: 1fr;
  }

  .audit-toolbar .field.search {
    grid-column: span 1;
  }

  .audit-toolbar-actions {
    grid-column: span 1;
    justify-content: stretch;
  }

  .audit-toolbar-actions .btn {
    flex: 1;
    min-width: 0;
  }

  .audit-action,
  .audit-ip {
    white-space: nowrap;
  }
}
</style>
