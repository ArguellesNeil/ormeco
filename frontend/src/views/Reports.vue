<template>
  <div class="page-shell reports-page">
    <div class="page-header">
      <div>
        <div class="header-meta">
          <span class="report-badge">Insights Center</span>
          <span v-if="report" class="report-gen">Updated {{ formatDateTime(report.generatedAt) }}</span>
        </div>
        <h2 class="page-title">System Reports</h2>
        <p class="page-subtitle">Monitor system activity daily, weekly, monthly, and yearly. Export a clean executive PDF anytime.</p>
        <p v-if="period === 'custom' && customScopeSummary" class="custom-range-meta">Current custom range: {{ customScopeSummary }}</p>
      </div>

      <div class="page-header-right">
        <div class="page-search">
          <SearchBar v-model="search" placeholder="Search reports..." />
        </div>
        <div class="page-actions report-actions">
        <div class="period-switch">
          <button
            v-for="p in periods"
            :key="p.value"
            class="btn btn-secondary"
            :class="{ active: period === p.value }"
            @click="changePeriod(p.value)"
            type="button"
          >
            {{ p.label }}
          </button>
        </div>

        <button type="button" class="btn btn-primary" @click="exportPdf" :disabled="loading || !report">
          Export PDF
        </button>
      </div>
      </div>
    </div>

    <section v-if="period === 'custom'" class="card-surface custom-scope-panel reveal">
      <div class="custom-head">
        <h3>Custom Report Scope</h3>
        <span>Select exactly what day/month/year or weekday range should appear in this report.</span>
      </div>

      <div class="custom-grid">
        <label class="custom-field">
          <span>Scope Type</span>
          <select v-model="customFilters.scope_type">
            <option value="last_n_days">Last N Days</option>
            <option value="specific_day">Specific Day</option>
            <option value="month">Specific Month</option>
            <option value="year">Specific Year</option>
            <option value="date_range">Custom Date Range</option>
          </select>
        </label>

        <label v-if="customFilters.scope_type === 'last_n_days'" class="custom-field">
          <span>Last N Days</span>
          <input v-model.number="customFilters.last_n_days" type="number" min="1" max="366" />
        </label>

        <template v-if="customFilters.scope_type === 'specific_day'">
          <label class="custom-field">
            <span>Day</span>
            <select v-model.number="customFilters.day">
              <option v-for="day in dayOptions" :key="`day-${day}`" :value="day">{{ day }}</option>
            </select>
          </label>

          <label class="custom-field">
            <span>Month</span>
            <select v-model.number="customFilters.month">
              <option v-for="month in monthOptions" :key="`month-${month.value}`" :value="month.value">{{ month.label }}</option>
            </select>
          </label>

          <label class="custom-field">
            <span>Year</span>
            <select v-model.number="customFilters.year">
              <option v-for="year in yearOptions" :key="`year-${year}`" :value="year">{{ year }}</option>
            </select>
          </label>
        </template>

        <template v-if="customFilters.scope_type === 'month'">
          <label class="custom-field">
            <span>Month</span>
            <select v-model.number="customFilters.month">
              <option v-for="month in monthOptions" :key="`scope-month-${month.value}`" :value="month.value">{{ month.label }}</option>
            </select>
          </label>

          <label class="custom-field">
            <span>Year</span>
            <select v-model.number="customFilters.year">
              <option v-for="year in yearOptions" :key="`scope-year-${year}`" :value="year">{{ year }}</option>
            </select>
          </label>
        </template>

        <label v-if="customFilters.scope_type === 'year'" class="custom-field">
          <span>Year</span>
          <select v-model.number="customFilters.year">
            <option v-for="year in yearOptions" :key="`single-year-${year}`" :value="year">{{ year }}</option>
          </select>
        </label>

        <template v-if="customFilters.scope_type === 'date_range'">
          <label class="custom-field">
            <span>Date From</span>
            <input v-model="customFilters.date_from" type="date" />
          </label>

          <label class="custom-field">
            <span>Date To</span>
            <input v-model="customFilters.date_to" type="date" />
          </label>
        </template>
      </div>

      <div class="custom-weekdays">
        <p>Weekday Filter (optional)</p>
        <div class="weekday-chip-group">
          <label v-for="weekday in weekdayOptions" :key="`weekday-${weekday.value}`" class="weekday-chip">
            <input v-model="customFilters.weekdays" type="checkbox" :value="String(weekday.value)" />
            <span>{{ weekday.label }}</span>
          </label>
        </div>
      </div>

      <div class="custom-actions">
        <button type="button" class="btn btn-secondary" @click="clearWeekdays">Clear Weekdays</button>
        <button type="button" class="btn btn-primary" @click="applyCustomScope" :disabled="loading">Apply Custom Scope</button>
      </div>
    </section>

    <div v-if="loading" class="card-surface loading-card">Loading report data...</div>
    <div v-else-if="error" class="card-surface error-card">{{ error }}</div>

    <template v-else-if="report">
      <section class="kpi-grid reveal">
        <article class="kpi card-surface glass-card" v-for="(item, idx) in summaryCards" :key="item.label" :style="{ animationDelay: `${idx * 40}ms` }">
          <span class="kpi-label">{{ item.label }}</span>
          <strong class="kpi-value">{{ item.value }}</strong>
        </article>
      </section>

      <section ref="analyticsGraphRef" class="card-surface analytics-block reveal">
        <div class="section-head analytics-head">
          <h3>Analytics Graph</h3>
          <span>{{ periodLabel }} performance trend</span>
        </div>

        <div class="analytics-layout">
          <div class="chart-shell" @mouseleave="hidePointTooltip">
            <svg :key="chartAnimationKey" viewBox="0 0 980 340" class="trend-chart" role="img" aria-label="System trend chart">
              <defs>
                <linearGradient id="totalAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0f8b6f" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="#0f8b6f" stop-opacity="0.015" />
                </linearGradient>
              </defs>

              <g>
                <line
                  v-for="tick in yTicks"
                  :key="`y-${tick.value}`"
                  :x1="chartBounds.left"
                  :x2="chartBounds.right"
                  :y1="tick.y"
                  :y2="tick.y"
                  class="grid-line"
                />
                <line
                  :x1="chartBounds.left"
                  :x2="chartBounds.right"
                  :y1="chartBounds.bottom"
                  :y2="chartBounds.bottom"
                  class="axis-base"
                />
                <line
                  :x1="chartBounds.left"
                  :x2="chartBounds.left"
                  :y1="chartBounds.top"
                  :y2="chartBounds.bottom"
                  class="axis-base"
                />
              </g>

              <path
                v-if="totalSeriesPath"
                :d="totalSeriesPath"
                fill="url(#totalAreaGradient)"
                class="area-fill"
              />

              <g v-for="series in chartSeries" :key="series.key">
                <polyline
                  :points="series.points"
                  fill="none"
                  :stroke="series.color"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="line-path"
                  :class="{
                    muted: highlightedSeries && highlightedSeries !== series.key,
                    highlighted: highlightedSeries === series.key
                  }"
                />

                <circle
                  v-for="(point, idx) in series.pointData"
                  :key="`${series.key}-${idx}`"
                  :cx="point.x"
                  :cy="point.y"
                  r="4.8"
                  :fill="series.color"
                  stroke="#ffffff"
                  stroke-width="1.6"
                  class="line-point"
                  tabindex="0"
                  :class="{
                    muted: highlightedSeries && highlightedSeries !== series.key,
                    highlighted: highlightedSeries === series.key,
                    active: tooltip.visible && tooltip.key === `${series.key}-${idx}`,
                    zero: point.value === 0
                  }"
                  @mouseenter="showPointTooltip(series, point, idx)"
                  @mouseleave="hidePointTooltip"
                  @focus="showPointTooltip(series, point, idx)"
                  @blur="hidePointTooltip"
                />
              </g>

              <g v-if="tooltip.visible" class="chart-tooltip-svg">
                <line :x1="tooltip.x" :x2="tooltip.x" :y1="chartBounds.top" :y2="chartBounds.bottom" class="tooltip-guide" />
                <rect :x="tooltip.boxX" :y="tooltip.boxY" width="180" height="44" rx="8" class="tooltip-box" />
                <text :x="tooltip.boxX + 10" :y="tooltip.boxY + 16" class="tooltip-title">{{ tooltip.title }}</text>
                <text :x="tooltip.boxX + 10" :y="tooltip.boxY + 33" class="tooltip-value">{{ tooltip.value }}</text>
              </g>

              <g>
                <text
                  v-for="tick in yTicks"
                  :key="`yl-${tick.value}`"
                  :x="chartBounds.left - 10"
                  :y="tick.y + 4"
                  class="axis-label y"
                >
                  {{ compactNumber(tick.value) }}
                </text>
              </g>

              <g>
                <text
                  v-for="tick in xTicks"
                  :key="`xl-${tick.label}`"
                  :x="tick.x"
                  :y="chartBounds.bottom + 22"
                  text-anchor="middle"
                  class="axis-label x"
                >
                  {{ tick.label }}
                </text>
              </g>
            </svg>
            <p v-if="isAnalyticsEmpty" class="chart-empty-note">No activity recorded in this period yet.</p>
          </div>

          <div class="chart-legend">
            <button
              v-for="(series, idx) in chartSeries"
              :key="`legend-${series.key}`"
              type="button"
              class="legend-item"
              :class="{ active: highlightedSeries === series.key, 'zero-series': !series.total }"
              :style="{ animationDelay: `${idx * 45}ms` }"
              @mouseenter="highlightedSeries = series.key"
              @mouseleave="highlightedSeries = null"
              @focus="highlightedSeries = series.key"
              @blur="highlightedSeries = null"
            >
              <span class="legend-dot" :style="{ background: series.color }"></span>
              <span class="legend-name">{{ series.label }}</span>
              <strong class="legend-total">{{ compactNumber(series.total) }}</strong>
            </button>
          </div>
        </div>
      </section>

      <section class="card-surface section-block reveal">
        <div class="section-head">
          <h3>Activity Trend ({{ periodLabel }})</h3>
          <span>Generated: {{ formatDateTime(report.generatedAt) }}</span>
        </div>

        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Users</th>
                <th>Meters</th>
                <th>Incidents</th>
                <th>Seminars</th>
                <th>Announcements</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredTrendRows" :key="row.label">
                <td>{{ formatTrendTableLabel(row.label) }}</td>
                <td>{{ row.users }}</td>
                <td>{{ row.meters }}</td>
                <td>{{ row.incidents }}</td>
                <td>{{ row.seminars }}</td>
                <td>{{ row.announcements }}</td>
                <td><strong>{{ row.total }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="status-grid reveal">
        <article class="card-surface status-card glass-card">
          <h4>Incident Status</h4>
          <ul>
            <li v-for="item in report.statusBreakdown.incidents" :key="`i-${item.status}`">
              <span>{{ item.status }}</span>
              <strong>{{ item.total }}</strong>
            </li>
          </ul>
        </article>

        <article class="card-surface status-card glass-card">
          <h4>Meter Status</h4>
          <ul>
            <li v-for="item in report.statusBreakdown.meters" :key="`m-${item.status}`">
              <span>{{ item.status }}</span>
              <strong>{{ item.total }}</strong>
            </li>
          </ul>
        </article>

        <article class="card-surface status-card glass-card">
          <h4>Benefit Applications</h4>
          <ul>
            <li v-for="item in report.statusBreakdown.benefitApplications" :key="`b-${item.status}`">
              <span>{{ item.status }}</span>
              <strong>{{ item.total }}</strong>
            </li>
          </ul>
        </article>

        <article class="card-surface status-card glass-card">
          <h4>Seminar Scheduling</h4>
          <ul>
            <li v-for="item in report.statusBreakdown.seminarSchedule" :key="`s-${item.status}`">
              <span>{{ item.status }}</span>
              <strong>{{ item.total }}</strong>
            </li>
          </ul>
        </article>
      </section>

      <!-- Benefit Distribution Chart -->
      <section ref="benefitGraphRef" class="card-surface section-block reveal">
        <div class="section-head">
          <h3>Benefit Distribution</h3>
          <span>Approved applications by benefit type ({{ periodLabel }})</span>
        </div>

        <div v-if="benefitChartData.length" class="benefit-distribution">
          <div class="pie-chart-container">
            <svg viewBox="0 0 240 240" class="pie-chart">
              <circle cx="120" cy="120" r="90" fill="none" :stroke-dasharray="pieData.circumference" :stroke-dashoffset="0" stroke="url(#pieGradient)" stroke-width="60" class="pie-base-ring" :opacity="hasBenefitData ? 0.24 : 0.45" />
              <defs>
                <linearGradient id="pieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0f8b6f" />
                  <stop offset="100%" stop-color="#2f6ea8" />
                </linearGradient>
              </defs>
              <circle
                v-for="(slice, idx) in pieSlices"
                :key="`slice-${idx}`"
                cx="120"
                cy="120"
                r="60"
                fill="none"
                :stroke="slice.color"
                stroke-width="20"
                :stroke-dasharray="slice.dasharray"
                :stroke-dashoffset="'-' + slice.offset"
                stroke-linecap="round"
              />
            </svg>
            <div class="pie-center">
              <strong class="pie-total">{{ totalApprovedBenefits }}</strong>
              <span class="pie-label">{{ hasBenefitData ? "Approved" : "No approvals" }}</span>
            </div>
          </div>

          <div class="benefit-legend">
            <div v-for="(item, idx) in benefitChartData" :key="`benefit-${idx}`" class="benefit-item" :class="{ 'zero-item': !item.count }">
              <span class="benefit-color" :style="{ background: benefitColors[idx % benefitColors.length] }"></span>
              <span class="benefit-name">{{ item.name }}</span>
              <strong class="benefit-count" :class="{ zero: !item.count }">{{ item.count }}</strong>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>No benefit data available</p>
        </div>
      </section>

      <section class="card-surface section-block reveal">
        <div class="section-head">
          <h3>Recent System Activities</h3>
        </div>
        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Title</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in report.recentActivities" :key="`${item.source}-${idx}`">
                <td>{{ item.source }}</td>
                <td>{{ item.title }}</td>
                <td>{{ formatDateTime(item.happened_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import api from "../api";
import SearchBar from "../components/SearchBar.vue";

const period = ref("monthly");
const loading = ref(false);
const error = ref("");
const report = ref(null);
const highlightedSeries = ref(null);
const analyticsGraphRef = ref(null);
const benefitGraphRef = ref(null);
const tooltip = ref({
  visible: false,
  key: "",
  x: 0,
  boxX: 0,
  boxY: 0,
  title: "",
  value: "",
});

const now = new Date();
const currentYear = now.getFullYear();

const chartBounds = {
  left: 52,
  right: 950,
  top: 22,
  bottom: 292,
};

const periods = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" },
];

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const weekdayOptions = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const customFilters = reactive({
  scope_type: "last_n_days",
  last_n_days: 7,
  day: now.getDate(),
  month: now.getMonth() + 1,
  year: currentYear,
  date_from: "",
  date_to: "",
  weekdays: [],
});

const yearOptions = computed(() => {
  const list = [];
  for (let y = currentYear + 1; y >= currentYear - 10; y -= 1) {
    list.push(y);
  }
  return list;
});

const dayOptions = computed(() => {
  const safeYear = Number(customFilters.year) || currentYear;
  const safeMonth = Number(customFilters.month) || 1;
  const maxDay = new Date(safeYear, safeMonth, 0).getDate();
  return Array.from({ length: maxDay }, (_unused, idx) => idx + 1);
});

watch(dayOptions, (nextDays) => {
  if (!nextDays.length) return;
  const selectedDay = Number(customFilters.day);
  if (!nextDays.includes(selectedDay)) {
    customFilters.day = nextDays[nextDays.length - 1];
  }
});

const periodLabel = computed(() => {
  const found = periods.find((p) => p.value === period.value);
  return found ? found.label : "Monthly";
});

const parseReportDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  let d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d;

  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
};

const formatDateOnly = (value) => {
  const d = parseReportDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatMonthYear = (value) => {
  const d = parseReportDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
};

const selectedWeekdayLabels = computed(() => {
  const source = Array.isArray(report.value?.weekdays) && report.value.weekdays.length
    ? report.value.weekdays
    : customFilters.weekdays;

  const unique = Array.from(new Set(source.map((item) => String(item).trim())))
    .filter((item) => /^\d$/.test(item))
    .sort((a, b) => Number(a) - Number(b));

  return unique
    .map((item) => weekdayOptions.find((weekday) => String(weekday.value) === item)?.label)
    .filter(Boolean);
});

const customScopeSummary = computed(() => {
  if (period.value !== "custom") return "";

  const scopeType = String(report.value?.scopeType || customFilters.scope_type || "last_n_days").toLowerCase();
  const startAt = report.value?.range?.startAt;
  const endAt = report.value?.range?.endAt;

  let base = "";
  if (scopeType === "specific_day") {
    base = formatDateOnly(startAt);
  } else if (scopeType === "month") {
    base = formatMonthYear(startAt);
  } else if (scopeType === "year") {
    const d = parseReportDate(startAt);
    base = d ? String(d.getFullYear()) : String(customFilters.year || currentYear);
  } else if (scopeType === "date_range") {
    base = `${formatDateOnly(startAt)} to ${formatDateOnly(endAt)}`;
  } else {
    if (startAt && endAt) {
      base = `${formatDateOnly(startAt)} to ${formatDateOnly(endAt)}`;
    } else {
      const fallbackDays = Math.max(1, Number(customFilters.last_n_days) || 1);
      base = `Last ${fallbackDays} days`;
    }
  }

  if (selectedWeekdayLabels.value.length) {
    base += ` • Weekdays: ${selectedWeekdayLabels.value.join(", ")}`;
  }

  return base;
});

const summaryCards = computed(() => {
  if (!report.value) return [];
  const s = report.value.summary || {};
  return [
    { label: "Total Members", value: s.total_members || 0 },
    { label: "Total Users", value: s.total_users || 0 },
    { label: "Active Benefits", value: s.active_benefits || 0 },
    { label: "Pending Benefits", value: s.pending_benefits || 0 },
    { label: "Total Seminar Requests", value: s.total_seminar_requests || 0 },
    { label: "Pending Seminar Requests", value: s.pending_seminar_requests || 0 },
    { label: "Open Incidents", value: s.open_incidents || 0 },
    { label: "Active Meters", value: s.active_meters || 0 },
    { label: "Announcements", value: s.total_announcements || 0 },
  ];
});

const trendRows = computed(() => {
  if (!report.value) return [];
  const labels = report.value.labels || [];
  const trends = report.value.trends || {};

  // Build rows from labels and trends
  const rows = labels.map((label, idx) => {
    const users = Number(trends.users?.[idx] || 0);
    const meters = Number(trends.meters?.[idx] || 0);
    const incidents = Number(trends.incidents?.[idx] || 0);
    const seminars = Number(trends.seminars?.[idx] || 0);
    const announcements = Number(trends.announcements?.[idx] || 0);
    return {
      label,
      users,
      meters,
      incidents,
      seminars,
      announcements,
      total: users + meters + incidents + seminars + announcements,
    };
  });

  // Sort by label (date) to ensure consistent chronological order
  const parseDate = (label) => {
    if (!label) return new Date(0);
    const d = new Date(String(label));
    if (!Number.isNaN(d.getTime())) return d;
    const m = String(label).match(/^(\d{4})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return new Date(0);
  };

  rows.sort((a, b) => parseDate(a.label) - parseDate(b.label));
  return rows;
});

const search = ref("");
const filteredTrendRows = computed(() => {
  const q = String(search.value || "").trim().toLowerCase();
  if (!q) return trendRows.value;
  return trendRows.value.filter((r) =>
    [r.label, String(r.users), String(r.meters), String(r.incidents), String(r.seminars)]
      .map((v) => String(v || "").toLowerCase())
      .some((s) => s.includes(q))
  );
});

const chartLabels = computed(() => report.value?.labels || []);
const chartAnimationKey = computed(() => `${period.value}-${chartLabels.value.length}-${report.value?.generatedAt || ""}`);

const formatAxisLabel = (label) => {
  const raw = String(label || "");

  if (period.value === "yearly") {
    const m = raw.match(/^(\d{4})-(\d{2})$/);
    if (!m) return raw;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  }

  if (period.value === "weekly" || period.value === "monthly") {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return raw;
};

const formatTooltipPeriod = (label) => {
  const raw = String(label || "");

  if (period.value === "yearly") {
    const m = raw.match(/^(\d{4})-(\d{2})$/);
    if (!m) return raw;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  if (period.value === "weekly") {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return `Week of ${raw}`;
    return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  if (period.value === "monthly") {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
  }

  return raw;
};

const formatTrendTableLabel = (label) => {
  const raw = String(label || "");

  if (period.value === "yearly") {
    const m = raw.match(/^(\d{4})-(\d{2})$/);
    if (!m) return raw;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long" });
  }

  if (period.value === "monthly") {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  }

  return raw;
};

const chartMax = computed(() => {
  if (!report.value) return 10;
  const trends = report.value.trends || {};
  const all = [
    ...(trends.users || []),
    ...(trends.meters || []),
    ...(trends.incidents || []),
    ...(trends.seminars || []),
    ...(trends.announcements || []),
  ].map((n) => Number(n) || 0);
  const peak = Math.max(0, ...all);
  return peak < 5 ? 5 : peak;
});

const toX = (index, totalPoints) => {
  if (totalPoints <= 1) return chartBounds.left;
  const w = chartBounds.right - chartBounds.left;
  return chartBounds.left + (index / (totalPoints - 1)) * w;
};

const toY = (value) => {
  const h = chartBounds.bottom - chartBounds.top;
  return chartBounds.bottom - (Number(value || 0) / chartMax.value) * h;
};

const toPointData = (data) => {
  const total = data.length;
  return data.map((value, idx) => ({
    value,
    x: toX(idx, total),
    y: toY(value),
  }));
};

const toPointsString = (data) => toPointData(data).map((p) => `${p.x},${p.y}`).join(" ");

const toAreaPath = (data) => {
  if (!data.length) return "";
  const points = toPointData(data);
  const start = `M ${points[0].x} ${chartBounds.bottom}`;
  const topLine = points.map((p) => `L ${p.x} ${p.y}`).join(" ");
  const end = `L ${points[points.length - 1].x} ${chartBounds.bottom} Z`;
  return `${start} ${topLine} ${end}`;
};

const chartSeries = computed(() => {
  if (!report.value) return [];
  const trends = report.value.trends || {};
  const list = [
    { key: "users", label: "Users", color: "#2b6cb0", data: (trends.users || []).map((n) => Number(n) || 0) },
    { key: "meters", label: "Meters", color: "#1b9e77", data: (trends.meters || []).map((n) => Number(n) || 0) },
    { key: "incidents", label: "Incidents", color: "#d97706", data: (trends.incidents || []).map((n) => Number(n) || 0) },
    { key: "seminars", label: "Seminars", color: "#8b5cf6", data: (trends.seminars || []).map((n) => Number(n) || 0) },
    { key: "announcements", label: "Announcements", color: "#db2777", data: (trends.announcements || []).map((n) => Number(n) || 0) },
  ];

  return list.map((series) => ({
    ...series,
    total: series.data.reduce((sum, n) => sum + n, 0),
    points: toPointsString(series.data),
    pointData: toPointData(series.data),
  }));
});

const isAnalyticsEmpty = computed(() => {
  if (!chartSeries.value.length) return true;
  return chartSeries.value.every((series) => Number(series.total) === 0);
});

const totalSeriesPath = computed(() => {
  if (!trendRows.value.length) return "";
  const totals = trendRows.value.map((r) => Number(r.total) || 0);
  return toAreaPath(totals);
});

const yTicks = computed(() => {
  const steps = 4;
  const list = [];
  for (let i = 0; i <= steps; i += 1) {
    const value = Math.round((chartMax.value * (steps - i)) / steps);
    const y = chartBounds.top + ((chartBounds.bottom - chartBounds.top) * i) / steps;
    list.push({ value, y });
  }
  return list;
});

const xTicks = computed(() => {
  const labels = chartLabels.value;
  if (!labels.length) return [];
  const stride = labels.length > 10 ? 2 : 1;
  return labels
    .map((label, idx) => ({ label, idx }))
    .filter((item, i) => i % stride === 0 || i === labels.length - 1)
    .map((item) => ({ label: formatAxisLabel(item.label), x: toX(item.idx, labels.length) }));
});

const showPointTooltip = (series, point, idx) => {
  const key = `${series.key}-${idx}`;
  const boxWidth = 180;
  const boxX = Math.max(chartBounds.left, Math.min(point.x - boxWidth / 2, chartBounds.right - boxWidth));
  const boxY = Math.max(chartBounds.top + 8, point.y - 58);

  tooltip.value = {
    visible: true,
    key,
    x: point.x,
    boxX,
    boxY,
    title: `${series.label} • ${formatTooltipPeriod(chartLabels.value[idx] || "")}`,
    value: `Value: ${compactNumber(point.value)}`,
  };

  highlightedSeries.value = series.key;
};

const hidePointTooltip = () => {
  tooltip.value = {
    visible: false,
    key: "",
    x: 0,
    boxX: 0,
    boxY: 0,
    title: "",
    value: "",
  };
  highlightedSeries.value = null;
};

// Benefit Distribution Colors
const benefitColors = [
  "#0f8b6f", "#2f6ea8", "#d17d2a", "#7a57b3",
  "#116351", "#1a4d7f", "#b8621b", "#5a3d8a"
];

// Benefit Chart Data
const benefitChartData = computed(() => {
  if (!report.value?.benefitDistribution) return [];
  return (report.value.benefitDistribution || []).map((item) => ({
    name: item.name || "Unknown",
    count: Number(item.count) || 0,
  }));
});

const pieData = computed(() => {
  const total = benefitChartData.value.reduce((sum, item) => sum + item.count, 0) || 1;
  return { total, circumference: 2 * Math.PI * 60 };
});

const totalApprovedBenefits = computed(() => {
  return benefitChartData.value.reduce((sum, item) => sum + item.count, 0);
});

const hasBenefitData = computed(() => totalApprovedBenefits.value > 0);

const pieSlices = computed(() => {
  const total = pieData.value.total;
  const slices = [];
  let offsetLength = 0;
  
  benefitChartData.value.forEach((item, idx) => {
    if (!item.count) return;
    const percentage = (item.count / total) * 100;
    const circumference = pieData.value.circumference;
    const sliceLength = (percentage / 100) * circumference;
    slices.push({
      color: benefitColors[idx % benefitColors.length],
      dasharray: `${sliceLength} ${circumference}`,
      offset: offsetLength,
    });
    offsetLength += sliceLength;
  });
  
  return slices;
});

const compactNumber = (value) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(Number(value) || 0);

const formatDateTime = (value) => {
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

const loadReport = async () => {
  loading.value = true;
  error.value = "";
  try {
    const params = { period: period.value };

    if (period.value === "custom") {
      params.scope_type = customFilters.scope_type;

      if (customFilters.scope_type === "last_n_days") {
        params.last_n_days = Math.max(1, Number(customFilters.last_n_days) || 1);
      }

      if (customFilters.scope_type === "specific_day") {
        params.custom_day = Number(customFilters.day) || now.getDate();
        params.custom_month = Number(customFilters.month) || now.getMonth() + 1;
        params.custom_year = Number(customFilters.year) || currentYear;
      }

      if (customFilters.scope_type === "month") {
        params.custom_month = Number(customFilters.month) || now.getMonth() + 1;
        params.custom_year = Number(customFilters.year) || currentYear;
      }

      if (customFilters.scope_type === "year") {
        params.custom_year = Number(customFilters.year) || currentYear;
      }

      if (customFilters.scope_type === "date_range") {
        if (customFilters.date_from) params.date_from = customFilters.date_from;
        if (customFilters.date_to) params.date_to = customFilters.date_to;
      }

      if (Array.isArray(customFilters.weekdays) && customFilters.weekdays.length) {
        params.weekdays = customFilters.weekdays.join(",");
      }
    }

    const { data } = await api.get("/reports/overview", {
      params,
    });
    report.value = data;
  } catch (err) {
    error.value = err?.response?.data?.message || err?.message || "Failed to load reports";
    report.value = null;
  } finally {
    loading.value = false;
  }
};

const changePeriod = async (next) => {
  if (period.value === next) return;
  period.value = next;
  await loadReport();
};

const applyCustomScope = async () => {
  if (period.value !== "custom") {
    period.value = "custom";
  }
  await loadReport();
};

const clearWeekdays = () => {
  customFilters.weekdays = [];
};

const exportPdf = async () => {
  if (!report.value) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const palette = {
    navy: [16, 35, 62],
    navySoft: [30, 54, 86],
    teal: [15, 139, 111],
    tealDark: [20, 113, 92],
    text: [32, 50, 74],
    muted: [96, 118, 144],
    line: [222, 232, 244],
    rowAlt: [248, 251, 255],
  };

  const createdAt = new Date();
  const createdAtLabel = createdAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const marginX = 40;
  const contentWidth = pageW - marginX * 2;
  const headerHeight = 74;
  const footerHeight = 56;
  const contentTop = headerHeight + 18;
  const contentBottom = pageH - footerHeight - 26;
  const pdfTableMargin = {
    top: contentTop,
    right: marginX,
    bottom: pageH - contentBottom,
    left: marginX,
  };

  const loadImageAsPngDataUrl = (src) =>
    new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } catch (_) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      } catch (_) {
        resolve(null);
      }
    });

  const [headerImage, footerImage] = await Promise.all([
    loadImageAsPngDataUrl("/report-pdf-header-template.png?v=20260418d"),
    loadImageAsPngDataUrl("/report-pdf-footer-template.png?v=20260418c"),
  ]);

  const drawPageBranding = (pageNumber, totalPages) => {
    doc.setPage(pageNumber);

    if (headerImage) {
      doc.addImage(headerImage, "PNG", 0, 0, pageW, headerHeight, undefined, "FAST");
    } else {
      doc.setFillColor(...palette.navy);
      doc.rect(0, 0, pageW, headerHeight, "F");
    }

    if (footerImage) {
      doc.addImage(footerImage, "PNG", 0, pageH - footerHeight, pageW, footerHeight, undefined, "FAST");
    } else {
      doc.setFillColor(...palette.teal);
      doc.rect(0, pageH - footerHeight, pageW, footerHeight, "F");
    }

    doc.setFontSize(9);
    doc.setTextColor(...palette.muted);
    doc.text(`Generated ${createdAtLabel}`, marginX, pageH - footerHeight - 8);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageW - marginX - 66, pageH - footerHeight - 8);
  };

  const ensureSectionSpace = (requiredHeight = 44) => {
    if (cursorY + requiredHeight > contentBottom) {
      doc.addPage();
      cursorY = contentTop;
    }
  };

  let cursorY = contentTop;

  doc.setFontSize(17);
  doc.setTextColor(...palette.navy);
  doc.text("ORMECO System Performance Report", marginX, cursorY);
  cursorY += 18;

  doc.setFontSize(10);
  doc.setTextColor(...palette.muted);
  doc.text("Operational analytics for daily, weekly, monthly, and yearly monitoring", marginX, cursorY);
  cursorY += 14;

  doc.setFontSize(10);
  doc.setTextColor(...palette.text);
  doc.text(`Period: ${periodLabel.value}`, marginX, cursorY);
  doc.text(`Generated: ${createdAtLabel}`, pageW - marginX - 175, cursorY);
  cursorY += 12;

  if (period.value === "custom" && customScopeSummary.value) {
    doc.setFontSize(9);
    doc.setTextColor(...palette.muted);
    const scopeLines = doc.splitTextToSize(`Custom Scope: ${customScopeSummary.value}`, contentWidth);
    doc.text(scopeLines, marginX, cursorY);
    cursorY += scopeLines.length * 10 + 2;
  }

  doc.setDrawColor(...palette.line);
  doc.line(marginX, cursorY, marginX + contentWidth, cursorY);
  cursorY += 16;

  ensureSectionSpace(44);
  doc.setFontSize(13);
  doc.setTextColor(...palette.navy);
  doc.text("Executive Summary", marginX, cursorY);
  doc.setDrawColor(...palette.line);
  doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);

  const summaryPairs = [];
  for (let i = 0; i < summaryCards.value.length; i += 2) {
    const left = summaryCards.value[i];
    const right = summaryCards.value[i + 1];
    summaryPairs.push([
      `${left?.label || ""}: ${left?.value ?? ""}`,
      right ? `${right.label}: ${right.value}` : "",
    ]);
  }

  autoTable(doc, {
    startY: cursorY + 14,
    head: [["Core Metrics", ""]],
    body: summaryPairs,
    theme: "grid",
    margin: pdfTableMargin,
    pageBreak: "auto",
    rowPageBreak: "avoid",
    styles: {
      fontSize: 10,
      cellPadding: 8,
      textColor: palette.text,
      lineColor: palette.line,
      lineWidth: 1,
    },
    headStyles: {
      fillColor: palette.teal,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: palette.rowAlt,
    },
    columnStyles: {
      0: { cellWidth: 250 },
      1: { cellWidth: 250 },
    },
  });

  cursorY = doc.lastAutoTable.finalY + 18;

  const addGraphSnapshot = async ({ title, element }) => {
    if (!element) return;

    const titleBlock = 24;
    if (cursorY + titleBlock > contentBottom) {
      doc.addPage();
      cursorY = contentTop;
    }

    doc.setFontSize(13);
    doc.setTextColor(...palette.navy);
    doc.text(title, marginX, cursorY);
    doc.setDrawColor(...palette.line);
    doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);
    cursorY += 14;

    try {
      const captureScale = Math.min(3, Math.max(2.25, (window.devicePixelRatio || 1) * 1.6));

      // Wait for any pending chart paint before capturing to avoid partial/soft frames.
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(element, {
        scale: captureScale,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        removeContainer: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const maxW = contentWidth;
      const maxH = contentBottom - cursorY;
      let imgW = maxW;
      let imgH = (canvas.height * imgW) / canvas.width;

      if (imgH > maxH) {
        imgH = maxH;
        imgW = (canvas.width * imgH) / canvas.height;
      }

      if (imgH < 40) return;

      if (cursorY + imgH > contentBottom) {
        doc.addPage();
        cursorY = contentTop;
      }

      doc.addImage(imgData, "PNG", marginX, cursorY, imgW, imgH, undefined, "SLOW");
      cursorY += imgH + 16;
    } catch (captureErr) {
      doc.setFontSize(10);
      doc.setTextColor(...palette.muted);
      doc.text("Graph preview could not be captured for this section.", marginX, cursorY + 14);
      cursorY += 28;
    }
  };

  document.documentElement.classList.add("pdf-export-capture");
  try {
    await addGraphSnapshot({
      title: `${periodLabel.value} Analytics Graph`,
      element: analyticsGraphRef.value,
    });

    await addGraphSnapshot({
      title: "Benefit Distribution Graph",
      element: benefitGraphRef.value,
    });
  } finally {
    document.documentElement.classList.remove("pdf-export-capture");
  }

  const statusRows = [];
  (report.value.statusBreakdown.incidents || []).forEach((r) => statusRows.push(["Incidents", r.status, r.total]));
  (report.value.statusBreakdown.meters || []).forEach((r) => statusRows.push(["Meters", r.status, r.total]));
  (report.value.statusBreakdown.benefitApplications || []).forEach((r) => statusRows.push(["Benefits", r.status, r.total]));
  (report.value.statusBreakdown.seminarSchedule || []).forEach((r) => statusRows.push(["Seminars", r.status, r.total]));

  // Force Trend Breakdown table to start on page 2.
  while (doc.getNumberOfPages() < 2) {
    doc.addPage();
  }
  doc.setPage(2);
  cursorY = contentTop;

  ensureSectionSpace(44);
  doc.setFontSize(14);
  doc.setTextColor(...palette.navy);
  doc.text("Trend Breakdown", marginX, cursorY);
  doc.setDrawColor(...palette.line);
  doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);

  const formatTrendLabelForPdf = (label) => {
    const raw = String(label || "");
    if (!raw) return "-";

    if (period.value === "yearly") {
      const m = raw.match(/^(\d{4})-(\d{2})$/);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
        return d.toLocaleDateString("en-US", { month: "short" });
      }
    }

    if (period.value === "daily" || period.value === "monthly") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: period.value === "daily" ? "numeric" : undefined });
      }
    }

    if (period.value === "weekly") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`;
      }
    }

    return raw;
  };

  const trendTableRows = trendRows.value.map((row) => [
    formatTrendLabelForPdf(row.label),
    Number(row.users || 0).toLocaleString("en-US"),
    Number(row.meters || 0).toLocaleString("en-US"),
    Number(row.incidents || 0).toLocaleString("en-US"),
    Number(row.seminars || 0).toLocaleString("en-US"),
    Number(row.announcements || 0).toLocaleString("en-US"),
    Number(row.total || 0).toLocaleString("en-US"),
  ]);

  autoTable(doc, {
    startY: cursorY + 14,
    head: [["Period", "Users", "Meters", "Incidents", "Seminars", "Announcements", "Total"]],
    body: trendTableRows,
    theme: "grid",
    margin: pdfTableMargin,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [24, 42, 66],
      lineColor: [206, 220, 236],
      lineWidth: 1,
    },
    headStyles: {
      fillColor: [33, 79, 126],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [245, 249, 255],
    },
    columnStyles: {
      0: { cellWidth: 98, halign: "left" },
      1: { cellWidth: 50, halign: "center" },
      2: { cellWidth: 52, halign: "center" },
      3: { cellWidth: 58, halign: "center" },
      4: { cellWidth: 58, halign: "center" },
      5: { cellWidth: 82, halign: "center" },
      6: { cellWidth: 50, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== "body") return;
      if (hookData.column.index === 0) return;

      const raw = String(hookData.cell.raw || "").replace(/,/g, "");
      const value = Number(raw);
      if (!Number.isFinite(value)) return;

      if (value === 0) {
        hookData.cell.styles.textColor = [110, 130, 152];
      } else if (hookData.column.index === 6) {
        hookData.cell.styles.textColor = [22, 56, 96];
      }
    },
  });

  cursorY = doc.lastAutoTable.finalY + 12;

  // Place Operational Status on the same page (page 2) below Trend Breakdown.
  ensureSectionSpace(40);
  doc.setFontSize(13);
  doc.setTextColor(...palette.navy);
  doc.text("Operational Status Distribution", marginX, cursorY);
  doc.setDrawColor(...palette.line);
  doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 12,
    head: [["Category", "Status", "Count"]],
    body: statusRows,
    theme: "grid",
    margin: pdfTableMargin,
    pageBreak: "avoid",
    rowPageBreak: "avoid",
    headStyles: {
      fillColor: [33, 79, 126],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [24, 42, 66],
      lineColor: [206, 220, 236],
      lineWidth: 1,
    },
    alternateRowStyles: {
      fillColor: [245, 249, 255],
    },
  });

  cursorY = doc.lastAutoTable.finalY + 14;

  // Keep Recent Activities table alone on the next page.
  doc.addPage();
  cursorY = contentTop;

  ensureSectionSpace(44);
  doc.setFontSize(14);
  doc.setTextColor(...palette.navy);
  doc.text("Recent System Activities", marginX, cursorY);
  doc.setDrawColor(...palette.line);
  doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 14,
    head: [["Source", "Title", "Timestamp"]],
    body: (report.value.recentActivities || []).map((r) => [
      r.source,
      r.title,
      formatDateTime(r.happened_at),
    ]),
    theme: "grid",
    margin: pdfTableMargin,
    pageBreak: "auto",
    rowPageBreak: "avoid",
    headStyles: {
      fillColor: [20, 113, 92],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: {
      fontSize: 10,
      cellPadding: 7,
      textColor: [24, 42, 66],
      lineColor: [206, 220, 236],
      lineWidth: 1,
    },
    alternateRowStyles: {
      fillColor: [245, 249, 255],
    },
    columnStyles: {
      0: { cellWidth: 90, halign: "left" },
      1: { cellWidth: 255, halign: "left" },
      2: { cellWidth: 135, halign: "left" },
    },
  });

  cursorY = doc.lastAutoTable.finalY + 16;

  const summary = report.value.summary || {};
  const periodUnitMap = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    yearly: "year",
  };
  const periodUnit = periodUnitMap[period.value] || "period";

  // Ensure trend rows are ordered by date so "latest" and window totals are accurate
  // Use pre-sorted trendRows for consistent ordering across on-screen and PDF display
  const rows = trendRows.value;

  const firstRow = rows.length ? rows[0] : null;
  const latestRow = rows.length ? rows[rows.length - 1] : null;
  const previousRow = rows.length > 1 ? rows[rows.length - 2] : null;

  const rangeLabel = firstRow && latestRow
    ? `${formatTrendLabelForPdf(firstRow.label)} to ${formatTrendLabelForPdf(latestRow.label)}`
    : "No activity window";

  const windowTotals = rows.reduce(
    (acc, row) => {
      acc.users += Number(row.users || 0);
      acc.meters += Number(row.meters || 0);
      acc.incidents += Number(row.incidents || 0);
      acc.seminars += Number(row.seminars || 0);
      acc.announcements += Number(row.announcements || 0);
      acc.total += Number(row.total || 0);
      return acc;
    },
    { users: 0, meters: 0, incidents: 0, seminars: 0, announcements: 0, total: 0 }
  );

  const categoryNameMap = {
    users: "Users",
    meters: "Meters",
    incidents: "Incidents",
    seminars: "Seminars",
    announcements: "Announcements",
  };

  const latestCategoryTotals = latestRow
    ? {
        users: Number(latestRow.users || 0),
        meters: Number(latestRow.meters || 0),
        incidents: Number(latestRow.incidents || 0),
        seminars: Number(latestRow.seminars || 0),
        announcements: Number(latestRow.announcements || 0),
      }
    : null;

  const previousCategoryTotals = previousRow
    ? {
        users: Number(previousRow.users || 0),
        meters: Number(previousRow.meters || 0),
        incidents: Number(previousRow.incidents || 0),
        seminars: Number(previousRow.seminars || 0),
        announcements: Number(previousRow.announcements || 0),
      }
    : null;

  const pctChange = (curr, prev) => {
    if (!previousRow) return null;
    if (prev === 0) return curr === 0 ? 0 : 100;
    return Math.round(((curr - prev) / Math.max(1, prev)) * 100);
  };

  const categoryChanges = latestCategoryTotals && previousCategoryTotals
    ? Object.keys(latestCategoryTotals).map((k) => ({
        key: k,
        curr: latestCategoryTotals[k],
        prev: previousCategoryTotals[k] || 0,
        pct: pctChange(latestCategoryTotals[k], previousCategoryTotals[k] || 0),
      }))
    : [];

  const getTop = (obj) => {
    const entries = Object.entries(obj).map(([k, v]) => ({ key: k, value: Number(v || 0) }));
    entries.sort((a, b) => b.value - a.value);
    return entries.length ? entries[0] : null;
  };

  const topLatest = latestCategoryTotals ? getTop(latestCategoryTotals) : null;
  const topOverall = getTop({ users: windowTotals.users, meters: windowTotals.meters, incidents: windowTotals.incidents, seminars: windowTotals.seminars, announcements: windowTotals.announcements });

  const latestTotal = Number(latestRow?.total || 0);
  const previousTotal = Number(previousRow?.total || 0);
  const delta = latestTotal - previousTotal;

  const formatChange = (n) => (n > 0 ? `+${n.toLocaleString("en-US")}` : n === 0 ? "0" : `${n.toLocaleString("en-US")}`);

  // Build summary based ONLY on visible tables and graphs data
  const shortSummaryBullets = [
    `Activity Window: ${rangeLabel}`,
    `Total Updates: ${windowTotals.total.toLocaleString("en-US")} (Users: ${windowTotals.users.toLocaleString("en-US")}, Meters: ${windowTotals.meters.toLocaleString("en-US")}, Incidents: ${windowTotals.incidents.toLocaleString("en-US")}, Seminars: ${windowTotals.seminars.toLocaleString("en-US")}, Announcements: ${windowTotals.announcements.toLocaleString("en-US")})`,
  ];

  // Add benefit distribution summary from graph
  const benefitSummary = (report.value?.benefitDistribution || [])
    .filter((b) => Number(b.count || 0) > 0)
    .slice(0, 3)
    .map((b) => `${b.name}: ${Number(b.count || 0)}`)
    .join(", ");
  if (benefitSummary) {
    shortSummaryBullets.push(`Approved Benefits: ${benefitSummary}`);
  }

  // Add incident status from status breakdown
  const incidentStatuses = (report.value?.statusBreakdown?.incidents || [])
    .filter((s) => Number(s.total || 0) > 0)
    .map((s) => `${s.status}: ${s.total}`)
    .join(", ");
  if (incidentStatuses) {
    shortSummaryBullets.push(`Incident Status: ${incidentStatuses}`);
  }

  // Add recent activities count from table
  const recentActivityCount = Array.isArray(report.value?.recentActivities) ? report.value.recentActivities.length : 0;
  if (recentActivityCount > 0) {
    shortSummaryBullets.push(`Recent Activities Logged: ${recentActivityCount}`);
  }

  const kpiCards = [
    { label: "Total Updates", value: windowTotals.total.toLocaleString("en-US") },
    { label: "Total Users", value: windowTotals.users.toLocaleString("en-US") },
    { label: "Total Incidents", value: windowTotals.incidents.toLocaleString("en-US") },
  ];

  const bulletWrapWidth = contentWidth - 34;
  const bulletLinesByItem = shortSummaryBullets.map((text) => doc.splitTextToSize(text, bulletWrapWidth));
  const bulletSectionHeight = bulletLinesByItem.reduce((h, lines) => h + lines.length * 10 + 6, 0);
  const summaryBoxHeight = 34 + 52 + bulletSectionHeight + 10;

  ensureSectionSpace(summaryBoxHeight + 12);

  doc.setFillColor(244, 249, 255);
  doc.setDrawColor(198, 214, 232);
  doc.roundedRect(marginX, cursorY, contentWidth, summaryBoxHeight, 9, 9, "FD");

  doc.setFillColor(229, 239, 251);
  doc.roundedRect(marginX + 1, cursorY + 1, contentWidth - 2, 24, 8, 8, "F");

  doc.setFontSize(12);
  doc.setTextColor(...palette.navy);
  doc.text("Short Report Summary", marginX + 12, cursorY + 16);

  doc.setFontSize(9);
  doc.setTextColor(...palette.muted);
  doc.text(`Prepared for ${periodLabel.value} period`, marginX + contentWidth - 146, cursorY + 16);

  const cardsY = cursorY + 30;
  const cardGap = 8;
  const cardWidth = (contentWidth - cardGap * 2 - 24) / 3;

  kpiCards.forEach((card, index) => {
    const cardX = marginX + 12 + index * (cardWidth + cardGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(206, 220, 236);
    doc.roundedRect(cardX, cardsY, cardWidth, 42, 6, 6, "FD");

    doc.setFontSize(8);
    doc.setTextColor(...palette.muted);
    doc.text(card.label, cardX + 8, cardsY + 13);

    doc.setFontSize(13);
    doc.setTextColor(...palette.navy);
    doc.text(card.value, cardX + 8, cardsY + 30);
  });

  let bulletY = cardsY + 56;
  doc.setFontSize(9);
  doc.setTextColor(...palette.text);
  bulletLinesByItem.forEach((lines) => {
    doc.setFillColor(47, 110, 168);
    doc.circle(marginX + 14, bulletY - 3, 1.6, "F");
    doc.text(lines, marginX + 21, bulletY);
    bulletY += lines.length * 10 + 6;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    drawPageBranding(page, totalPages);
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`ormeco-system-report-${period.value}-${fileDate}.pdf`);
};

onMounted(loadReport);
</script>

<style scoped>
.page-header-right { display:flex; align-items:center; gap:12px }
.page-search { margin-right:6px }
.reports-page {
  --rp-bg-soft: #f5f9ff;
  --rp-line: #d7e4f2;
  --rp-line-strong: #bfd3e9;
  --rp-text-soft: #5e7694;
  --rp-table-head-bg: #f3f8fd;
  --rp-table-head-text: #47617f;
  --rp-table-text: #10233e;
  --rp-table-row-odd: #ffffff;
  --rp-table-row-even: #fbfdff;
  --rp-table-row-hover: #f2f8ff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.report-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  color: #105f4d;
  background: #e4f6f1;
  border: 1px solid #bfe7db;
}

.report-gen {
  font-size: 12px;
  color: var(--rp-text-soft);
  font-weight: 700;
}

.custom-range-meta {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: #1d4f7f;
}

.report-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.period-switch {
  display: inline-flex;
  gap: 6px;
  padding: 4px;
  background: linear-gradient(180deg, #f7fbff, #edf4fb);
  border: 1px solid var(--rp-line);
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.period-switch .btn {
  padding: 8px 12px;
  border-radius: 10px;
}

.period-switch .btn.active {
  background: linear-gradient(135deg, #e2f7f2, #f0fcf8);
  border-color: #aee3d4;
  color: #116351;
  box-shadow: 0 6px 14px rgba(15, 139, 111, 0.16);
}

.custom-scope-panel {
  border: 1px solid var(--rp-line);
  border-radius: 16px;
  padding: 14px;
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 139, 111, 0.1), transparent 36%),
    radial-gradient(circle at 100% 100%, rgba(47, 110, 168, 0.08), transparent 34%),
    #ffffff;
}

.custom-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.custom-head h3 {
  margin: 0;
  color: #10233e;
}

.custom-head span {
  color: var(--rp-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.custom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.custom-field {
  display: grid;
  gap: 6px;
}

.custom-field span {
  color: var(--rp-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.custom-field input,
.custom-field select {
  width: 100%;
  border: 1px solid var(--rp-line);
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 14px;
  color: #10233e;
  background: #ffffff;
}

.custom-field input:focus,
.custom-field select:focus {
  outline: none;
  border-color: #7eb2db;
  box-shadow: 0 0 0 3px rgba(47, 110, 168, 0.16);
}

.custom-weekdays {
  margin-top: 12px;
}

.custom-weekdays p {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--rp-text-soft);
}

.weekday-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weekday-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.weekday-chip input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.weekday-chip span {
  border: 1px solid #c8d9ec;
  background: #f4f9ff;
  color: #23415f;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
}

.weekday-chip input:checked + span {
  background: linear-gradient(135deg, #daf4ed, #f1fbf8);
  border-color: #9edbc8;
  color: #0f6c57;
  box-shadow: 0 4px 10px rgba(15, 139, 111, 0.16);
}

.custom-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

.kpi {
  padding: 14px;
  position: relative;
  overflow: hidden;
  animation: riseIn 0.45s ease both;
}

.kpi::after {
  content: "";
  position: absolute;
  right: -24px;
  top: -30px;
  width: 90px;
  height: 90px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(15, 139, 111, 0.15), transparent 70%);
}

.kpi-label {
  font-size: 12px;
  color: var(--rp-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.kpi-value {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  color: #10233e;
  letter-spacing: -0.02em;
}

.section-block {
  padding: 14px;
  border: 1px solid var(--rp-line);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  box-shadow: 0 12px 28px rgba(16, 35, 62, 0.08);
}

.analytics-block {
  padding: 14px;
  border: 1px solid var(--rp-line);
  border-radius: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 139, 111, 0.14), transparent 40%),
    radial-gradient(circle at 100% 100%, rgba(47, 110, 168, 0.12), transparent 38%),
    #ffffff;
  box-shadow: 0 14px 34px rgba(16, 35, 62, 0.1);
}

.analytics-head {
  margin-bottom: 12px;
}

.analytics-layout {
  display: grid;
  grid-template-columns: 1.7fr 0.8fr;
  gap: 12px;
}

.chart-shell {
  position: relative;
  border: 1px solid var(--rp-line);
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
  padding: 10px 10px 4px;
  overflow: hidden;
}

.chart-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.4) 48%, transparent 100%);
  transform: translateX(-140%);
  animation: chartSweep 1.3s ease 0.2s;
  pointer-events: none;
}

.trend-chart {
  width: 100%;
  height: auto;
}

.grid-line {
  stroke: #b7cae0;
  stroke-width: 1.5;
}

.axis-base {
  stroke: #7d98b8;
  stroke-width: 2;
}

.area-fill {
  animation: areaRise 0.8s ease;
}

.line-path {
  stroke-dasharray: 1500;
  stroke-dashoffset: 1500;
  animation: drawLine 1.05s ease forwards;
  transition: opacity 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease;
  opacity: 1;
}

.line-path.highlighted {
  stroke-width: 4.2;
  filter: drop-shadow(0 0 4px rgba(15, 44, 84, 0.22));
}

.line-path.muted {
  opacity: 0.48;
}

.line-point {
  opacity: 0;
  transform-origin: center;
  animation: pointPop 0.35s ease forwards;
  animation-delay: 0.35s;
  transition: opacity 0.2s ease, r 0.2s ease, filter 0.2s ease;
  cursor: pointer;
}

.line-point.zero {
  fill: #ffffff;
  stroke-width: 2;
}

.line-point.highlighted {
  r: 4.6;
}

.line-point.active {
  r: 5.3;
  filter: drop-shadow(0 0 4px rgba(16, 35, 62, 0.28));
}

.line-point.muted {
  opacity: 0.52;
}

.axis-label {
  fill: #345170;
  font-size: 13px;
  font-weight: 800;
}

.chart-empty-note {
  position: absolute;
  left: 16px;
  top: 14px;
  margin: 0;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #26476c;
  background: rgba(241, 248, 255, 0.96);
  border: 1px solid #bed5ee;
  border-radius: 8px;
}

.chart-legend {
  border: 1px solid var(--rp-line);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #fafdff);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  border: 1px solid #c9dbef;
  border-radius: 12px;
  background: #edf5ff;
  padding: 10px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  animation: revealUp 0.35s ease both;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.chart-tooltip-svg {
  pointer-events: none;
}

.tooltip-guide {
  stroke: rgba(47, 110, 168, 0.45);
  stroke-width: 1.2;
  stroke-dasharray: 4 4;
}

.tooltip-box {
  fill: rgba(13, 30, 52, 0.94);
  stroke: rgba(162, 192, 224, 0.35);
  stroke-width: 1;
  filter: drop-shadow(0 7px 16px rgba(7, 22, 40, 0.22));
}

.tooltip-title {
  fill: #d6e6fa;
  font-size: 10px;
  font-weight: 700;
}

.tooltip-value {
  fill: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.legend-item:hover,
.legend-item.active {
  transform: translateY(-1px);
  border-color: var(--rp-line-strong);
  background: #edf6ff;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-name {
  font-size: 13px;
  font-weight: 700;
  color: #1f3a59;
}

.legend-total {
  font-size: 15px;
  color: #0c2949;
}

.legend-item.zero-series {
  background: #f5f9ff;
  border-color: #d8e6f4;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.section-head h3 {
  margin: 0;
  font-size: 17px;
  color: #10233e;
}

.section-head span {
  color: var(--rp-text-soft);
  font-size: 12px;
}

.table-wrap {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  overflow: hidden;
  border-radius: 12px;
}

.report-table th,
.report-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #e5edf7;
  text-align: left;
  color: var(--rp-table-text);
}

.report-table th {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--rp-table-head-text);
  background: var(--rp-table-head-bg);
  letter-spacing: 0.06em;
}

.report-table tbody tr:nth-child(odd) {
  background: var(--rp-table-row-odd);
}

.report-table tbody tr:nth-child(even) {
  background: var(--rp-table-row-even);
}

.report-table tbody tr:hover {
  background: var(--rp-table-row-hover);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.status-card {
  padding: 14px;
  border: 1px solid var(--rp-line);
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff, #fafdff);
}

.status-card h4 {
  margin: 0 0 10px 0;
  font-size: 15px;
  color: #1a2f4a;
}

.status-card ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.status-card li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid #ecf2f9;
  text-transform: capitalize;
}

.status-card li:last-child {
  border-bottom: none;
}

.loading-card,
.error-card {
  padding: 16px;
}

.glass-card {
  border: 1px solid var(--rp-line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.96));
  box-shadow: 0 10px 26px rgba(16, 35, 62, 0.08);
}

.reveal {
  animation: revealUp 0.42s ease both;
}

.error-card {
  color: #b42318;
  border-color: #f7c2c2;
  background: #fff6f6;
}

/* Benefit Distribution Styles */
.benefit-distribution {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 20px;
  align-items: center;
}

.pie-chart-container {
  position: relative;
  width: 240px;
  height: 240px;
}

.pie-chart {
  width: 100%;
  height: 100%;
}

.pie-base-ring {
  transition: opacity 0.2s ease;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: white;
  border-radius: 999px;
  width: 100px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #cddff3;
  box-shadow: 0 6px 14px rgba(16, 35, 62, 0.12);
}

.pie-total {
  font-size: 24px;
  color: #10233e;
}

.pie-label {
  font-size: 11px;
  color: #67809e;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: 4px;
}

.benefit-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 8px;
}

.benefit-legend::-webkit-scrollbar {
  width: 6px;
}

.benefit-legend::-webkit-scrollbar-track {
  background: #f3f8fd;
  border-radius: 10px;
}

.benefit-legend::-webkit-scrollbar-thumb {
  background: #bfd3e9;
  border-radius: 10px;
}

.benefit-item {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 10px;
  background: #f3f8ff;
  border: 1px solid #dce8f4;
  transition: all 0.15s ease;
}

.benefit-item.zero-item {
  opacity: 0.9;
}

.benefit-item:hover {
  background: #eff6ff;
  border-color: #dce7f3;
}

.benefit-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.benefit-name {
  font-size: 13px;
  color: #304d6e;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benefit-count {
  font-size: 14px;
  color: #10233e;
  font-weight: 700;
}

.benefit-count.zero {
  color: #5f7692;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #67809e;
}

@media (max-width: 1000px) {
  .benefit-distribution {
    grid-template-columns: 1fr;
  }

  .custom-grid {
    grid-template-columns: 1fr;
  }

  .custom-actions {
    justify-content: stretch;
  }

  .custom-actions .btn {
    flex: 1;
  }

  .analytics-layout {
    grid-template-columns: 1fr;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }

  .report-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}

@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes chartSweep {
  to {
    transform: translateX(160%);
  }
}

@keyframes pointPop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes areaRise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes revealUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:global(html.pdf-export-capture) .reports-page .chart-shell::before,
:global(html.pdf-export-capture) .reports-page .area-fill,
:global(html.pdf-export-capture) .reports-page .line-path,
:global(html.pdf-export-capture) .reports-page .line-point,
:global(html.pdf-export-capture) .reports-page .legend-item,
:global(html.pdf-export-capture) .reports-page .reveal,
:global(html.pdf-export-capture) .reports-page .kpi {
  animation: none !important;
  transition: none !important;
}

:global(html.ormeco-dark) .reports-page {
  --rp-bg-soft: #0f1d31;
  --rp-line: #33506f;
  --rp-line-strong: #4a6b91;
  --rp-text-soft: #a6bed8;
  --rp-table-head-bg: #13263d;
  --rp-table-head-text: #c9dcef;
  --rp-table-text: #e9f3ff;
  --rp-table-row-odd: #122337;
  --rp-table-row-even: #0f1d31;
  --rp-table-row-hover: #16273d;
}

:global(html.ormeco-dark) .reports-page .report-badge {
  color: #7bead0;
  background: rgba(41, 201, 163, 0.16);
  border-color: rgba(41, 201, 163, 0.38);
}

:global(html.ormeco-dark) .reports-page .custom-range-meta {
  color: #8fc5f3;
}

:global(html.ormeco-dark) .reports-page .period-switch {
  background: #0f1d31;
}

:global(html.ormeco-dark) .reports-page .custom-scope-panel {
  background:
    radial-gradient(circle at 0% 0%, rgba(41, 201, 163, 0.14), transparent 40%),
    radial-gradient(circle at 100% 100%, rgba(92, 154, 226, 0.1), transparent 36%),
    #0f1d31;
  border-color: #33506f;
}

:global(html.ormeco-dark) .reports-page .custom-field input,
:global(html.ormeco-dark) .reports-page .custom-field select {
  background: #12253c;
  color: #e9f3ff;
  border-color: #3a5a7c;
}

:global(html.ormeco-dark) .reports-page .weekday-chip span {
  background: #13263d;
  border-color: #3b5f84;
  color: #c9dcef;
}

:global(html.ormeco-dark) .reports-page .weekday-chip input:checked + span {
  background: rgba(41, 201, 163, 0.18);
  border-color: rgba(41, 201, 163, 0.5);
  color: #7bead0;
}

:global(html.ormeco-dark) .reports-page .period-switch .btn.active {
  background: rgba(41, 201, 163, 0.16);
  border-color: rgba(41, 201, 163, 0.45);
  color: #7bead0;
}

:global(html.ormeco-dark) .reports-page .kpi,
:global(html.ormeco-dark) .reports-page .analytics-block,
:global(html.ormeco-dark) .reports-page .section-block,
:global(html.ormeco-dark) .reports-page .status-card,
:global(html.ormeco-dark) .reports-page .glass-card,
:global(html.ormeco-dark) .reports-page .chart-legend {
  background: #0f1d31;
  border-color: #33506f;
}

:global(html.ormeco-dark) .reports-page .kpi-value,
:global(html.ormeco-dark) .reports-page .legend-total,
:global(html.ormeco-dark) .reports-page .pie-total,
:global(html.ormeco-dark) .reports-page .benefit-count,
:global(html.ormeco-dark) .reports-page .section-head h3,
:global(html.ormeco-dark) .reports-page .status-card h4,
:global(html.ormeco-dark) .reports-page .status-card li strong,
:global(html.ormeco-dark) .reports-page .report-table td {
  color: #e9f3ff;
}

:global(html.ormeco-dark) .reports-page .kpi-label,
:global(html.ormeco-dark) .reports-page .report-gen,
:global(html.ormeco-dark) .reports-page .section-head span,
:global(html.ormeco-dark) .reports-page .legend-name,
:global(html.ormeco-dark) .reports-page .pie-label,
:global(html.ormeco-dark) .reports-page .benefit-name,
:global(html.ormeco-dark) .reports-page .empty-state,
:global(html.ormeco-dark) .reports-page .axis-label,
:global(html.ormeco-dark) .reports-page .chart-empty-note {
  color: #a6bed8;
}

:global(html.ormeco-dark) .reports-page .axis-base {
  stroke: #7f9dbe;
}

:global(html.ormeco-dark) .reports-page .grid-line {
  stroke: #4f6f93;
}

:global(html.ormeco-dark) .reports-page .chart-empty-note {
  background: rgba(18, 39, 62, 0.9);
  border-color: #3e5f85;
}

:global(html.ormeco-dark) .reports-page .pie-base-ring {
  opacity: 0.55;
}

:global(html.ormeco-dark) .reports-page .chart-shell,
:global(html.ormeco-dark) .reports-page .legend-item,
:global(html.ormeco-dark) .reports-page .benefit-item,
:global(html.ormeco-dark) .reports-page .pie-center {
  background: #0f1d31;
  border-color: #33506f;
}

:global(html.ormeco-dark) .reports-page .legend-item:hover,
:global(html.ormeco-dark) .reports-page .legend-item.active,
:global(html.ormeco-dark) .reports-page .benefit-item:hover {
  background: #16273d;
  border-color: #4a6b91;
}

:global(html.ormeco-dark) .reports-page .grid-line,
:global(html.ormeco-dark) .reports-page .status-card li {
  border-color: #2d435d;
}

:global(html.ormeco-dark) .reports-page .error-card {
  background: rgba(200, 73, 73, 0.14);
  border-color: rgba(255, 125, 125, 0.34);
  color: #ffb2b2;
}
</style>
