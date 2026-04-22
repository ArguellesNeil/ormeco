<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2 class="page-title">Billing Rates</h2>
        <p class="page-subtitle">Review and update current utility rates.</p>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="rates"
      idKey="id"
      @edit="openEdit"
      @delete="remove"
    >
      <template #cell-effective_to="{ row }">
        {{ formatDateOnly(row.effective_to) }}
      </template>
    </DataTable>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-panel">
        <h3 class="modal-title">Edit Billing Rate</h3>

        <label class="form-field">
          <span class="form-label">Effective From</span>
          <input v-model="form.effective_from" type="date" class="input" />
        </label>

        <label class="form-field">
          <span class="form-label">Effective To</span>
          <input v-model="form.effective_to" type="date" class="input" />
        </label>

        <label class="form-field">
          <span class="form-label">Rate per kWh</span>
          <input
            v-model.number="form.rate_per_kwh"
            type="number"
            step="0.0001"
            class="input"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Description</span>
          <input v-model="form.description" class="input" placeholder="Rate details" />
        </label>

        <div class="modal-actions">
          <button @click="close" class="btn btn-secondary">Cancel</button>
          <button @click="save" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "../api";
import DataTable from "../components/DataTable.vue";

const rates = ref([]);
const showModal = ref(false);

const form = ref({
  id: null,
  effective_from: "",
  effective_to: "",
  rate_per_kwh: 0,
  description: ""
});

const columns = [
  { key: "id", label: "ID" },
  { key: "rate_per_kwh", label: "Rate/kWh" },
  { key: "effective_to", label: "Affected Until" },
  { key: "description", label: "Description" }
];

const formatDateOnly = (value) => {
  if (!value) return "No end date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
};

const load = async () => {
  const { data } = await api.get("/billing/rates");
  rates.value = data;
};

const openEdit = (row) => {
  form.value = {
    id: row.id,
    effective_from: row.effective_from ? row.effective_from.slice(0, 10) : "",
    effective_to: row.effective_to ? row.effective_to.slice(0, 10) : "",
    rate_per_kwh: row.rate_per_kwh,
    description: row.description || ""
  };
  showModal.value = true;
};

const save = async () => {
  if (!form.value.effective_from || !form.value.rate_per_kwh) {
    alert("Effective from and rate are required.");
    return;
  }

  await api.put(`/billing/rates/${form.value.id}`, form.value);

  showModal.value = false;
  await load();
};

const remove = async (row) => {
  if (!confirm("Delete this rate?")) return;
  await api.delete(`/billing/rates/${row.id}`);
  await load();
};

const close = () => (showModal.value = false);

onMounted(load);
</script>