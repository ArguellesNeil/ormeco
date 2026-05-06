<template>
  <div class="page-shell notifications-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Notifications & Alerts Center</h2>
        <p class="page-subtitle">Centralized workflow alerts for benefits, incidents, seminars, and system anomalies.</p>
      </div>

      <div class="page-actions">
        <button class="btn btn-secondary utility-btn" @click="markAll(true)" :disabled="loading || !items.length">Mark All as Read</button>
        <button class="btn btn-secondary utility-btn" @click="markAll(false)" :disabled="loading || !items.length">Mark All as Unread</button>
      </div>
    </div>

    <section class="summary-grid" v-if="summary">
      <article class="summary-card card-surface summary-total">
        <div class="summary-head">
          <div class="summary-icon">
            <svg class="summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, idx) in getSummaryIconPaths('total')" :key="`summary-total-${idx}`" :d="d" />
            </svg>
          </div>
        </div>
        <span class="summary-label">Total</span>
        <strong>{{ summary.total }}</strong>
      </article>

      <article class="summary-card card-surface summary-unread">
        <div class="summary-head">
          <div class="summary-icon">
            <svg class="summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, idx) in getSummaryIconPaths('unread')" :key="`summary-unread-${idx}`" :d="d" />
            </svg>
          </div>
        </div>
        <span class="summary-label">Unread</span>
        <strong>{{ summary.unread }}</strong>
      </article>

      <article class="summary-card card-surface summary-benefits">
        <div class="summary-head">
          <div class="summary-icon">
            <svg class="summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, idx) in getSummaryIconPaths('benefits')" :key="`summary-benefits-${idx}`" :d="d" />
            </svg>
          </div>
        </div>
        <span class="summary-label">Benefits</span>
        <strong>{{ summary.byType.benefits }}</strong>
      </article>

      <article class="summary-card card-surface summary-incidents">
        <div class="summary-head">
          <div class="summary-icon">
            <svg class="summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, idx) in getSummaryIconPaths('incidents')" :key="`summary-incidents-${idx}`" :d="d" />
            </svg>
          </div>
        </div>
        <span class="summary-label">Incidents</span>
        <strong>{{ summary.byType.incidents }}</strong>
      </article>

      <article class="summary-card card-surface summary-seminars">
        <div class="summary-head">
          <div class="summary-icon">
            <svg class="summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, idx) in getSummaryIconPaths('seminars')" :key="`summary-seminars-${idx}`" :d="d" />
            </svg>
          </div>
        </div>
        <span class="summary-label">Seminars</span>
        <strong>{{ summary.byType.seminars }}</strong>
      </article>

      <article class="summary-card card-surface summary-system">
        <div class="summary-head">
          <div class="summary-icon">
            <svg class="summary-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, idx) in getSummaryIconPaths('system')" :key="`summary-system-${idx}`" :d="d" />
            </svg>
          </div>
        </div>
        <span class="summary-label">System</span>
        <strong>{{ summary.byType.system }}</strong>
      </article>
    </section>

    <section class="card-surface filter-card">
      <div class="filter-head">
        <h3>Filter Activity</h3>
        <p>Narrow results by type, status, and keywords.</p>
      </div>

      <div class="filter-row">
        <div class="control type-control">
          <span class="control-label">Type</span>
          <div class="type-filters">
            <button
              v-for="t in types"
              :key="t.value"
              class="btn btn-secondary"
              :class="{ active: filters.type === t.value }"
              @click="changeType(t.value)"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <label class="control status-control">
          <span class="control-label">Status</span>
          <select v-model="filters.status" class="status-select" @change="load">
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>

        <label class="control search-control">
          <span class="control-label">Search</span>
          <input
            v-model.trim="filters.q"
            @keyup.enter="load"
            class="search-input"
            type="text"
            placeholder="Search title or message"
          />
        </label>

        <div class="filter-actions">
          <button class="btn btn-secondary utility-btn" @click="resetFilters" :disabled="loading">Reset</button>
          <button class="btn btn-primary utility-btn apply-btn" @click="load" :disabled="loading">Apply Filters</button>
        </div>
      </div>
    </section>

    <section class="card-surface table-card">
      <div class="table-meta">
        <p class="table-title">Recent Notifications</p>
        <span class="table-count">{{ items.length }} item{{ items.length === 1 ? "" : "s" }}</span>
      </div>

      <div v-if="loading" class="empty-state">Loading notifications...</div>
      <div v-else-if="!items.length" class="empty-state">No notifications found for current filters.</div>

      <div v-else>
        <DataTable
          :columns="tableColumns"
          :rows="items"
          idKey="id"
          :showActions="false"
        >
          <template #cell-type="{ row }">
            <span class="type-badge" :class="`type-${row.type}`">{{ row.type }}</span>
          </template>

          <template #cell-title="{ row }">
            <div class="title-stack">
              <span class="title-main">{{ row.title }}</span>
              <span class="title-meta" :class="{ unread: !row.is_read }">#{{ row.id }}{{ !row.is_read ? " • unread" : " • read" }}</span>
            </div>
          </template>

          <template #cell-message="{ row }">
            <p class="message-cell">{{ row.body }}</p>
          </template>

          <template #cell-status="{ row }">
            <span class="status-badge" :class="row.is_read ? 'read' : 'unread'">
              {{ row.is_read ? "Read" : "Unread" }}
            </span>
          </template>

          <template #cell-created="{ row }">
            <span class="created-cell">{{ formatDate(row.created_at) }}</span>
          </template>

          <template #cell-actions="{ row }">
            <div class="row-actions">
              <button class="btn-edit row-btn" @click="readAndOpen(row)">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12L9 17L20 6" />
                </svg>
                {{ row.is_read ? "Open" : "Read" }}
              </button>
              <button class="btn-delete row-btn" @click="remove(row)">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7H20" />
                  <path d="M9 7V5H15V7" />
                  <path d="M7 7L8 20H16L17 7" />
                  <path d="M10 11V17" />
                  <path d="M14 11V17" />
                </svg>
                Delete
              </button>
            </div>
          </template>
        </DataTable>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../api";
