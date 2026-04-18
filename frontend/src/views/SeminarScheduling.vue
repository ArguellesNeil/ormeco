<template>
  <div class="page-shell seminar-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Seminar Scheduling</h2>
        <p class="page-subtitle">Review, approve, or reject seminar schedule requests from members.</p>
      </div>

      <div class="page-actions">
        <div class="filter-wrap">
          <label class="filter-label" for="status-filter">Status</label>
          <select id="status-filter" v-model="statusFilter" class="select" @change="load">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <button type="button" class="btn btn-secondary" @click="load" :disabled="loading">
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loading" class="card-surface state-card">Loading seminar schedule requests...</div>
    <div v-else-if="error" class="card-surface state-card error">{{ error }}</div>

    <template v-else>
      <section class="monitor-grid">
        <article class="card-surface monitor-card">
          <span class="monitor-label">Approved Today</span>
          <strong class="monitor-value">{{ todayStats.approved }}</strong>
          <small>{{ formatDate(todayStats.date) }}</small>
        </article>

        <article class="card-surface monitor-card">
          <span class="monitor-label">Total Requests Today</span>
          <strong class="monitor-value">{{ todayStats.total }}</strong>
          <small>Pending: {{ todayStats.pending }} | Rejected: {{ todayStats.rejected }}</small>
        </article>

        <article class="card-surface monitor-card date-monitor">
          <div class="date-head">
            <span class="monitor-label">Selected Date Monitor</span>
            <input v-model="monitorDate" type="date" class="input date-input" />
          </div>
          <strong class="monitor-value">{{ selectedDateStats.approved }}</strong>
          <small>
            Approved count on {{ formatDate(selectedDateStats.date) }}
            (Total: {{ selectedDateStats.total }})
          </small>
        </article>
      </section>

      <section class="card-surface date-summary-card">
        <div class="summary-head">
          <h3>Seminar Date Visibility</h3>
          <span>Per-date monitoring overview</span>
        </div>

        <div v-if="!topDates.length" class="empty-state compact">
          No seminar date data available yet.
        </div>

        <div v-else class="table-wrap">
          <table class="seminar-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Requests</th>
                <th>Approved</th>
                <th>Pending</th>
                <th>Rejected</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in topDates" :key="item.date" :class="{ 'date-highlight': item.date === monitorDate }">
                <td>{{ formatDate(item.date) }}</td>
                <td>{{ item.total }}</td>
                <td>{{ item.approved }}</td>
                <td>{{ item.pending }}</td>
                <td>{{ item.rejected }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card-surface calendar-card">
        <div class="calendar-head">
          <div class="calendar-head-main">
            <div class="calendar-title-wrap">
              <p class="calendar-kicker">Seminar Monitoring</p>
              <h3>Approved Seminars Calendar</h3>
              <span>Monthly monitoring of approved seminar participants per date</span>
            </div>

            <div class="calendar-controls">
              <button type="button" class="btn btn-secondary btn-sm nav-btn" @click="shiftCalendarMonth(-1)">Prev</button>
              <strong class="calendar-month-label">{{ calendarMonthLabel }}</strong>
              <button type="button" class="btn btn-secondary btn-sm nav-btn" @click="shiftCalendarMonth(1)">Next</button>
              <button type="button" class="btn btn-primary btn-sm" @click="jumpToToday">Today</button>
            </div>
          </div>

          <div class="calendar-head-sub">
            <div class="calendar-legend">
              <span class="legend-title">Approved Density</span>
              <span class="legend-chip level-none">0</span>
              <span class="legend-chip level-low">Low</span>
              <span class="legend-chip level-mid">Medium</span>
              <span class="legend-chip level-high">High</span>
            </div>

            <div class="calendar-mini-stats">
              <div class="calendar-mini-stat">
                <span>Approved This Month</span>
                <strong>{{ calendarMonthStats.approved }}</strong>
              </div>
              <div class="calendar-mini-stat">
                <span>Total Requests</span>
                <strong>{{ calendarMonthStats.total }}</strong>
              </div>
              <div class="calendar-mini-stat">
                <span>Peak Approved / Day</span>
                <strong>{{ calendarMonthStats.peakApproved }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="calendar-weekdays">
          <span v-for="name in calendarWeekdays" :key="name">{{ name }}</span>
        </div>

        <div class="calendar-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="calendar-day"
            :class="{
              'is-outside': !cell.isCurrentMonth,
              'is-today': cell.isToday,
              'is-selected': cell.isSelected,
              'has-approved': cell.stats.approved > 0,
              'is-weekend': cell.isWeekend,
            }"
            :style="calendarCellStyle(cell)"
            @click="selectCalendarDate(cell)"
          >
            <div class="calendar-day-top">
              <span class="calendar-day-number">{{ cell.day }}</span>
              <span class="calendar-day-dot" />
            </div>
            <span class="calendar-approved-count">{{ cell.stats.approved }} approved</span>
            <span class="calendar-density-bar">
              <span class="calendar-density-fill" />
            </span>
            <span class="calendar-total-count">Total: {{ cell.stats.total }}</span>
          </button>
        </div>
      </section>

      <section class="card-surface table-card">
        <div v-if="!requests.length" class="empty-state">
          No seminar requests found for the selected filter.
        </div>

        <div v-else class="table-wrap">
          <table class="seminar-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Member</th>
                <th>Email</th>
                <th>Seminar Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Reviewed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in requests" :key="row.id">
                <td>#{{ row.id }}</td>
                <td>
                  <div class="member-cell">
                    <strong>{{ row.member_name || "-" }}</strong>
                    <span>{{ row.member_code || "-" }}</span>
                  </div>
                </td>
                <td>{{ row.email || "-" }}</td>
                <td>{{ formatDate(row.seminar_date) }}</td>
                <td>{{ formatTime(row.start_time) }} - {{ formatTime(row.end_time) }}</td>
                <td>
                  <span class="status-chip" :class="statusClass(row.status)">{{ row.status }}</span>
                </td>
                <td>{{ formatDateTime(row.created_at) }}</td>
                <td>{{ formatDateTime(row.reviewed_at) }}</td>
                <td>
                  <button type="button" class="btn btn-primary btn-sm" @click="openReview(row)">
                    Review
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-panel glass-soft review-modal">
        <h3 class="modal-title">Review Seminar Request</h3>

        <div class="summary-grid card-surface">
          <p><strong>Request ID:</strong> #{{ selected.id }}</p>
          <p><strong>Member:</strong> {{ selected.member_name || "-" }}</p>
          <p><strong>Member Code:</strong> {{ selected.member_code || "-" }}</p>
          <p><strong>Email:</strong> {{ selected.email || "-" }}</p>
          <p><strong>Date:</strong> {{ formatDate(selected.seminar_date) }}</p>
          <p><strong>Time:</strong> {{ formatTime(selected.start_time) }} - {{ formatTime(selected.end_time) }}</p>
        </div>

        <label class="form-field">
          <span class="form-label">Status</span>
          <select v-model="reviewForm.status" class="select">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label class="form-field">
          <span class="form-label">Remarks</span>
          <textarea
            v-model="reviewForm.remarks"
            class="textarea"
            rows="4"
            placeholder="Add notes about your decision..."
          ></textarea>
        </label>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="submitReview" :disabled="saving">
            {{ saving ? "Saving..." : "Save Review" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import api from "../api";

const requests = ref([]);
const allRequests = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const statusFilter = ref("all");

const showModal = ref(false);
const selected = ref({});
const reviewForm = ref({
  status: "pending",
  remarks: "",
});

const todayDateKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const monitorDate = ref(todayDateKey());
const calendarCursor = ref(todayDateKey().slice(0, 7));
const calendarWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusClass = (status) => String(status || "").toLowerCase().replace(/\s+/g, "-");

const getDateKey = (value) => {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    return d.toLocaleDateString();
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatTime = (value) => {
  if (!value) return "-";
  if (typeof value !== "string") return String(value);
  const [hh, mm] = value.split(":");
  if (hh == null || mm == null) return value;
  const h = Number(hh);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 || 12;
  return `${hr12}:${mm} ${suffix}`;
};

const dateSummary = computed(() => {
  const map = new Map();
  for (const row of allRequests.value) {
    const key = getDateKey(row.seminar_date);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        date: key,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      });
    }

    const item = map.get(key);
    item.total += 1;

    const status = String(row.status || "").toLowerCase();
    if (status === "approved") item.approved += 1;
    else if (status === "pending") item.pending += 1;
    else if (status === "rejected") item.rejected += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
});

const todayStats = computed(() => {
  const today = todayDateKey();
  return dateSummary.value.find((x) => x.date === today) || {
    date: today,
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  };
});

const selectedDateStats = computed(() => {
  const key = monitorDate.value;
  return dateSummary.value.find((x) => x.date === key) || {
    date: key,
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  };
});

const topDates = computed(() => dateSummary.value.slice(0, 12));

const dateSummaryMap = computed(() => {
  const map = new Map();
  for (const item of dateSummary.value) {
    map.set(item.date, item);
  }
  return map;
});

const maxApprovedInView = computed(() => {
  let max = 0;
  for (const cell of calendarCells.value) {
    if (cell.stats.approved > max) max = cell.stats.approved;
  }
  return max;
});

const calendarMonthStats = computed(() => {
  let approved = 0;
  let total = 0;
  let peakApproved = 0;

  for (const cell of calendarCells.value) {
    if (!cell.isCurrentMonth) continue;
    const approvedCount = Number(cell.stats.approved || 0);
    const totalCount = Number(cell.stats.total || 0);
    approved += approvedCount;
    total += totalCount;
    if (approvedCount > peakApproved) peakApproved = approvedCount;
  }

  return { approved, total, peakApproved };
});

const calendarMonthLabel = computed(() => {
  const [yyyy, mm] = String(calendarCursor.value || "").split("-").map(Number);
  if (!yyyy || !mm) return "";
  const d = new Date(yyyy, mm - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
});

const toMonthCursor = (year, monthIndex) => {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(monthIndex + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

const calendarCells = computed(() => {
  const [yyyy, mm] = String(calendarCursor.value || "").split("-").map(Number);
  if (!yyyy || !mm) return [];

  const firstOfMonth = new Date(yyyy, mm - 1, 1);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  const firstWeekdayMonBased = (firstOfMonth.getDay() + 6) % 7;
  const cells = [];
  const base = new Date(yyyy, mm - 1, 1 - firstWeekdayMonBased);

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);

    const key = getDateKey(d);
    const stats =
      dateSummaryMap.value.get(key) || {
        date: key,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      };

    cells.push({
      key,
      day: d.getDate(),
      weekday: d.getDay(),
      isCurrentMonth: d.getMonth() === mm - 1,
      isToday: key === todayDateKey(),
      isSelected: key === monitorDate.value,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      stats,
    });
  }

  return cells;
});

const shiftCalendarMonth = (delta) => {
  const [yyyy, mm] = String(calendarCursor.value || "").split("-").map(Number);
  if (!yyyy || !mm) return;
  const d = new Date(yyyy, mm - 1 + delta, 1);
  calendarCursor.value = toMonthCursor(d.getFullYear(), d.getMonth());
};

const jumpToToday = () => {
  const today = todayDateKey();
  monitorDate.value = today;
  calendarCursor.value = today.slice(0, 7);
};

const calendarCellStyle = (cell) => {
  const max = maxApprovedInView.value;
  const approved = Number(cell && cell.stats ? cell.stats.approved : 0) || 0;
  const ratio = max > 0 ? approved / max : 0;
  const alpha = approved <= 0 ? 0 : 0.18 + ratio * 0.62;
  const fill = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return {
    "--approved-alpha": alpha.toFixed(3),
    "--approved-fill": `${fill}%`,
  };
};

const selectCalendarDate = (cell) => {
  if (!cell || !cell.key) return;
  monitorDate.value = cell.key;
  if (!cell.isCurrentMonth) {
    const d = new Date(`${cell.key}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      calendarCursor.value = toMonthCursor(d.getFullYear(), d.getMonth());
    }
  }
};

watch(
  monitorDate,
  (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return;
    calendarCursor.value = String(value).slice(0, 7);
  },
  { immediate: true }
);

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const query = statusFilter.value === "all" ? "" : `?status=${encodeURIComponent(statusFilter.value)}`;
    const [filteredRes, allRes] = await Promise.all([
      api.get(`/seminar-schedules${query}`),
      api.get("/seminar-schedules"),
    ]);

    requests.value = Array.isArray(filteredRes.data) ? filteredRes.data : [];
    allRequests.value = Array.isArray(allRes.data) ? allRes.data : [];
  } catch (err) {
    error.value = (err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to load seminar schedule requests";
  } finally {
    loading.value = false;
  }
};

const openReview = (row) => {
  selected.value = { ...row };
  reviewForm.value = {
    status: row.status || "pending",
    remarks: row.remarks || "",
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const submitReview = async () => {
  saving.value = true;
  try {
    await api.put(`/seminar-schedules/${selected.value.id}/status`, {
      status: reviewForm.value.status,
      remarks: reviewForm.value.remarks,
    });
    showModal.value = false;
    await load();
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to update seminar request");
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.seminar-page {
  display: grid;
  gap: 12px;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.monitor-card {
  padding: 14px;
  border-radius: 14px;
}

.monitor-label {
  display: block;
  font-size: 12px;
  color: #577090;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.monitor-value {
  display: block;
  margin-top: 6px;
  font-size: 30px;
  line-height: 1;
  color: #173a59;
}

.monitor-card small {
  display: block;
  margin-top: 6px;
  color: #607792;
  font-size: 12px;
}

.date-monitor .date-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.date-input {
  width: 170px;
  padding: 7px 10px;
  border-radius: 10px;
}

.date-summary-card {
  padding: 12px;
}

.calendar-card {
  padding: 12px;
}

.calendar-head {
  border: 1px solid #dbe8f4;
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 10px;
  background:
    linear-gradient(160deg, #f7fbff, #f1f7ff 55%, #f9fcff),
    radial-gradient(circle at 8% 10%, rgba(31, 125, 214, 0.08), transparent 38%);
}

.calendar-head-main {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.calendar-title-wrap {
  display: grid;
  gap: 4px;
}

.calendar-kicker {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4b78a5;
  font-weight: 900;
}

.calendar-head h3 {
  margin: 0;
  font-size: 30px;
  line-height: 1.05;
  color: #21405f;
}

.calendar-head span {
  display: block;
  font-size: 14px;
  color: #68819d;
  font-weight: 600;
}

.calendar-head-sub {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.calendar-mini-stats {
  display: flex;
  gap: 8px;
}

.calendar-mini-stat {
  border: 1px solid #cfe0f1;
  background: #ffffff;
  border-radius: 12px;
  padding: 6px 10px;
  min-width: 118px;
}

.calendar-mini-stat span {
  margin: 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 800;
  color: #6c84a0;
}

.calendar-mini-stat strong {
  display: block;
  margin-top: 3px;
  font-size: 16px;
  line-height: 1;
  color: #173a59;
}

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  min-width: 68px;
}

.calendar-month-label {
  min-width: 150px;
  text-align: center;
  color: #21405f;
  font-size: 16px;
  line-height: 1.2;
}

.calendar-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0;
}

.legend-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #607792;
  font-weight: 800;
}

.legend-chip {
  border-radius: 999px;
  border: 1px solid #d5e3f1;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #476381;
  background: #f8fbff;
}

.legend-chip.level-none {
  background: #f4f7fb;
}

.legend-chip.level-low {
  background: rgba(63, 179, 126, 0.12);
}

.legend-chip.level-mid {
  background: rgba(63, 179, 126, 0.22);
}

.legend-chip.level-high {
  background: rgba(63, 179, 126, 0.36);
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.calendar-weekdays span {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #68819d;
  font-weight: 800;
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calendar-day {
  border: 1px solid #dbe7f3;
  border-radius: 12px;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.75), rgba(248, 251, 255, 0.95)),
    radial-gradient(circle at top right, rgba(54, 143, 219, 0.05), transparent 55%),
    #f8fbff;
  padding: 10px;
  min-height: 106px;
  display: grid;
  align-content: start;
  gap: 4px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.calendar-day:hover {
  border-color: #92b7de;
  box-shadow: 0 6px 16px rgba(32, 74, 118, 0.1);
  transform: translateY(-1px);
}

.calendar-day-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.calendar-day-number {
  font-size: 18px;
  font-weight: 800;
  color: #21405f;
  line-height: 1;
}

.calendar-day-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(67, 106, 143, 0.2);
}

.calendar-approved-count {
  font-size: 14px;
  font-weight: 800;
  color: color-mix(in srgb, #1f7a58 calc(var(--approved-alpha, 0.2) * 100%), #32557a);
}

.calendar-density-bar {
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: #e6eff8;
  overflow: hidden;
}

.calendar-density-fill {
  display: block;
  width: var(--approved-fill, 0%);
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #3fb37e, #1f7dd6);
  transition: width 0.2s ease;
}

.calendar-total-count {
  font-size: 12px;
  color: #607792;
}

.calendar-day.is-outside {
  opacity: 0.56;
  background: #f4f7fb;
}

.calendar-day.is-selected {
  border-color: #1f7dd6;
  box-shadow: 0 0 0 2px rgba(31, 125, 214, 0.2);
}

.calendar-day.is-today {
  border-color: #2a9d66;
}

.calendar-day.has-approved {
  background:
    linear-gradient(145deg, rgba(244, 255, 248, 0.86), rgba(248, 252, 255, 0.96)),
    radial-gradient(circle at top right, rgba(35, 154, 101, calc(var(--approved-alpha, 0.2) * 0.45)), transparent 56%);
}

.calendar-day.has-approved .calendar-day-dot {
  background: #3fb37e;
}

.calendar-day.is-weekend {
  border-style: dashed;
}

.summary-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-head h3 {
  margin: 0;
  font-size: 17px;
  color: #21405f;
}

.summary-head span {
  font-size: 12px;
  color: #68819d;
  font-weight: 700;
}

.date-highlight {
  background: #edf8f4;
}

.filter-wrap {
  min-width: 170px;
}

.filter-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #577090;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
}

.seminar-table {
  width: 100%;
  border-collapse: collapse;
}

.seminar-table thead {
  background: #f3f8fe;
}

.seminar-table th,
.seminar-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #ebf1f7;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
  white-space: nowrap;
}

.seminar-table th {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #385676;
}

.member-cell {
  display: grid;
  gap: 2px;
}

.member-cell span {
  color: #607792;
  font-size: 12px;
}

.btn-sm {
  padding: 7px 11px;
  font-size: 12px;
  border-radius: 10px;
}

.state-card {
  padding: 16px;
  font-weight: 700;
}

.state-card.error {
  color: #b73838;
  border-color: #f2c2c2;
  background: #fff2f2;
}

.empty-state {
  padding: 28px;
  text-align: center;
  color: #5f738f;
  font-weight: 700;
}

.review-modal {
  width: min(620px, 94vw);
}

.summary-grid {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
}

.summary-grid p {
  margin: 0;
  font-size: 13px;
  color: #425b78;
}

@media (max-width: 1100px) {
  .monitor-grid {
    grid-template-columns: 1fr;
  }

  .date-input {
    width: 150px;
  }
}

@media (max-width: 920px) {
  .seminar-table th,
  .seminar-table td {
    padding: 10px 12px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .date-monitor .date-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-head-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-head {
    padding: 10px;
  }

  .calendar-head h3 {
    font-size: 24px;
  }

  .calendar-head span {
    font-size: 13px;
  }

  .calendar-head-sub {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-controls {
    width: 100%;
    flex-wrap: wrap;
  }

  .calendar-month-label {
    min-width: 0;
    flex: 1;
  }

  .calendar-legend {
    flex-wrap: wrap;
  }

  .calendar-mini-stats {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .calendar-mini-stat {
    min-width: 0;
  }

  .calendar-grid,
  .calendar-weekdays {
    gap: 6px;
  }

  .calendar-day {
    min-height: 92px;
    padding: 8px;
  }

  .calendar-day-number {
    font-size: 16px;
  }

  .calendar-approved-count {
    font-size: 13px;
  }
}

:global(html.ormeco-dark) .seminar-page .monitor-card,
:global(html.ormeco-dark) .seminar-page .date-summary-card,
:global(html.ormeco-dark) .seminar-page .calendar-card,
:global(html.ormeco-dark) .seminar-page .table-card,
:global(html.ormeco-dark) .seminar-page .summary-grid {
  background: #0f1d31;
  border-color: #33506f;
}

:global(html.ormeco-dark) .seminar-page .calendar-head {
  border-color: #36516f;
  background: #0f1d31;
}

:global(html.ormeco-dark) .seminar-page .monitor-label,
:global(html.ormeco-dark) .seminar-page .monitor-card small,
:global(html.ormeco-dark) .seminar-page .summary-head span,
:global(html.ormeco-dark) .seminar-page .calendar-head span,
:global(html.ormeco-dark) .seminar-page .calendar-weekdays span,
:global(html.ormeco-dark) .seminar-page .calendar-total-count,
:global(html.ormeco-dark) .seminar-page .legend-title,
:global(html.ormeco-dark) .seminar-page .calendar-mini-stat span,
:global(html.ormeco-dark) .seminar-page .filter-label,
:global(html.ormeco-dark) .seminar-page .member-cell span,
:global(html.ormeco-dark) .seminar-page .empty-state,
:global(html.ormeco-dark) .seminar-page .summary-grid p {
  color: #a6bed8;
}

:global(html.ormeco-dark) .seminar-page .monitor-value,
:global(html.ormeco-dark) .seminar-page .summary-head h3,
:global(html.ormeco-dark) .seminar-page .calendar-head h3,
:global(html.ormeco-dark) .seminar-page .calendar-kicker,
:global(html.ormeco-dark) .seminar-page .calendar-day-number,
:global(html.ormeco-dark) .seminar-page .calendar-month-label,
:global(html.ormeco-dark) .seminar-page .calendar-mini-stat strong,
:global(html.ormeco-dark) .seminar-page .seminar-table td,
:global(html.ormeco-dark) .seminar-page .member-cell strong {
  color: #e9f3ff;
}

:global(html.ormeco-dark) .seminar-page .calendar-mini-stat {
  border-color: #3c5a79;
  background: #122337;
}

:global(html.ormeco-dark) .seminar-page .calendar-day {
  border-color: #2d435d;
  background: #0f1d31;
}

:global(html.ormeco-dark) .seminar-page .calendar-day:hover {
  border-color: #3f6390;
  box-shadow: 0 8px 18px rgba(6, 12, 24, 0.45);
}

:global(html.ormeco-dark) .seminar-page .calendar-day.is-outside {
  opacity: 0.65;
  background: #0c1828;
}

:global(html.ormeco-dark) .seminar-page .calendar-day.has-approved {
  background: #122337;
}

:global(html.ormeco-dark) .seminar-page .calendar-approved-count {
  color: #7be0b5;
}

:global(html.ormeco-dark) .seminar-page .calendar-density-bar {
  background: #2a3f58;
}

:global(html.ormeco-dark) .seminar-page .legend-chip {
  border-color: #355170;
  background: #122337;
  color: #d3e6fb;
}

:global(html.ormeco-dark) .seminar-page .legend-chip.level-none {
  background: #0f1d31;
}

:global(html.ormeco-dark) .seminar-page .seminar-table thead {
  background: #13263d;
}

:global(html.ormeco-dark) .seminar-page .seminar-table th {
  color: #b8cde4;
}

:global(html.ormeco-dark) .seminar-page .seminar-table th,
:global(html.ormeco-dark) .seminar-page .seminar-table td,
:global(html.ormeco-dark) .seminar-page .status-chip,
:global(html.ormeco-dark) .seminar-page .date-highlight {
  border-color: #2d435d;
}

:global(html.ormeco-dark) .seminar-page .date-highlight {
  background: #16273d;
}

:global(html.ormeco-dark) .seminar-page .state-card.error {
  background: rgba(200, 73, 73, 0.14);
  border-color: rgba(255, 125, 125, 0.35);
  color: #ffb2b2;
}
</style>
