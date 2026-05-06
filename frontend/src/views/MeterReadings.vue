<template>
  <div class="page-shell meter-readings-shell">
    <div class="page-header">
      <div>
        <h2 class="page-title">Meter Readings</h2>
        <p class="page-subtitle">Track consumption history and maintain accurate readings</p>
      </div>

      <div class="page-header-right">
        <div class="meter-module-tabs" role="tablist" aria-label="Meter pages">
          <router-link to="/meters" class="meter-tab">Meters</router-link>
          <router-link to="/meters/readings" class="meter-tab active">Meter Readings</router-link>
        </div>

        <div class="page-search">
          <SearchBar v-model="search" placeholder="Search by meter number, owner, date, or kWh..." />
        </div>

        <button type="button" @click="openCreate" class="btn btn-primary">+ New Reading</button>
      </div>
    </div>

    <section class="reading-kpis">
      <article class="kpi-card">
        <p class="kpi-label">Total Records</p>
        <h3 class="kpi-value">{{ stats.totalRecords.toLocaleString("en-US") }}</h3>
      </article>
      <article class="kpi-card">
        <p class="kpi-label">Unique Meters</p>
        <h3 class="kpi-value">{{ stats.uniqueMeters.toLocaleString("en-US") }}</h3>
      </article>
      <article class="kpi-card">
        <p class="kpi-label">Total kWh Logged</p>
        <h3 class="kpi-value">{{ stats.totalKwh.toLocaleString("en-US", { maximumFractionDigits: 2 }) }}</h3>
      </article>
      <article class="kpi-card">
        <p class="kpi-label">Average kWh</p>
        <h3 class="kpi-value">{{ stats.averageKwh.toLocaleString("en-US", { maximumFractionDigits: 2 }) }}</h3>
      </article>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredReadings"
      idKey="id"
      @edit="openEdit"
      @delete="remove"
    >
      <template #cell-kwh="{ value }">
        {{ Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
      </template>
      <template #cell-reading_date="{ value }">
        {{ formatDate(value) }}
      </template>
    </DataTable>

    <div v-if="showModal" class="modal-overlay" @click.self="close">
      <div class="modal-panel glass-soft reading-modal-panel">
        <h3 class="modal-title">{{ form.id ? "Edit Meter Reading" : "New Meter Reading" }}</h3>

        <label class="form-field">
          <span class="form-label">Meter</span>
          <select v-model="form.meter_id" class="select">
            <option value="" disabled>Select a meter</option>
            <option v-for="m in meterOptions" :key="m.id" :value="String(m.id)">
              {{ m.meter_number }} - {{ m.full_name || "No owner" }}
            </option>
          </select>
        </label>

        <label class="form-field">
          <span class="form-label">Reading (kWh)</span>
          <input v-model="form.kwh" type="number" min="0" step="0.01" class="input" placeholder="e.g. 182.50" />
        </label>

        <label class="form-field">
          <span class="form-label">Reading Date</span>
          <input v-model="form.reading_date" type="date" class="input" />
        </label>

        <div class="modal-actions">
          <button type="button" @click="close" class="btn btn-secondary">Cancel</button>
          <button type="button" @click="save" class="btn btn-primary">Save Reading</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../api";
import DataTable from "../components/DataTable.vue";
import SearchBar from "../components/SearchBar.vue";

const readings = ref([]);
const meterOptions = ref([]);
const search = ref("");
const showModal = ref(false);

const form = ref({
  id: null,
  meter_id: "",
  kwh: "",
  reading_date: "",
});

const columns = [
  { key: "id", label: "ID" },
  { key: "meter_number", label: "Meter No." },
  { key: "user_name", label: "Owner" },
  { key: "kwh", label: "kWh" },
  { key: "reading_date", label: "Reading Date" },
];

const filteredReadings = computed(() => {
  const q = String(search.value || "").trim().toLowerCase();
  if (!q) return readings.value;

  return readings.value.filter((row) =>
    [
      row.id,
      row.meter_number,
      row.user_name,
      row.kwh,
      row.reading_date,
    ]
      .map((value) => String(value || "").toLowerCase())
      .some((value) => value.includes(q))
  );
});

const stats = computed(() => {
  const source = filteredReadings.value;
  const totalRecords = source.length;
  const totalKwh = source.reduce((acc, row) => acc + (Number(row.kwh) || 0), 0);
  const uniqueMeters = new Set(source.map((row) => row.meter_id)).size;
  const averageKwh = totalRecords ? totalKwh / totalRecords : 0;

  return {
    totalRecords,
    uniqueMeters,
    totalKwh,
    averageKwh,
  };
});

const formatDate = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
};

const loadReadings = async () => {
  try {
    const { data } = await api.get("/meters/readings");
    readings.value = Array.isArray(data) ? data : [];
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || "Failed to load meter readings";
    alert(message);
  }
};

const loadMeters = async () => {
  try {
    const { data } = await api.get("/meters");
    meterOptions.value = Array.isArray(data) ? data : [];
  } catch (_err) {
    meterOptions.value = [];
  }
};

const openCreate = () => {
  form.value = {
    id: null,
    meter_id: "",
    kwh: "",
    reading_date: "",
  };
  showModal.value = true;
};

const openEdit = (row) => {
  form.value = {
    id: row.id,
    meter_id: String(row.meter_id || ""),
    kwh: String(row.kwh ?? ""),
    reading_date: row.reading_date ? String(row.reading_date).slice(0, 10) : "",
  };
  showModal.value = true;
};

const save = async () => {
  const payload = {
    meter_id: Number(form.value.meter_id),
    kwh: Number(form.value.kwh),
    reading_date: String(form.value.reading_date || "").trim(),
  };

  if (!Number.isInteger(payload.meter_id) || payload.meter_id <= 0) {
    alert("Please select a valid meter.");
    return;
  }
  if (!Number.isFinite(payload.kwh) || payload.kwh < 0) {
    alert("Please enter a valid kWh value.");
    return;
  }
  if (!payload.reading_date) {
    alert("Reading date is required.");
    return;
  }

  try {
    if (form.value.id) {
      await api.put(`/meters/readings/${form.value.id}`, payload);
    } else {
      await api.post("/meters/readings", payload);
    }

    showModal.value = false;
    await loadReadings();
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || "Failed to save meter reading";
    alert(message);
  }
};

const remove = async (row) => {
  if (!confirm("Delete this meter reading?")) return;

  try {
    await api.delete(`/meters/readings/${row.id}`);
    await loadReadings();
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || "Failed to delete meter reading";
    alert(message);
  }
};

const close = () => {
  showModal.value = false;
};

onMounted(async () => {
  await Promise.all([loadReadings(), loadMeters()]);
});
</script>

<style scoped>
.page-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-search {
  width: min(360px, 30vw);
}

.meter-module-tabs {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  border: 1px solid #d3e0ee;
  border-radius: 999px;
  background: #f6f9fc;
  gap: 4px;
}

.meter-tab {
  text-decoration: none;
  color: #4f6580;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  border-radius: 999px;
  padding: 8px 12px;
  transition: all 0.18s ease;
}

.meter-tab.active,
.meter-tab.router-link-active {
  background: linear-gradient(135deg, #0f8b6f 0%, #16a085 100%);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(15, 139, 111, 0.25);
}

.reading-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.kpi-card {
  border: 1px solid #dce5ef;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  padding: 14px;
}

.kpi-label {
  margin: 0;
  color: #6b809b;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
}

.kpi-value {
  margin: 6px 0 0;
  color: #10233e;
  font-size: 24px;
  font-weight: 750;
}

.meter-readings-shell :deep(.table-wrapper) {
  box-shadow: 0 14px 30px rgba(16, 35, 62, 0.08);
}

.reading-modal-panel {
  width: min(520px, 94vw);
}

@media (max-width: 1160px) {
  .reading-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page-header-right {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .page-search {
    width: min(420px, 100%);
  }
}

@media (max-width: 768px) {
  .reading-kpis {
    grid-template-columns: 1fr;
  }

  .meter-module-tabs {
    width: 100%;
    justify-content: space-between;
  }

  .meter-tab {
    flex: 1;
    text-align: center;
  }

  .page-search {
    width: 100%;
  }
}
</style>