import DataTable from "../components/DataTable.vue";

const loading = ref(false);
const items = ref([]);
const summary = ref(null);
const router = useRouter();

const filters = reactive({
  type: "all",
  status: "all",
  q: "",
});

const types = [
  { label: "All", value: "all" },
  { label: "Benefits", value: "benefits" },
  { label: "Incidents", value: "incidents" },
  { label: "Seminars", value: "seminars" },
  { label: "System", value: "system" },
];

const tableColumns = [
  { key: "type", label: "Type" },
  { key: "title", label: "Title" },
  { key: "message", label: "Message" },
  { key: "status", label: "Status" },
  { key: "created", label: "Notified At" },
  { key: "actions", label: "Actions" },
];

const SUMMARY_ICON_PATHS = {
  total: ["M4 19H20", "M6 15L10 11L13 13L18 8"],
  unread: ["M8 18H16", "M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18", "M6 16V11C6 7.69 8.69 5 12 5C15.31 5 18 7.69 18 11V16L20 18H4L6 16Z"],
  benefits: ["M4 10H20V20H4V10Z", "M12 10V20", "M4 14H20", "M12 10C10.2 10 8.5 8.8 8.5 7.2C8.5 5.9 9.5 5 10.8 5C11.6 5 12.3 5.4 12 6.3", "M12 10C13.8 10 15.5 8.8 15.5 7.2C15.5 5.9 14.5 5 13.2 5C12.4 5 11.7 5.4 12 6.3"],
  incidents: ["M12 4L21 20H3L12 4Z", "M12 10V14", "M12 17H12.01"],
  seminars: ["M7 3V6", "M17 3V6", "M4 9H20", "M6 5H18C19.1 5 20 5.9 20 7V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V7C4 5.9 4.9 5 6 5Z"],
  system: ["M13 3L6 13H11L10 21L18 10H13L13 3Z"],
};

const TARGET_PAGE_BY_TYPE = {
  benefits: "/benefit-approvals",
  incidents: "/incidents",
  seminars: "/seminar-scheduling",
  system: "/system-settings",
};

