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
                  <stop offset="0%" stop-color="#0f8b6f" stop-opacity="0.34" />
                  <stop offset="100%" stop-color="#0f8b6f" stop-opacity="0.03" />
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
                  stroke-width="3"
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
                  r="3.6"
                  :fill="series.color"
                  class="line-point"
                  tabindex="0"
                  :class="{
                    muted: highlightedSeries && highlightedSeries !== series.key,
                    highlighted: highlightedSeries === series.key,
                    active: tooltip.visible && tooltip.key === `${series.key}-${idx}`
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
          </div>

          <div class="chart-legend">
            <button
              v-for="(series, idx) in chartSeries"
              :key="`legend-${series.key}`"
              type="button"
              class="legend-item"
              :class="{ active: highlightedSeries === series.key }"
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

      <section ref="benefitGraphRef" class="card-surface section-block reveal">
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
                <th>Announcements</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in trendRows" :key="row.label">
                <td>{{ row.label }}</td>
                <td>{{ row.users }}</td>
                <td>{{ row.meters }}</td>
                <td>{{ row.incidents }}</td>
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
      <section class="card-surface section-block reveal">
        <div class="section-head">
          <h3>Benefit Distribution</h3>
          <span>Approved applications by benefit type</span>
        </div>

        <div v-if="benefitChartData.length" class="benefit-distribution">
          <div class="pie-chart-container">
            <svg viewBox="0 0 240 240" class="pie-chart">
              <circle cx="120" cy="120" r="90" fill="none" :stroke-dasharray="pieData.circumference" :stroke-dashoffset="0" stroke="url(#pieGradient)" stroke-width="60" opacity="0.2" />
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
              <span class="pie-label">Approved</span>
            </div>
          </div>

          <div class="benefit-legend">
            <div v-for="(item, idx) in benefitChartData" :key="`benefit-${idx}`" class="benefit-item">
              <span class="benefit-color" :style="{ background: benefitColors[idx % benefitColors.length] }"></span>
              <span class="benefit-name">{{ item.name }}</span>
              <strong class="benefit-count">{{ item.count }}</strong>
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
import { computed, onMounted, ref } from "vue";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import api from "../api";

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
];

const periodLabel = computed(() => {
  const found = periods.find((p) => p.value === period.value);
  return found ? found.label : "Monthly";
});

const summaryCards = computed(() => {
  if (!report.value) return [];
  const s = report.value.summary || {};
  return [
    { label: "Total Members", value: s.total_members || 0 },
    { label: "Total Users", value: s.total_users || 0 },
    { label: "Active Benefits", value: s.active_benefits || 0 },
    { label: "Pending Benefits", value: s.pending_benefits || 0 },
    { label: "Open Incidents", value: s.open_incidents || 0 },
    { label: "Active Meters", value: s.active_meters || 0 },
    { label: "Announcements", value: s.total_announcements || 0 },
  ];
});

const trendRows = computed(() => {
  if (!report.value) return [];
  const labels = report.value.labels || [];
  const trends = report.value.trends || {};

  return labels.map((label, idx) => {
    const users = Number(trends.users?.[idx] || 0);
    const meters = Number(trends.meters?.[idx] || 0);
    const incidents = Number(trends.incidents?.[idx] || 0);
    const announcements = Number(trends.announcements?.[idx] || 0);
    return {
      label,
      users,
      meters,
      incidents,
      announcements,
      total: users + meters + incidents + announcements,
    };
  });
});

const chartLabels = computed(() => report.value?.labels || []);
const chartAnimationKey = computed(() => `${period.value}-${chartLabels.value.length}-${report.value?.generatedAt || ""}`);

