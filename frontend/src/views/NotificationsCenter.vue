<template>
  <div class="page-shell notifications-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Notifications & Alerts Center</h2>
        <p class="page-subtitle">Centralized workflow alerts for benefits, incidents, seminars, and system anomalies.</p>
      </div>

      <div class="page-actions">
        <button class="btn btn-secondary" @click="markAll(true)" :disabled="loading || !items.length">Mark All Read</button>
        <button class="btn btn-secondary" @click="markAll(false)" :disabled="loading || !items.length">Mark All Unread</button>
      </div>
    </div>

    <section class="summary-grid" v-if="summary">
      <article class="summary-card card-surface"><span>Total</span><strong>{{ summary.total }}</strong></article>
      <article class="summary-card card-surface"><span>Unread</span><strong>{{ summary.unread }}</strong></article>
      <article class="summary-card card-surface"><span>Benefits</span><strong>{{ summary.byType.benefits }}</strong></article>
      <article class="summary-card card-surface"><span>Incidents</span><strong>{{ summary.byType.incidents }}</strong></article>
      <article class="summary-card card-surface"><span>Seminars</span><strong>{{ summary.byType.seminars }}</strong></article>
      <article class="summary-card card-surface"><span>System</span><strong>{{ summary.byType.system }}</strong></article>
    </section>

    <section class="card-surface filter-card">
      <div class="filter-row">
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

        <select v-model="filters.status" class="status-select" @change="load">
          <option value="all">All Status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>

        <input
          v-model.trim="filters.q"
          @keyup.enter="load"
          class="search-input"
          type="text"
          placeholder="Search title or message"
        />

        <button class="btn btn-primary" @click="load">Apply</button>
      </div>
    </section>

    <section class="card-surface table-card">
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
            <tr v-for="item in items" :key="item.id">
              <td><span class="type-badge" :class="`type-${item.type}`">{{ item.type }}</span></td>
              <td>{{ item.title }}</td>
              <td>{{ item.body }}</td>
              <td>
                <span class="status-badge" :class="item.is_read ? 'read' : 'unread'">
                  {{ item.is_read ? "Read" : "Unread" }}
                </span>
              </td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-secondary btn-sm" @click="toggleRead(item)">
                    {{ item.is_read ? "Mark Unread" : "Mark Read" }}
                  </button>
                  <button class="btn btn-danger btn-sm" @click="remove(item)">Delete</button>
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
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to load notifications");
  } finally {
    loading.value = false;
  }
};

const changeType = async (type) => {
  filters.type = type;
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
  gap: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.summary-card {
  padding: 12px;
  border: 1px solid #d7e4f2;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #f8fcff);
}

.summary-card span {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  color: #5e7694;
  letter-spacing: 0.05em;
}

.summary-card strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  color: #10233e;
}

.filter-card,
.table-card {
  padding: 12px;
  border: 1px solid #d7e4f2;
  border-radius: 14px;
  background: #fff;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 170px 1fr auto;
  gap: 10px;
  align-items: center;
}

.type-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
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
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 14px;
  color: #2d425f;
  background: #fff;
}

.table-wrap {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  border-bottom: 1px solid #e5edf7;
  padding: 11px 10px;
  text-align: left;
  vertical-align: top;
}

.report-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: #47617f;
  background: #f3f8fd;
  letter-spacing: 0.06em;
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

.row-actions {
  display: flex;
  gap: 6px;
}

.btn-sm {
  padding: 5px 8px;
  font-size: 12px;
}

.btn-danger {
  border: 1px solid #f2b8be;
  background: #fff1f3;
  color: #b42331;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #5f738f;
}

@media (max-width: 1000px) {
  .filter-row {
    grid-template-columns: 1fr;
  }

  .row-actions {
    flex-direction: column;
  }
}

:global(html.ormeco-dark) .notifications-page .summary-card,
:global(html.ormeco-dark) .notifications-page .filter-card,
:global(html.ormeco-dark) .notifications-page .table-card {
  background: #0f1d31;
  border-color: #33506f;
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

:global(html.ormeco-dark) .notifications-page .btn-danger {
  background: rgba(200, 73, 73, 0.14);
  border-color: rgba(255, 125, 125, 0.34);
  color: #ffadad;
}
</style>