const resolveNotificationTarget = (item) => {
  if (!item) return "/stats";
  if (item.target_path) return item.target_path;
  return TARGET_PAGE_BY_TYPE[item.type] || "/stats";
};

const getSummaryIconPaths = (key) => SUMMARY_ICON_PATHS[key] || SUMMARY_ICON_PATHS.total;

const emitUnreadSync = (unread) => {
  window.dispatchEvent(
    new CustomEvent("ormeco:notifications-updated", {
      detail: { unread: Number(unread || 0) },
    })
  );
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const load = async () => {
  loading.value = true;
  try {
    const { data } = await api.get("/notifications", {
      params: {
        type: filters.type,
        status: filters.status,
        q: filters.q,
      },
    });

    items.value = data.items || [];
    summary.value = data.summary || null;
    emitUnreadSync(summary.value && typeof summary.value.unread !== "undefined" ? summary.value.unread : 0);
  } catch (err) {
    emitUnreadSync(0);
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to load notifications");
  } finally {
    loading.value = false;
  }
};

const changeType = async (type) => {
  filters.type = type;
  await load();
};

const resetFilters = async () => {
  filters.type = "all";
  filters.status = "all";
  filters.q = "";
  await load();
};

const readAndOpen = async (item) => {
  try {
    const shouldMarkRead = !item.is_read;
    if (shouldMarkRead) {
      await api.patch(`/notifications/${item.id}/read`, {
        is_read: true,
      });
    }

    if (shouldMarkRead) {
      await load();
    }

    await router.push({
      path: resolveNotificationTarget(item),
      query: { notification_id: String(item.id) },
    });
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to update notification");
  }
};

const markAll = async (isRead) => {
  try {
    await api.patch("/notifications/read-all", { is_read: !!isRead });
    await load();
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to update notifications");
  }
};

const remove = async (item) => {
  if (!confirm("Delete this notification?")) return;
  try {
    await api.delete(`/notifications/${item.id}`);
    await load();
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to delete notification");
  }
};

onMounted(load);
</script>

<style scoped>
.notifications-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.utility-btn {
  min-height: 42px;
  white-space: nowrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.summary-card {
  --summary-accent: #8ea8c7;
  --summary-soft: rgba(142, 168, 199, 0.16);
  --summary-glow: rgba(142, 168, 199, 0.2);
  position: relative;
  overflow: hidden;
  padding: 13px;
  border: 1px solid #d6e3f1;
  border-radius: 15px;
  background:
    radial-gradient(circle at 88% -8%, var(--summary-soft), transparent 52%),
    linear-gradient(160deg, #ffffff 0%, #f7fbff 56%, #ffffff 100%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.summary-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, var(--summary-accent), transparent 78%);
  opacity: 0.9;
}

.summary-card::after {
  content: "";
  position: absolute;
  right: -34px;
  bottom: -38px;
  width: 108px;
  height: 108px;
  border-radius: 999px;
  background: var(--summary-glow);
  filter: blur(24px);
  opacity: 0.58;
  pointer-events: none;
}

.summary-card:hover {
  border-color: #b7cde5;
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.1);
  transform: translateY(-2px);
}

.summary-head {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
}

.summary-icon {
  width: auto;
  height: auto;
  border-radius: 0;
  display: inline-grid;
  place-items: center;
  background: transparent;
  border: none;
  box-shadow: none;
  color: var(--summary-accent);
  transition: transform 0.18s ease, color 0.18s ease, filter 0.18s ease;
}

.summary-icon-svg {
  width: 22px;
  height: 22px;
}

.summary-icon-svg path {
  stroke: currentColor;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.summary-card:hover .summary-icon {
  transform: scale(1.08);
}

.summary-label {
  display: block;
  font-size: 10.5px;
  text-transform: uppercase;
  color: #516987;
  letter-spacing: 0.09em;
  font-weight: 750;
}

.summary-card strong {
  display: block;
  margin-top: 5px;
  font-size: clamp(28px, 2.1vw, 38px);
  color: #10233e;
  line-height: 0.95;
  letter-spacing: -0.03em;
}

.summary-total {
  --summary-accent: #8ea8c7;
  --summary-soft: rgba(142, 168, 199, 0.16);
  --summary-glow: rgba(142, 168, 199, 0.22);
}

.summary-unread {
  --summary-accent: #1d87d1;
  --summary-soft: rgba(29, 135, 209, 0.16);
  --summary-glow: rgba(29, 135, 209, 0.22);
}

.summary-benefits {
  --summary-accent: #12906f;
  --summary-soft: rgba(18, 144, 111, 0.16);
  --summary-glow: rgba(18, 144, 111, 0.22);
}

.summary-incidents {
  --summary-accent: #d77e2f;
  --summary-soft: rgba(215, 126, 47, 0.16);
  --summary-glow: rgba(215, 126, 47, 0.22);
}

.summary-seminars {
  --summary-accent: #356fb4;
  --summary-soft: rgba(53, 111, 180, 0.16);
  --summary-glow: rgba(53, 111, 180, 0.22);
}

.summary-system {
  --summary-accent: #ca4d80;
  --summary-soft: rgba(202, 77, 128, 0.16);
  --summary-glow: rgba(202, 77, 128, 0.22);
}

.filter-card,
.table-card {
  border: 1px solid #d7e4f2;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.filter-card {
  padding: 14px;
}

.filter-card.card-surface:hover,
.table-card.card-surface:hover {
  transform: none;
}

.filter-head {
  margin-bottom: 12px;
}

.filter-head h3 {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4d6584;
}

.filter-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b829f;
}

.control {
  display: grid;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  font-weight: 800;
  color: #4f6787;
  letter-spacing: 0.03em;
}

.filter-row {
  display: grid;
  grid-template-columns: minmax(210px, 280px) minmax(260px, 1fr) auto;
  grid-template-areas:
    "type type type"
    "status search actions";
  gap: 14px;
  align-items: end;
}

.type-control {
  grid-area: type;
}

.status-control {
  grid-area: status;
}

.search-control {
  grid-area: search;
  min-width: 0;
}

.type-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.type-filters .btn {
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 11px;
}

.type-filters .btn.active {
  border-color: #9fd6c9;
  background: #e9f8f2;
  color: #0f8b6f;
}

.status-select,
.search-input {
  width: 100%;
  border: 1px solid #c9d8e8;
  border-radius: 11px;
  min-height: 44px;
  padding: 10px 12px;
  font-size: 14px;
  color: #2a4566;
  background: #f5f9fe;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.status-select:focus,
.search-input:focus {
  outline: none;
  border-color: #8fc4e9;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(29, 135, 209, 0.12);
}

.filter-actions {
  grid-area: actions;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.filter-actions .utility-btn {
  min-width: 126px;
}

.apply-btn {
  min-width: 126px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.table-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #e3ecf7;
  background: linear-gradient(180deg, #f6faff 0%, #edf4fb 100%);
}

.table-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #2a4566;
}

.table-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #c9d9eb;
  background: #f1f6fc;
  font-size: 12px;
  font-weight: 800;
  color: #4f6787;
}

.notifications-page :deep(.table-wrapper) {
  margin-top: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  max-height: calc(100vh - 330px);
}

.notifications-page :deep(.data-table th),
.notifications-page :deep(.data-table td) {
  padding: 13px 14px;
  vertical-align: top;
}

.notifications-page :deep(.data-table th:last-child) {
  text-align: right;
}

.notifications-page :deep(.data-table td:last-child) {
  width: 1%;
  white-space: nowrap;
}

.notifications-page :deep(.table-row:hover) {
  background: transparent;
  transform: none;
}

.type-badge,
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  text-transform: capitalize;
}

.type-benefits { background: #e9f8f2; color: #0f8b6f; }
.type-incidents { background: #fff3e9; color: #bf6a18; }
.type-seminars { background: #ecf4ff; color: #2f6ea8; }
.type-system { background: #fff0f5; color: #c21f66; }

.status-badge.read { background: #eef3f8; color: #4f6786; }
.status-badge.unread { background: #e7f6ff; color: #1f78b5; }

.title-stack {
  min-width: 220px;
}

.title-main {
  display: block;
  font-weight: 700;
  color: #1b3555;
  line-height: 1.3;
}

.title-meta {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #567292;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.title-meta.unread {
  color: #1f78b5;
}

.message-cell {
  margin: 0;
  min-width: 300px;
  max-width: 520px;
  color: #2d4463;
  line-height: 1.35;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.created-cell {
  display: inline-block;
  min-width: 180px;
  color: #3d5a7a;
  font-weight: 600;
}

.actions-cell {
  min-width: 200px;
}

.row-actions {
  display: inline-flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 4px;
  border: 1px solid #cfdded;
  border-radius: 12px;
  background: #f3f8fe;
}

.row-btn {
  min-width: 0;
}

.btn-edit,
.btn-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  background: transparent;
  color: #10233e;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.btn-edit:hover {
  background: #eef6ff;
  border-color: #ccddf0;
}

.btn-delete {
  color: #b91c1c;
}

.btn-delete:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.btn-icon {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.empty-state {
  padding: 30px 20px;
  text-align: center;
  color: #5f738f;
  font-weight: 700;
}

@media (max-width: 1320px) {
  .filter-row {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "type type"
      "status search"
      "actions actions";
  }

  .type-control,
  .filter-actions {
    grid-column: span 2;
  }

  .filter-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 1000px) {
  .filter-row {
    grid-template-columns: 1fr;
    grid-template-areas:
      "type"
      "status"
      "search"
      "actions";
  }

  .filter-actions {
    justify-content: stretch;
  }

  .filter-actions .btn {
    flex: 1;
  }

  .notifications-page :deep(.table-wrapper) {
    max-height: none;
  }

  .row-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .row-btn {
    min-width: 0;
  }
}

:global(html.ormeco-dark) .notifications-page .summary-card,
:global(html.ormeco-dark) .notifications-page .filter-card,
:global(html.ormeco-dark) .notifications-page .table-card {
  background: #0f1d31;
  border-color: #33506f;
}

:global(html.ormeco-dark) .notifications-page .summary-card {
  background:
    radial-gradient(circle at 88% -8%, var(--summary-soft), transparent 52%),
    linear-gradient(160deg, #0f1d31 0%, #0d1a2c 56%, #0f1d31 100%);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}

:global(html.ormeco-dark) .notifications-page .summary-card:hover {
  border-color: #47688d;
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.34);
}

:global(html.ormeco-dark) .notifications-page .summary-card::before {
  opacity: 0.95;
}

:global(html.ormeco-dark) .notifications-page .summary-icon {
  background: transparent;
  border: none;
  box-shadow: none;
  filter: drop-shadow(0 1px 7px rgba(0, 0, 0, 0.32));
  color: #f2f8ff;
}

:global(html.ormeco-dark) .notifications-page .summary-total .summary-icon {
  color: #dcecff;
}

:global(html.ormeco-dark) .notifications-page .summary-unread .summary-icon {
  color: #7cd4ff;
}

:global(html.ormeco-dark) .notifications-page .summary-benefits .summary-icon {
  color: #82efce;
}

:global(html.ormeco-dark) .notifications-page .summary-incidents .summary-icon {
  color: #ffca84;
}

:global(html.ormeco-dark) .notifications-page .summary-seminars .summary-icon {
  color: #9ec5ff;
}

:global(html.ormeco-dark) .notifications-page .summary-system .summary-icon {
  color: #ff9ac6;
}

:global(html.ormeco-dark) .notifications-page .filter-head h3,
:global(html.ormeco-dark) .notifications-page .control-label,
:global(html.ormeco-dark) .notifications-page .table-title,
:global(html.ormeco-dark) .notifications-page .table-count,
:global(html.ormeco-dark) .notifications-page .created-cell {
  color: #d4e6f8;
}

:global(html.ormeco-dark) .notifications-page .filter-head p,
:global(html.ormeco-dark) .notifications-page .table-count,
:global(html.ormeco-dark) .notifications-page .table-title {
  border-color: #35506f;
}

:global(html.ormeco-dark) .notifications-page .filter-head p {
  color: #bcd1e7;
}

:global(html.ormeco-dark) .notifications-page .table-meta {
  border-bottom-color: #2d435d;
  background: #13263d;
}

:global(html.ormeco-dark) .notifications-page .summary-label,
:global(html.ormeco-dark) .notifications-page .empty-state {
  color: #a6bed8;
}

:global(html.ormeco-dark) .notifications-page .summary-card strong,
:global(html.ormeco-dark) .notifications-page .page-title,
:global(html.ormeco-dark) .notifications-page .page-subtitle {
  color: #e9f3ff;
}

:global(html.ormeco-dark) .notifications-page .title-main {
  color: #f2f8ff !important;
}

:global(html.ormeco-dark) .notifications-page .title-meta {
  color: #b8cde3 !important;
}

:global(html.ormeco-dark) .notifications-page .title-meta.unread {
  color: #9dd2ff !important;
}

:global(html.ormeco-dark) .notifications-page .message-cell {
  color: #d8e9fb !important;
  font-weight: 500;
}

:global(html.ormeco-dark) .notifications-page .created-cell {
  color: #d3e4f7 !important;
  font-weight: 700;
}

:global(html.ormeco-dark) .notifications-page .status-select,
:global(html.ormeco-dark) .notifications-page .search-input {
  background: #142436;
  border-color: #33506f;
  color: #e9f3ff;
}

:global(html.ormeco-dark) .notifications-page :deep(.data-table th),
:global(html.ormeco-dark) .notifications-page :deep(.data-table td) {
  border-bottom-color: #2d435d !important;
}

:global(html.ormeco-dark) .notifications-page :deep(.data-table td) {
  color: #e7f2ff !important;
}

:global(html.ormeco-dark) .notifications-page :deep(.data-table th) {
  background: #13263d !important;
  color: #a6bed8 !important;
}

:global(html.ormeco-dark) .notifications-page :deep(.table-row:hover) {
  background: transparent !important;
  transform: none !important;
}

:global(html.ormeco-dark) .notifications-page .type-badge,
:global(html.ormeco-dark) .notifications-page .status-badge {
  border: 1px solid transparent;
}

:global(html.ormeco-dark) .notifications-page .type-benefits {
  background: rgba(73, 202, 143, 0.2);
  color: #a5f2cd;
  border-color: rgba(73, 202, 143, 0.34);
}

:global(html.ormeco-dark) .notifications-page .type-incidents {
  background: rgba(243, 193, 91, 0.22);
  color: #ffe1a4;
  border-color: rgba(243, 193, 91, 0.36);
}

:global(html.ormeco-dark) .notifications-page .type-seminars {
  background: rgba(108, 152, 255, 0.2);
  color: #d4e3ff;
  border-color: rgba(108, 152, 255, 0.34);
}

:global(html.ormeco-dark) .notifications-page .type-system {
  background: rgba(255, 125, 175, 0.2);
  color: #ffd0e7;
  border-color: rgba(255, 125, 175, 0.34);
}

:global(html.ormeco-dark) .notifications-page .status-badge.unread {
  background: rgba(83, 171, 255, 0.2);
  color: #cde3ff;
  border-color: rgba(83, 171, 255, 0.34);
}

:global(html.ormeco-dark) .notifications-page .btn-edit {
  background: transparent;
  border-color: transparent;
  color: #e9f3ff;
}

:global(html.ormeco-dark) .notifications-page .btn-edit:hover {
  background: #1a2f49;
  border-color: #47688d;
}

:global(html.ormeco-dark) .notifications-page .btn-delete {
  background: transparent;
  border-color: transparent;
  color: #ffadad;
}

:global(html.ormeco-dark) .notifications-page .btn-delete:hover {
  background: rgba(200, 73, 73, 0.24);
  border-color: rgba(255, 125, 125, 0.48);
  color: #ffc3c3;
}

:global(html.ormeco-dark) .notifications-page .row-actions {
  background: #13263d;
  border-color: #35506f;
}
</style>