const formatAxisLabel = (label) => {
  if (period.value !== "weekly") return label;
  const d = new Date(label);
  if (Number.isNaN(d.getTime())) return label;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTooltipPeriod = (label) => {
  if (period.value === "weekly") {
    const d = new Date(label);
    if (Number.isNaN(d.getTime())) return `Week of ${label}`;
    return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return label;
};

const chartMax = computed(() => {
  if (!report.value) return 10;
  const trends = report.value.trends || {};
  const all = [
    ...(trends.users || []),
    ...(trends.meters || []),
    ...(trends.incidents || []),
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
    { key: "users", label: "Users", color: "#2f6ea8", data: (trends.users || []).map((n) => Number(n) || 0) },
    { key: "meters", label: "Meters", color: "#0f8b6f", data: (trends.meters || []).map((n) => Number(n) || 0) },
    { key: "incidents", label: "Incidents", color: "#d17d2a", data: (trends.incidents || []).map((n) => Number(n) || 0) },
    { key: "announcements", label: "Announcements", color: "#7a57b3", data: (trends.announcements || []).map((n) => Number(n) || 0) },
  ];

  return list.map((series) => ({
    ...series,
    total: series.data.reduce((sum, n) => sum + n, 0),
    points: toPointsString(series.data),
    pointData: toPointData(series.data),
  }));
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
    const { data } = await api.get("/reports/overview", {
      params: { period: period.value },
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
  const generatedDate = createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const generatedTime = createdAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const createdAtLabel = createdAt.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const pageW = doc.internal.pageSize.getWidth();

  const marginX = 40;
  const contentWidth = pageW - marginX * 2;
  const reportTitle = "ORMECO System Performance Report";
  const reportSubtitle = "Operational analytics for daily, weekly, monthly, and yearly monitoring";
  const infoW = 232;
  const infoH = 62;
  const infoX = pageW - marginX - infoW;
  const infoY = 24;

  const titleMaxW = infoX - marginX - 20;

  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(reportTitle, titleMaxW);
  doc.setFontSize(11);
  const subtitleLines = doc.splitTextToSize(reportSubtitle, titleMaxW);

  const titleY = 38;
  const titleBlockH = titleLines.length * 20;
  const subtitleY = titleY + titleBlockH + 2;
  const subtitleBlockH = subtitleLines.length * 14;
  const headerH = Math.max(infoY + infoH + 16, subtitleY + subtitleBlockH + 18);

  doc.setFillColor(...palette.navy);
  doc.rect(0, 0, pageW, headerH, "F");

  doc.setFillColor(...palette.teal);
  doc.rect(0, headerH - 4, pageW, 4, "F");

  doc.setDrawColor(74, 110, 149);
  doc.setFillColor(...palette.navySoft);
  doc.roundedRect(infoX, infoY, infoW, infoH, 10, 10, "FD");

  doc.setFontSize(9);
  doc.setTextColor(173, 201, 232);
  doc.text("REPORT FILTER", infoX + 14, infoY + 16);

  doc.setFontSize(12);
  doc.setTextColor(236, 244, 252);
  doc.text(`Period: ${periodLabel.value}`, infoX + 14, infoY + 34);
  doc.text(`Generated: ${generatedDate}  ${generatedTime}`, infoX + 14, infoY + 51);

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(titleLines, marginX, titleY);

  doc.setFontSize(11);
  doc.setTextColor(203, 219, 238);
  doc.text(subtitleLines, marginX, subtitleY);

  let cursorY = headerH + 26;

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

    const pageH = doc.internal.pageSize.getHeight();
    const titleBlock = 24;
    if (cursorY + titleBlock > pageH - 50) {
      doc.addPage();
      cursorY = 46;
    }

    doc.setFontSize(13);
    doc.setTextColor(...palette.navy);
    doc.text(title, marginX, cursorY);
    doc.setDrawColor(...palette.line);
    doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);
    cursorY += 14;

    try {
      const canvas = await html2canvas(element, {
        scale: 1.7,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const maxW = contentWidth;
      const maxH = pageH - cursorY - 50;
      let imgW = maxW;
      let imgH = (canvas.height * imgW) / canvas.width;

      if (imgH > maxH) {
        imgH = maxH;
        imgW = (canvas.width * imgH) / canvas.height;
      }

      if (imgH < 40) return;

      if (cursorY + imgH > pageH - 50) {
        doc.addPage();
        cursorY = 46;
      }

      doc.addImage(imgData, "PNG", marginX, cursorY, imgW, imgH, undefined, "FAST");
      cursorY += imgH + 16;
    } catch (captureErr) {
      doc.setFontSize(10);
      doc.setTextColor(...palette.muted);
      doc.text("Graph preview could not be captured for this section.", marginX, cursorY + 14);
      cursorY += 28;
    }
  };

  await addGraphSnapshot({
    title: `${periodLabel.value} Analytics Graph`,
    element: analyticsGraphRef.value,
  });

  await addGraphSnapshot({
    title: "Benefit Distribution Graph",
    element: benefitGraphRef.value,
  });

  doc.setFontSize(13);
  doc.setTextColor(...palette.navy);
  doc.text("Trend Breakdown", marginX, cursorY);
  doc.setDrawColor(...palette.line);
  doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 14,
    head: [["Period", "Users", "Meters", "Incidents", "Announcements", "Total"]],
    body: trendRows.value.map((row) => [
      row.label,
      row.users,
      row.meters,
      row.incidents,
      row.announcements,
      row.total,
    ]),
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: palette.text,
      lineColor: palette.line,
      lineWidth: 1,
    },
    headStyles: {
      fillColor: palette.navySoft,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: palette.rowAlt,
    },
    columnStyles: {
      5: { fontStyle: "bold" },
    },
  });

  const statusRows = [];
  (report.value.statusBreakdown.incidents || []).forEach((r) => statusRows.push(["Incidents", r.status, r.total]));
  (report.value.statusBreakdown.meters || []).forEach((r) => statusRows.push(["Meters", r.status, r.total]));
  (report.value.statusBreakdown.benefitApplications || []).forEach((r) => statusRows.push(["Benefits", r.status, r.total]));
  (report.value.statusBreakdown.seminarSchedule || []).forEach((r) => statusRows.push(["Seminars", r.status, r.total]));

  cursorY = doc.lastAutoTable.finalY + 18;

  doc.setFontSize(13);
  doc.setTextColor(...palette.navy);
  doc.text("Operational Status Distribution", marginX, cursorY);
  doc.setDrawColor(...palette.line);
  doc.line(marginX, cursorY + 8, marginX + contentWidth, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 14,
    head: [["Category", "Status", "Count"]],
    body: statusRows,
    theme: "grid",
    headStyles: {
      fillColor: palette.navySoft,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: palette.text,
      lineColor: palette.line,
      lineWidth: 1,
    },
    alternateRowStyles: {
      fillColor: palette.rowAlt,
    },
  });

  cursorY = doc.lastAutoTable.finalY + 18;

  doc.setFontSize(13);
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
    headStyles: {
      fillColor: palette.tealDark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: palette.text,
      lineColor: palette.line,
      lineWidth: 1,
    },
    alternateRowStyles: {
      fillColor: palette.rowAlt,
    },
    columnStyles: {
      1: { cellWidth: 280 },
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const pageH = doc.internal.pageSize.getHeight();

    doc.setDrawColor(...palette.line);
    doc.line(marginX, pageH - 34, pageW - marginX, pageH - 34);

    doc.setFontSize(9);
    doc.setTextColor(...palette.muted);
    doc.text(`ORMECO Confidential Report  •  ${createdAtLabel}`, marginX, pageH - 20);
    doc.text(`Page ${page} of ${totalPages}`, pageW - marginX - 66, pageH - 20);
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`ormeco-system-report-${period.value}-${fileDate}.pdf`);
};

onMounted(loadReport);
</script>

<style scoped>
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
  stroke: #e4edf7;
  stroke-width: 1;
}

