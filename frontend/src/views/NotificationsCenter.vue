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
      <article class="summary-card card-surface summary-total"><span>Total</span><strong>{{ summary.total }}</strong></article>
      <article class="summary-card card-surface summary-unread"><span>Unread</span><strong>{{ summary.unread }}</strong></article>
      <article class="summary-card card-surface summary-benefits"><span>Benefits</span><strong>{{ summary.byType.benefits }}</strong></article>
      <article class="summary-card card-surface summary-incidents"><span>Incidents</span><strong>{{ summary.byType.incidents }}</strong></article>
      <article class="summary-card card-surface summary-seminars"><span>Seminars</span><strong>{{ summary.byType.seminars }}</strong></article>
      <article class="summary-card card-surface summary-system"><span>System</span><strong>{{ summary.byType.system }}</strong></article>
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

      <div v-else class="table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Message</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" :class="{ 'unread-row': !item.is_read }">
              <td><span class="type-badge" :class="`type-${item.type}`">{{ item.type }}</span></td>
              <td class="title-cell">{{ item.title }}</td>
              <td class="message-cell">{{ item.body }}</td>
              <td>
                <span class="status-badge" :class="item.is_read ? 'read' : 'unread'">
                  {{ item.is_read ? "Read" : "Unread" }}
                </span>
              </td>
              <td class="created-cell">{{ formatDate(item.created_at) }}</td>
              <td class="actions-cell">
                <div class="row-actions">
                  <button class="btn btn-secondary btn-sm row-btn" @click="toggleRead(item)">
                    {{ item.is_read ? "Mark Unread" : "Mark Read" }}
                  </button>
                  <button class="btn btn-danger btn-sm row-btn" @click="remove(item)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import api from "../api";

const loading = ref(false);
const items = ref([]);
const summary = ref(null);

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
  { label: "General", value: "general" },
];

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

const toggleRead = async (item) => {
  try {
    await api.patch(`/notifications/${item.id}/read`, {
      is_read: !item.is_read,
    });
    await load();
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
  grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
  gap: 11px;
}

.summary-card {
  position: relative;
  overflow: hidden;
  padding: 13px 14px;
  border: 1px solid #d7e4f2;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #f7fbff);
}

.summary-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 3px;
  background: #b7cde8;
}

.summary-card span {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  color: #5e7694;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.summary-card strong {
  display: block;
  margin-top: 7px;
  font-size: 24px;
  color: #10233e;
  line-height: 1;
}

.summary-total::before { background: #8ea8c7; }
.summary-unread::before { background: #1d87d1; }
.summary-benefits::before { background: #12906f; }
.summary-incidents::before { background: #d77e2f; }
.summary-seminars::before { background: #356fb4; }
.summary-system::before { background: #ca4d80; }

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
  border: 1px solid #d3dfed;
  border-radius: 11px;
  min-height: 44px;
  padding: 10px 12px;
  font-size: 14px;
  color: #2d425f;
  background: #fff;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.status-select:focus,
.search-input:focus {
  outline: none;
  border-color: #8fc4e9;
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
  background: linear-gradient(180deg, #fbfdff 0%, #f4f8fd 100%);
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
  border: 1px solid #d5e2f1;
  background: #ffffff;
  font-size: 12px;
  font-weight: 800;
  color: #4f6787;
}

.table-wrap {
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 330px);
}

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  border-bottom: 1px solid #e5edf7;
  padding: 14px 14px;
  text-align: left;
  vertical-align: top;
}

.report-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: #47617f;
  background: #f3f8fd;
  letter-spacing: 0.06em;
  position: sticky;
  top: 0;
  z-index: 1;
}

.report-table tbody tr {
  transition: background 0.18s ease;
}

.report-table tbody tr:hover {
  background: #f8fbff;
}

.unread-row {
  background: linear-gradient(90deg, rgba(31, 135, 209, 0.06) 0%, rgba(31, 135, 209, 0) 45%);
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
.type-general { background: #f0f3f8; color: #4b6280; }

.status-badge.read { background: #eef3f8; color: #4f6786; }
.status-badge.unread { background: #e7f6ff; color: #1f78b5; }

.title-cell {
  font-weight: 700;
  color: #1b3555;
  min-width: 210px;
}

.message-cell {
  min-width: 300px;
  max-width: 520px;
  color: #2d4463;
  line-height: 1.35;
}

.created-cell {
  min-width: 180px;
  color: #3d5a7a;
  font-weight: 600;
}

.actions-cell {
  min-width: 200px;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 13px;
}

.row-btn {
  min-width: 112px;
}

.btn-danger {
  border: 1px solid #efb8bf;
  background: #fff4f6;
  color: #b42331;
}

.btn-danger:hover {
  background: #ffecee;
  border-color: #e89da8;
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

  .table-wrap {
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

:global(html.ormeco-dark) .notifications-page .summary-card::before {
  opacity: 0.95;
}

:global(html.ormeco-dark) .notifications-page .filter-head h3,
:global(html.ormeco-dark) .notifications-page .control-label,
:global(html.ormeco-dark) .notifications-page .table-title,
:global(html.ormeco-dark) .notifications-page .table-count,
:global(html.ormeco-dark) .notifications-page .created-cell {
  color: #bfd5ec;
}

:global(html.ormeco-dark) .notifications-page .filter-head p,
:global(html.ormeco-dark) .notifications-page .table-count,
:global(html.ormeco-dark) .notifications-page .table-title {
  border-color: #35506f;
}

:global(html.ormeco-dark) .notifications-page .table-meta {
  border-bottom-color: #2d435d;
  background: #13263d;
}

:global(html.ormeco-dark) .notifications-page .summary-card span,
:global(html.ormeco-dark) .notifications-page .report-table th,
:global(html.ormeco-dark) .notifications-page .empty-state {
  color: #a6bed8;
}

:global(html.ormeco-dark) .notifications-page .summary-card strong,
:global(html.ormeco-dark) .notifications-page .report-table td,
:global(html.ormeco-dark) .notifications-page .page-title,
:global(html.ormeco-dark) .notifications-page .page-subtitle {
  color: #e9f3ff;
}

:global(html.ormeco-dark) .notifications-page .title-cell {
  color: #e7f2ff;
}

:global(html.ormeco-dark) .notifications-page .message-cell {
  color: #d3e4f7;
}

:global(html.ormeco-dark) .notifications-page .status-select,
:global(html.ormeco-dark) .notifications-page .search-input {
  background: #142436;
  border-color: #33506f;
  color: #e9f3ff;
}

:global(html.ormeco-dark) .notifications-page .report-table th,
:global(html.ormeco-dark) .notifications-page .report-table td {
  border-bottom-color: #2d435d;
}

:global(html.ormeco-dark) .notifications-page .report-table th {
  background: #13263d;
}

:global(html.ormeco-dark) .notifications-page .unread-row {
  background: linear-gradient(90deg, rgba(73, 162, 226, 0.16) 0%, rgba(73, 162, 226, 0) 55%);
}

:global(html.ormeco-dark) .notifications-page .btn-danger {
  background: rgba(200, 73, 73, 0.14);
  border-color: rgba(255, 125, 125, 0.34);
  color: #ffadad;
}
</style>
