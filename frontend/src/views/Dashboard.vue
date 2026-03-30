<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div>
        <h2 class="title">Admin Dashboard</h2>
        <p class="subtitle">Welcome back! Here's what's happening today.</p>
      </div>
    </div>

    <div class="hero-strip">
      <div>
        <p class="hero-kicker">Realtime Admin Overview</p>
        <h3>Everything important is in one workspace.</h3>
      </div>
      <div class="hero-actions">
        <router-link to="/users" class="hero-pill">Manage Users</router-link>
        <router-link to="/incidents" class="hero-pill">Resolve Incidents</router-link>
        <router-link to="/benefit-approvals" class="hero-pill">Benefit Approvals</router-link>
        <router-link to="/seminar-scheduling" class="hero-pill">Review Seminar Requests</router-link>
        <router-link to="/reports" class="hero-pill">Open Reports</router-link>
        <router-link to="/billing-rates" class="hero-pill">Billing Setup</router-link>
      </div>
    </div>

    <div class="kpi-grid">
      <div
        v-for="(card, idx) in kpiCards"
        :key="card.label"
        class="kpi-card"
        :class="card.colorClass"
        :style="{ animationDelay: `${idx * 80}ms` }"
      >
        <div class="kpi-header">
          <div class="kpi-icon">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, pIdx) in getIconPaths(card.iconKey)" :key="`${card.label}-kpi-${pIdx}`" :d="d" />
            </svg>
          </div>
          <div class="kpi-trend" v-if="card.trend">
            <span class="trend-value">{{ card.trend }}</span>
          </div>
        </div>
        <div class="kpi-label">{{ card.label }}</div>
        <div class="kpi-value">{{ card.value }}</div>
      </div>
    </div>

    <div class="analytics-grid">
      <div class="card pulse-card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path v-for="(d, pIdx) in getIconPaths('chartLine')" :key="`pulse-icon-${pIdx}`" :d="d" />
              </svg>
            </div>
            <h3 class="card-title">Operational Pulse</h3>
          </div>
          <span class="link">Live</span>
        </div>

        <div class="pulse-layout">
          <div class="chart-shell">
            <div class="chart-ring" :style="{ background: chartBackground }"></div>
            <div class="chart-center" :style="{ borderColor: activeSegment.color + '33' }">
              <p>{{ activeSegment.label }}</p>
              <transition name="number-pop" mode="out-in">
                <h4 :key="`${activeSegment.label}-${activeSegment.value}`" :style="{ color: activeSegment.color }">{{ activeSegment.value }}</h4>
              </transition>
              <span :style="{ color: activeSegment.color }">{{ activeSegment.percent }}%</span>
            </div>
          </div>

          <ul class="insight-legend">
            <li
              v-for="(item, idx) in insightSegments"
              :key="item.label"
              class="legend-item"
              :class="{ active: activeSlice === idx }"
              @mouseenter="setActiveSlice(idx)"
              @click="setActiveSlice(idx)"
            >
              <span class="legend-color" :style="{ background: item.color }"></span>
              <span class="legend-label">{{ item.label }}</span>
              <span class="legend-value">{{ item.value }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="card quick-metrics">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path v-for="(d, pIdx) in getIconPaths('bell')" :key="`quick-icon-${pIdx}`" :d="d" />
              </svg>
            </div>
            <h3 class="card-title">Quick Metrics</h3>
          </div>
          <span class="link">Today</span>
        </div>

        <div class="quick-grid">
          <article class="quick-item">
            <span class="quick-label">Unread Notifications</span>
            <strong class="quick-value">{{ metrics.unreadNotifications }}</strong>
          </article>
          <article class="quick-item">
            <span class="quick-label">Total Users</span>
            <strong class="quick-value">{{ metrics.totalUsers }}</strong>
          </article>
          <article class="quick-item">
            <span class="quick-label">Open Incidents</span>
            <strong class="quick-value">{{ metrics.openIncidents }}</strong>
          </article>
          <article class="quick-item">
            <span class="quick-label">Pending Benefits</span>
            <strong class="quick-value">{{ metrics.pendingBenefits }}</strong>
          </article>
          <article class="quick-item">
            <span class="quick-label">Approved Benefits</span>
            <strong class="quick-value">{{ metrics.approvedBenefits }}</strong>
          </article>
          <article class="quick-item">
            <span class="quick-label">Pending Seminar Requests</span>
            <strong class="quick-value">{{ metrics.pendingSeminarRequests }}</strong>
          </article>
          <article class="quick-item">
            <span class="quick-label">Approved Seminars</span>
            <strong class="quick-value">{{ metrics.approvedSeminars }}</strong>
          </article>
          <article class="quick-item">
            <span class="quick-label">Seminars Scheduled Today</span>
            <strong class="quick-value">{{ metrics.todaySeminars }}</strong>
          </article>
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="card status-monitor-card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path v-for="(d, pIdx) in getIconPaths('compass')" :key="`status-icon-${pIdx}`" :d="d" />
              </svg>
            </div>
            <h3 class="card-title">Feature Status Monitor</h3>
          </div>
          <span class="link">Realtime</span>
        </div>

        <div class="status-monitor-grid">
          <article class="status-monitor-block">
            <h4>Benefit Applications</h4>
            <ul>
              <li v-for="item in benefitStatusBreakdown" :key="`benefit-${item.status}`">
                <span class="status-name">{{ item.status }}</span>
                <strong class="status-count">{{ item.total }}</strong>
              </li>
            </ul>
          </article>

          <article class="status-monitor-block">
            <h4>Seminar Scheduling</h4>
            <ul>
              <li v-for="item in seminarStatusBreakdown" :key="`seminar-${item.status}`">
                <span class="status-name">{{ item.status }}</span>
                <strong class="status-count">{{ item.total }}</strong>
              </li>
            </ul>
          </article>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path v-for="(d, pIdx) in getIconPaths('gift')" :key="`benefit-icon-${pIdx}`" :d="d" />
              </svg>
            </div>
            <h3 class="card-title">Recent Benefit Applications</h3>
          </div>
          <router-link to="/benefit-approvals" class="link">
            Review →
          </router-link>
        </div>

        <div v-if="recentBenefits.length" class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th v-for="h in ['ID','Applicant','Benefit','Status','Applied']" :key="h">
                  {{ h }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="b in recentBenefits" :key="b.id">
                <td><span class="badge badge-id">#{{ b.id }}</span></td>
                <td>{{ b.applicant_name || '-' }}</td>
                <td>{{ b.benefit_name || '-' }}</td>
                <td><span class="badge" :class="getStatusClass(b.status)">{{ b.status }}</span></td>
                <td class="date-cell">{{ formatDate(b.applied_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, pIdx) in getIconPaths('inbox')" :key="`benefit-empty-${pIdx}`" :d="d" />
            </svg>
          </div>
          <p>No benefit applications yet.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path v-for="(d, pIdx) in getIconPaths('alert')" :key="`incident-icon-${pIdx}`" :d="d" />
              </svg>
            </div>
            <h3 class="card-title">Recent Incidents</h3>
          </div>
          <router-link to="/incidents" class="link">
            View all →
          </router-link>
        </div>

        <div v-if="recentIncidents.length" class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th v-for="h in ['ID','Reporter','Category','Status','Reported At']" :key="h">
                  {{ h }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="i in recentIncidents" :key="i.id">
                <td><span class="badge badge-id">#{{ i.id }}</span></td>
                <td class="user-cell">
                  <div class="user-avatar">{{ getInitials(i.user_name) }}</div>
                  <span>{{ i.user_name }}</span>
                </td>
                <td>{{ i.category }}</td>
                <td><span class="badge" :class="getStatusClass(i.status)">{{ i.status }}</span></td>
                <td class="date-cell">{{ formatDate(i.reported_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, pIdx) in getIconPaths('inbox')" :key="`incident-empty-${pIdx}`" :d="d" />
            </svg>
          </div>
          <p>No incidents found.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path v-for="(d, pIdx) in getIconPaths('megaphone')" :key="`announcement-icon-${pIdx}`" :d="d" />
              </svg>
            </div>
            <h3 class="card-title">Latest Announcements</h3>
          </div>
          <router-link to="/announcements" class="link">
            Manage →
          </router-link>
        </div>

        <ul v-if="announcements.length" class="announcements-list">
          <li v-for="a in announcements" :key="a.id" class="announcement-item">
            <div class="announcement-header">
              <div class="announcement-icon">
                <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path v-for="(d, pIdx) in getIconPaths('file')" :key="`announcement-file-${pIdx}`" :d="d" />
                </svg>
              </div>
              <div class="announcement-title">{{ a.title }}</div>
            </div>

            <div class="announcement-meta">
              <span class="meta-icon" aria-hidden="true">
                <svg class="ui-icon" viewBox="0 0 24 24" fill="none">
                  <path v-for="(d, pIdx) in getIconPaths('user')" :key="`meta-user-${pIdx}`" :d="d" />
                </svg>
              </span>
              {{ a.created_by_name || ('User #' + a.created_by) }}
              <span class="meta-separator">•</span>
              <span class="meta-icon" aria-hidden="true">
                <svg class="ui-icon" viewBox="0 0 24 24" fill="none">
                  <path v-for="(d, pIdx) in getIconPaths('calendar')" :key="`meta-date-${pIdx}`" :d="d" />
                </svg>
              </span>
              {{ formatDate(a.created_at) }}
            </div>

            <div class="announcement-body">
              {{ truncate(a.body, 220) }}
            </div>
          </li>
        </ul>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, pIdx) in getIconPaths('inbox')" :key="`announcement-empty-${pIdx}`" :d="d" />
            </svg>
          </div>
          <p>No announcements yet.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-icon">
              <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path v-for="(d, pIdx) in getIconPaths('calendar')" :key="`seminar-icon-${pIdx}`" :d="d" />
              </svg>
            </div>
            <h3 class="card-title">Recent Seminar Requests</h3>
          </div>
          <router-link to="/seminar-scheduling" class="link">
            Manage →
          </router-link>
        </div>

        <div v-if="recentSeminars.length" class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th v-for="h in ['ID','Member','Date','Time','Status','Requested']" :key="h">
                  {{ h }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="s in recentSeminars" :key="s.id">
                <td><span class="badge badge-id">#{{ s.id }}</span></td>
                <td>{{ s.member_name || '-' }}</td>
                <td>{{ formatDate(s.seminar_date) }}</td>
                <td>{{ formatSeminarTime(s.start_time, s.end_time) }}</td>
                <td><span class="badge" :class="getStatusClass(s.status)">{{ s.status }}</span></td>
                <td class="date-cell">{{ formatDate(s.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path v-for="(d, pIdx) in getIconPaths('inbox')" :key="`seminar-empty-${pIdx}`" :d="d" />
            </svg>
          </div>
          <p>No seminar requests yet.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import api from "../api";

const ICON_PATHS = {
  user: [
    "M12 12C9.79 12 8 10.21 8 8C8 5.79 9.79 4 12 4C14.21 4 16 5.79 16 8C16 10.21 14.21 12 12 12Z",
    "M5 20C5 16.96 8.13 14.5 12 14.5C15.87 14.5 19 16.96 19 20"
  ],
  bolt: ["M13 3L6 13H11L10 21L18 10H13L13 3Z"],
  alert: ["M12 4L21 20H3L12 4Z", "M12 10V14", "M12 17H12.01"],
  gift: ["M4 10H20V20H4V10Z", "M12 10V20", "M4 14H20", "M12 10C10.2 10 8.5 8.8 8.5 7.2C8.5 5.9 9.5 5 10.8 5C11.6 5 12.3 5.4 12 6.3", "M12 10C13.8 10 15.5 8.8 15.5 7.2C15.5 5.9 14.5 5 13.2 5C12.4 5 11.7 5.4 12 6.3"],
  calendar: ["M7 3V6", "M17 3V6", "M4 9H20", "M6 5H18C19.1 5 20 5.9 20 7V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V7C4 5.9 4.9 5 6 5Z"],
  check: ["M4 12L9 17L20 6"],
  pin: ["M12 21C12 21 19 14.8 19 10C19 6.13 15.87 3 12 3C8.13 3 5 6.13 5 10C5 14.8 12 21 12 21Z", "M12 12.5C13.38 12.5 14.5 11.38 14.5 10C14.5 8.62 13.38 7.5 12 7.5C10.62 7.5 9.5 8.62 9.5 10C9.5 11.38 10.62 12.5 12 12.5Z"],
  chartLine: ["M4 19H20", "M6 15L10 11L13 13L18 8"],
  bell: ["M8 18H16", "M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18", "M6 16V11C6 7.69 8.69 5 12 5C15.31 5 18 7.69 18 11V16L20 18H4L6 16Z"],
  compass: ["M12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21Z", "M10 10L15 9L14 14L9 15L10 10Z"],
  megaphone: ["M3 13V11", "M5 11L13 7V17L5 13Z", "M13 10H16C17.66 10 19 11.34 19 13V17", "M5 13V19"],
  file: ["M7 3H14L19 8V21H7V3Z", "M14 3V8H19", "M10 13H16", "M10 17H16"],
  inbox: ["M3 12L6 6H18L21 12V19H3V12Z", "M3 12H8L10 15H14L16 12H21"]
};

const getIconPaths = (key) => ICON_PATHS[key] || ICON_PATHS.file;

const metrics = ref({
  totalUsers: 0,
  activeMeters: 0,
  openIncidents: 0,
  pendingBenefits: 0,
  approvedBenefits: 0,
  rejectedBenefits: 0,
  pendingSeminarRequests: 0,
  approvedSeminars: 0,
  todaySeminars: 0,
  todayApprovedSeminars: 0,
  unreadNotifications: 0
});

const kpiCards = ref([]);
const recentIncidents = ref([]);
const announcements = ref([]);
const recentSeminars = ref([]);
const recentBenefits = ref([]);
const benefitStatusBreakdown = ref([]);
const seminarStatusBreakdown = ref([]);
const activeSlice = ref(0);

const insightSegments = computed(() => {
  const raw = [
    { label: "Active Meters", value: Number(metrics.value.activeMeters) || 0, color: "#00A676" },
    { label: "Open Incidents", value: Number(metrics.value.openIncidents) || 0, color: "#E76F51" },
    { label: "Pending Benefits", value: Number(metrics.value.pendingBenefits) || 0, color: "#F4A261" },
    { label: "Approved Benefits", value: Number(metrics.value.approvedBenefits) || 0, color: "#2A9D8F" },
    { label: "Pending Seminar Requests", value: Number(metrics.value.pendingSeminarRequests) || 0, color: "#3A86FF" },
    { label: "Today's Approved Seminars", value: Number(metrics.value.todayApprovedSeminars) || 0, color: "#8338EC" },
    { label: "Unread Notifications", value: Number(metrics.value.unreadNotifications) || 0, color: "#FF006E" },
    { label: "Total Users", value: Number(metrics.value.totalUsers) || 0, color: "#264653" }
  ];

  const total = raw.reduce((sum, item) => sum + item.value, 0) || 1;
  return raw.map((item) => ({
    ...item,
    percent: Math.round((item.value / total) * 100)
  }));
});

const activeSegment = computed(() => insightSegments.value[activeSlice.value] || insightSegments.value[0] || {
  label: "No data",
  value: 0,
  percent: 0
});

const chartBackground = computed(() => {
  const segments = insightSegments.value;
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  let start = 0;
  const stops = segments.map((item) => {
    const slice = (item.value / total) * 360;
    const end = start + slice;
    const stop = `${item.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
});

const setActiveSlice = (idx) => {
  activeSlice.value = idx;
};

const truncate = (text, max) => {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getStatusClass = (status) => {
  const statusMap = {
    open: "badge-warning",
    pending: "badge-warning",
    approved: "badge-success",
    "in-progress": "badge-info",
    resolved: "badge-success",
    closed: "badge-success",
    rejected: "badge-danger"
  };
  return statusMap[status?.toLowerCase()] || "badge-default";
};

const formatSeminarTime = (start, end) => {
  const format = (value) => {
    if (!value || typeof value !== "string") return "-";
    const [hh, mm] = value.split(":");
    const h = Number(hh);
    if (Number.isNaN(h) || mm == null) return value;
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${mm} ${suffix}`;
  };

  return `${format(start)} - ${format(end)}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch (e) {
    return dateStr;
  }
};

onMounted(async () => {
  try {
    const { data } = await api.get("/dashboard/stats");

    metrics.value = {
      totalUsers: data.total_users,
      activeMeters: data.active_meters,
      openIncidents: data.open_incidents,
      pendingBenefits: data.pending_benefit_apps,
      approvedBenefits: data.approved_benefit_apps,
      rejectedBenefits: data.rejected_benefit_apps,
      pendingSeminarRequests: data.pending_seminar_requests,
      approvedSeminars: data.approved_seminars,
      todaySeminars: data.today_seminar_total,
      todayApprovedSeminars: data.today_seminar_approved,
      unreadNotifications: data.unread_notifications
    };

    kpiCards.value = [
      {
        label: "Total Users",
        value: metrics.value.totalUsers,
        iconKey: "user",
        colorClass: "kpi-users",
        trend: "+12%"
      },
      {
        label: "Active Meters",
        value: metrics.value.activeMeters,
        iconKey: "bolt",
        colorClass: "kpi-meters",
        trend: "+8%"
      },
      {
        label: "Open Incidents",
        value: metrics.value.openIncidents,
        iconKey: "alert",
        colorClass: "kpi-incidents"
      },
      {
        label: "Pending Benefit Apps",
        value: metrics.value.pendingBenefits,
        iconKey: "gift",
        colorClass: "kpi-benefits"
      },
      {
        label: "Pending Seminar Requests",
        value: metrics.value.pendingSeminarRequests,
        iconKey: "calendar",
        colorClass: "kpi-seminars"
      },
      {
        label: "Approved Benefits",
        value: metrics.value.approvedBenefits,
        iconKey: "check",
        colorClass: "kpi-approved"
      },
      {
        label: "Seminars Today",
        value: metrics.value.todaySeminars,
        iconKey: "pin",
        colorClass: "kpi-today"
      }
    ];

    recentIncidents.value = data.recent_incidents || [];
    announcements.value = data.latest_announcements || [];
    recentSeminars.value = data.recent_seminar_requests || [];
    recentBenefits.value = data.recent_benefit_applications || [];
    benefitStatusBreakdown.value = data.benefit_status_breakdown || [];
    seminarStatusBreakdown.value = data.seminar_status_breakdown || [];
  } catch (e) {
    console.error("Dashboard load failed:", e);
  }
});
</script>

<style scoped>
.dashboard {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #e2e8f0;
  --border-2: #cbd5e1;
  --soft: #f8fafc;

  --success-bg: #ecfdf5;
  --success-bd: #bbf7d0;
  --success-tx: #166534;

  --warn-bg: #fffbeb;
  --warn-bd: #fde68a;
  --warn-tx: #92400e;

  --danger-bg: #fef2f2;
  --danger-bd: #fecaca;
  --danger-tx: #991b1b;

  --info-bg: #eff6ff;
  --info-bd: #bfdbfe;
  --info-tx: #1d4ed8;

  --brand-teal: #56c4ad;
  --brand-teal-soft: #9be4d7;
  --brand-navy: #2f8f7a;
  --brand-slate: #7fd6c4;
  --brand-amber: #e7b765;

  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  background: var(--bg);
  min-height: calc(100vh - 64px);
  position: relative;
  overflow: hidden;
}

.dashboard::before,
.dashboard::after {
  content: "";
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
  filter: blur(54px);
  opacity: 0.2;
  z-index: 0;
}

.dashboard::before {
  width: 220px;
  height: 220px;
  background: var(--brand-teal-soft);
  top: -90px;
  right: -70px;
}

.dashboard::after {
  width: 200px;
  height: 200px;
  background: #bdebe3;
  bottom: -80px;
  left: -70px;
}

.dashboard > * {
  position: relative;
  z-index: 1;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}

.title {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.3px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
  font-weight: 450;
}

.hero-strip {
  margin-bottom: 14px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid #d8e4f3;
  background:
    radial-gradient(circle at 20% 0%, rgba(15, 139, 111, 0.15), transparent 45%),
    radial-gradient(circle at 100% 100%, rgba(255, 143, 63, 0.16), transparent 42%),
    #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  box-shadow: 0 12px 26px rgba(16, 35, 62, 0.08);
  animation: cardFloatIn 0.35s ease;
}

.hero-kicker {
  margin: 0;
  color: #0f8b6f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-strip h3 {
  margin: 6px 0 0 0;
  font-size: 20px;
  color: #10233e;
}

.hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-pill {
  text-decoration: none;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
  color: #216451;
  border: 1px solid #d8e4f3;
  background: rgba(255, 255, 255, 0.86);
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  position: relative;
  overflow: hidden;
}

.hero-pill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.6), transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.45s ease;
}

.hero-pill:hover {
  transform: translateY(-1px);
  border-color: #bce7dd;
  background: #f1fcf8;
}

.hero-pill:hover::after {
  transform: translateX(130%);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.kpi-card {
  background: var(--surface);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  position: relative;
  overflow: hidden;
  animation: kpiRise 0.4s ease both;
}

.kpi-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  height: 2px;
  width: 100%;
  background: currentColor;
  opacity: 0.18;
}

.kpi-card:hover {
  background: var(--soft);
  border-color: var(--border-2);
  transform: translateY(-1px);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--soft);
  border: 1px solid var(--border);
}

.ui-icon {
  width: 18px;
  height: 18px;
  color: currentColor;
}

.ui-icon path {
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.kpi-trend {
  padding: 4px 8px;
  background: var(--soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 650;
  color: var(--muted);
}

.trend-value::before {
  content: "↗";
  margin-right: 4px;
  opacity: 0.8;
}

.kpi-label {
  font-size: 12px;
  font-weight: 650;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 34px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.kpi-users {
  color: #2563eb;
}
.kpi-meters {
  color: #0f766e;
}
.kpi-incidents {
  color: #b45309;
}
.kpi-benefits {
  color: #7c3aed;
}
.kpi-seminars {
  color: #2c73b3;
}
.kpi-approved {
  color: #2f855a;
}
.kpi-today {
  color: #2b6cb0;
}

.analytics-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 12px;
}

.card {
  background: var(--surface);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid var(--border);
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.card:hover {
  border-color: var(--border-2);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: var(--soft);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 750;
  color: var(--text);
}

.link {
  font-size: 13px;
  font-weight: 650;
  color: var(--muted);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.link:hover {
  background: var(--soft);
  border-color: var(--border);
  color: var(--text);
}

.pulse-card {
  background:
    radial-gradient(circle at 0% 0%, rgba(24, 159, 132, 0.16), transparent 40%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(240, 250, 247, 0.97));
}

.pulse-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: stretch;
}

.chart-shell {
  position: relative;
  min-height: 280px;
  display: grid;
  place-items: center;
  border: 1px solid #d8e4f3;
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(24, 159, 132, 0.14), rgba(255, 255, 255, 0.92) 38%),
    rgba(255, 255, 255, 0.96);
  overflow: hidden;
}

.chart-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.45), transparent 28%);
}

.chart-shell::after {
  content: "";
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 10px;
  height: 20px;
  border-radius: 999px;
  background: rgba(15, 35, 62, 0.1);
  filter: blur(10px);
}

.chart-ring {
  width: 240px;
  height: 240px;
  border-radius: 50%;
  position: relative;
  transition: transform 0.2s ease;
  animation: slowSpin 26s linear infinite;
  box-shadow: 0 14px 30px rgba(24, 95, 131, 0.2);
}

.chart-ring::after {
  content: "";
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #c4d9eb;
}

.chart-shell:hover .chart-ring {
  transform: scale(1.03);
  animation-play-state: paused;
}

.chart-center {
  position: absolute;
  text-align: center;
  z-index: 2;
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: border-color 0.2s ease;
}

.chart-center p {
  margin: 0;
  font-size: 12px;
  color: #6b809b;
  font-weight: 700;
}

.chart-center h4 {
  margin: 2px 0;
  font-size: 28px;
  color: #10233e;
}

.chart-center span {
  font-size: 13px;
  color: #0f8b6f;
  font-weight: 800;
}

.insight-legend {
  list-style: none;
  margin: 0;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #d8e4f3;
  border-radius: 18px;
  background:
    linear-gradient(215deg, rgba(70, 184, 160, 0.16), rgba(255, 255, 255, 0.95) 50%),
    #ffffff;
  min-height: 280px;
}

.legend-item {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 10px;
  border: 1px solid #d8e4f3;
  background: #fff;
  border-radius: 12px;
  padding: 11px;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  position: relative;
  overflow: hidden;
}

.legend-item::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.45), transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.45s ease;
}

.legend-item:hover,
.legend-item.active {
  transform: translateY(-1px);
  border-color: #8ec8dd;
  background: #eff8ff;
}

.legend-item:hover::after,
.legend-item.active::after {
  transform: translateX(130%);
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-label {
  font-size: 14px;
  font-weight: 700;
  color: #255f4f;
}

.legend-value {
  font-size: 14px;
  font-weight: 800;
  color: #184638;
}

.quick-metrics {
  background:
    radial-gradient(circle at 100% 0%, rgba(127, 214, 196, 0.16), transparent 40%),
    linear-gradient(220deg, rgba(255, 255, 255, 0.96), rgba(246, 253, 250, 0.96));
}

.quick-grid {
  display: grid;
  gap: 10px;
}

.quick-item {
  border: 1px solid #d8e4f3;
  border-radius: 12px;
  background: linear-gradient(145deg, #f8fbff, #ffffff);
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-item:hover {
  transform: translateY(-1px);
  border-color: #bce7dd;
  box-shadow: 0 8px 18px rgba(47, 143, 122, 0.12);
}

.quick-label {
  color: #516986;
  font-weight: 700;
  font-size: 13px;
}

.quick-value {
  color: #10233e;
  font-size: 24px;
  line-height: 1;
}

.status-monitor-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(91, 155, 213, 0.15), transparent 42%),
    linear-gradient(200deg, rgba(255, 255, 255, 0.98), rgba(242, 248, 255, 0.95));
}

.status-monitor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.status-monitor-block {
  border: 1px solid #d8e4f3;
  border-radius: 12px;
  background: #ffffff;
  padding: 12px;
}

.status-monitor-block h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #1c3f67;
}

.status-monitor-block ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.status-monitor-block li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e8eef7;
  border-radius: 10px;
  background: #f8fbff;
  padding: 8px 10px;
  text-transform: capitalize;
}

.status-name {
  color: #4a617d;
  font-size: 13px;
  font-weight: 700;
}

.status-count {
  color: #10233e;
  font-size: 15px;
}

.table-wrapper {
  overflow-x: auto;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table thead tr {
  border-bottom: 1px solid var(--border);
}

.table th {
  padding: 12px 12px;
  text-align: left;
  font-weight: 700;
  color: #334155;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  background: var(--soft);
  white-space: nowrap;
}

.table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.12s ease;
}

.table tbody tr:hover {
  background: var(--soft);
}

.table tbody tr:last-child {
  border-bottom: none;
}

.table td {
  padding: 12px 12px;
  color: var(--text);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #0f172a;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
}

.date-cell {
  color: var(--muted);
  font-size: 13px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  border: 1px solid var(--border);
  background: var(--soft);
  color: #334155;
}

.badge-id {
  background: var(--soft);
  color: #334155;
}

.badge-success {
  background: var(--success-bg);
  border-color: var(--success-bd);
  color: var(--success-tx);
}

.badge-warning {
  background: var(--warn-bg);
  border-color: var(--warn-bd);
  color: var(--warn-tx);
}

.badge-danger {
  background: var(--danger-bg);
  border-color: var(--danger-bd);
  color: var(--danger-tx);
}

.badge-info {
  background: var(--info-bg);
  border-color: var(--info-bd);
  color: var(--info-tx);
}

.badge-default {
  background: var(--soft);
  border-color: var(--border);
  color: var(--muted);
}

.empty-state {
  text-align: center;
  padding: 28px 16px;
  margin: 0;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.empty-icon {
  width: 28px;
  height: 28px;
  margin: 0 auto 8px;
  opacity: 0.55;
}

.empty-icon .ui-icon {
  width: 100%;
  height: 100%;
}

.empty-state p {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

.announcements-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.announcement-item {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.announcement-item:hover {
  background: var(--soft);
  border-color: var(--border-2);
  transform: translateY(-1px);
}

.announcement-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.announcement-icon {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: var(--soft);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
}

.announcement-title {
  font-weight: 750;
  font-size: 15px;
  line-height: 1.35;
  color: var(--text);
  flex: 1;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  overflow: hidden;
}

.announcement-meta {
  font-size: 13px;
  color: #536b84;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 38px;
  flex-wrap: wrap;
}

.meta-icon {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
  opacity: 0.85;
}

.meta-icon .ui-icon {
  width: 12px;
  height: 12px;
}

.meta-separator {
  color: var(--border-2);
  margin: 0 2px;
}

.announcement-body {
  font-size: 14px;
  color: #2f4359;
  line-height: 1.65;
  padding-left: 38px;
  white-space: pre-line;
}

@keyframes kpiRise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardFloatIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slowSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.number-pop-enter-active,
.number-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.number-pop-enter-from,
.number-pop-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

:global(html.ormeco-dark) .dashboard {
  --bg: #111b2a;
  --surface: #1a2738;
  --text: #e9f3ff;
  --muted: #a6bed8;
  --border: #30445d;
  --border-2: #3a5676;
  --soft: #213146;

  --success-bg: rgba(73, 202, 143, 0.16);
  --success-bd: rgba(73, 202, 143, 0.34);
  --success-tx: #8cf0ba;

  --warn-bg: rgba(243, 193, 91, 0.14);
  --warn-bd: rgba(243, 193, 91, 0.3);
  --warn-tx: #ffd782;

  --danger-bg: rgba(255, 125, 125, 0.14);
  --danger-bd: rgba(255, 125, 125, 0.3);
  --danger-tx: #ffadad;

  --info-bg: rgba(108, 152, 255, 0.14);
  --info-bd: rgba(108, 152, 255, 0.32);
  --info-tx: #a5c5ff;

  --brand-teal: #56c4ad;
  --brand-teal-soft: rgba(86, 196, 173, 0.35);
  --brand-navy: #7cd5c2;
  --brand-slate: #9ad9ce;
  --brand-amber: #f4c579;
  background: var(--bg);
}

:global(html.ormeco-dark) .dashboard::after {
  background: rgba(92, 129, 188, 0.36);
}

:global(html.ormeco-dark) .hero-strip {
  border-color: #33506f;
  background:
    radial-gradient(circle at 20% 0%, rgba(41, 201, 163, 0.16), transparent 45%),
    radial-gradient(circle at 100% 100%, rgba(91, 129, 191, 0.2), transparent 42%),
    #1a2a3b;
}

:global(html.ormeco-dark) .hero-kicker {
  color: #7bead0;
}

:global(html.ormeco-dark) .hero-strip h3,
:global(html.ormeco-dark) .legend-value,
:global(html.ormeco-dark) .quick-value,
:global(html.ormeco-dark) .status-count,
:global(html.ormeco-dark) .chart-center h4 {
  color: #e9f3ff;
}

:global(html.ormeco-dark) .dashboard .subtitle,
:global(html.ormeco-dark) .dashboard .kpi-label,
:global(html.ormeco-dark) .dashboard .kpi-trend,
:global(html.ormeco-dark) .dashboard .link,
:global(html.ormeco-dark) .dashboard .date-cell,
:global(html.ormeco-dark) .dashboard .announcement-meta,
:global(html.ormeco-dark) .dashboard .announcement-body,
:global(html.ormeco-dark) .dashboard .status-name,
:global(html.ormeco-dark) .dashboard .chart-center p,
:global(html.ormeco-dark) .dashboard .legend-label,
:global(html.ormeco-dark) .dashboard .quick-label {
  color: #a6bed8 !important;
}

:global(html.ormeco-dark) .dashboard .kpi-value,
:global(html.ormeco-dark) .dashboard .card-title,
:global(html.ormeco-dark) .dashboard .table td,
:global(html.ormeco-dark) .dashboard .empty-state p,
:global(html.ormeco-dark) .dashboard .announcement-title {
  color: #e9f3ff !important;
}

:global(html.ormeco-dark) .hero-pill {
  color: #bdeedd;
  border-color: #385576;
  background: rgba(26, 39, 56, 0.86);
}

:global(html.ormeco-dark) .hero-pill:hover {
  border-color: rgba(41, 201, 163, 0.52);
  background: rgba(41, 201, 163, 0.12);
}

:global(html.ormeco-dark) .pulse-card,
:global(html.ormeco-dark) .quick-metrics,
:global(html.ormeco-dark) .status-monitor-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(86, 196, 173, 0.14), transparent 42%),
    linear-gradient(220deg, rgba(26, 39, 56, 0.98), rgba(21, 33, 48, 0.98));
}

:global(html.ormeco-dark) .chart-shell,
:global(html.ormeco-dark) .insight-legend,
:global(html.ormeco-dark) .legend-item,
:global(html.ormeco-dark) .quick-item,
:global(html.ormeco-dark) .status-monitor-block,
:global(html.ormeco-dark) .status-monitor-block li {
  border-color: #33506f;
  background: #1b2b3f;
}

:global(html.ormeco-dark) .legend-item:hover,
:global(html.ormeco-dark) .legend-item.active,
:global(html.ormeco-dark) .quick-item:hover {
  border-color: #4c7199;
  background: #22364d;
}

:global(html.ormeco-dark) .chart-shell::after {
  background: rgba(0, 0, 0, 0.45);
}

:global(html.ormeco-dark) .chart-ring::after {
  background: #152435;
  border-color: #355174;
}

:global(html.ormeco-dark) .chart-center {
  background: rgba(20, 31, 45, 0.84);
}

:global(html.ormeco-dark) .chart-center p,
:global(html.ormeco-dark) .legend-label,
:global(html.ormeco-dark) .quick-label,
:global(html.ormeco-dark) .status-name,
:global(html.ormeco-dark) .announcement-meta,
:global(html.ormeco-dark) .announcement-body,
:global(html.ormeco-dark) .table th {
  color: #a6bed8;
}

:global(html.ormeco-dark) .table tbody tr {
  border-bottom-color: #2d435d;
}

:global(html.ormeco-dark) .table tbody tr:hover,
:global(html.ormeco-dark) .announcement-item:hover {
  background: #22354c;
}

:global(html.ormeco-dark) .announcement-item,
:global(html.ormeco-dark) .empty-state,
:global(html.ormeco-dark) .table-wrapper {
  background: #1a2738;
  border-color: #33506f;
}

:global(html.ormeco-dark) .announcement-icon,
:global(html.ormeco-dark) .card-icon,
:global(html.ormeco-dark) .kpi-icon,
:global(html.ormeco-dark) .kpi-trend {
  background: #22344a;
  border-color: #36516f;
}

:global(html.ormeco-dark) .announcement-title,
:global(html.ormeco-dark) .table td,
:global(html.ormeco-dark) .empty-state p,
:global(html.ormeco-dark) .card-title,
:global(html.ormeco-dark) .title {
  color: #e9f3ff;
}

:global(html.ormeco-dark) .meta-separator {
  color: #5f7d9e;
}

:global(html.ormeco-dark) .user-avatar {
  background: #0f172a;
  color: #dbeafe;
}

@media (max-width: 1200px) {
  .analytics-grid,
  .main-grid,
  .pulse-layout {
    grid-template-columns: 1fr;
  }

  .status-monitor-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .dashboard {
    padding: 16px;
  }

  .hero-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .kpi-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }

  .title {
    font-size: 18px;
  }

  .card {
    padding: 14px;
  }

  .announcement-meta,
  .announcement-body {
    padding-left: 34px;
  }

  .chart-shell {
    min-height: 260px;
  }

  .chart-ring {
    width: 200px;
    height: 200px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chart-ring,
  .kpi-card,
  .hero-strip,
  .hero-pill,
  .legend-item {
    animation: none !important;
    transition: none !important;
  }
}
</style>