.area-fill {
  animation: areaRise 0.8s ease;
}

.line-path {
  stroke-dasharray: 1500;
  stroke-dashoffset: 1500;
  animation: drawLine 1.05s ease forwards;
  transition: opacity 0.2s ease, stroke-width 0.2s ease;
}

.line-path.highlighted {
  stroke-width: 3.8;
}

.line-path.muted {
  opacity: 0.2;
}

.line-point {
  opacity: 0;
  transform-origin: center;
  animation: pointPop 0.35s ease forwards;
  animation-delay: 0.35s;
  transition: opacity 0.2s ease, r 0.2s ease, filter 0.2s ease;
  cursor: pointer;
}

.line-point.highlighted {
  r: 4.6;
}

.line-point.active {
  r: 5;
  filter: drop-shadow(0 0 4px rgba(16, 35, 62, 0.28));
}

.line-point.muted {
  opacity: 0.15;
}

.axis-label {
  fill: #67809e;
  font-size: 11px;
  font-weight: 700;
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
  border: 1px solid #dce7f3;
  border-radius: 12px;
  background: #f7fbff;
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
  color: #304d6e;
}

.legend-total {
  font-size: 14px;
  color: #122b47;
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
  border: 1px solid #e4edf7;
  box-shadow: 0 4px 12px rgba(16, 35, 62, 0.08);
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
  background: #f8fbff;
  border: 1px solid #ecf2f9;
  transition: all 0.15s ease;
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

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #67809e;
}

@media (max-width: 1000px) {
  .benefit-distribution {
    grid-template-columns: 1fr;
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

:global(html.ormeco-dark) .reports-page .period-switch {
  background: #0f1d31;
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
:global(html.ormeco-dark) .reports-page .axis-label {
  color: #a6bed8;
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
