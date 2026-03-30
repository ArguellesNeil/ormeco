<template>
  <div class="page-shell benefits-shell">
    <div class="page-header">
      <div>
        <h2 class="page-title">Benefits</h2>
        <p class="page-subtitle">Create and manage benefit offerings for members.</p>
      </div>

      <div class="page-actions benefits-actions">
        <router-link to="/benefit-approvals" class="btn btn-secondary nav-btn">
          Review Applications
        </router-link>
        <button @click="openCreate" class="btn btn-primary">+ New Benefit</button>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="benefits"
      idKey="id"
      @edit="openEdit"
      @delete="remove"
    />

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-panel glass-soft benefits-modal-panel">
        <h3 class="modal-title">
          {{ form.id ? 'Edit Benefit' : 'New Benefit' }}
        </h3>

        <label class="form-field">
          <span class="form-label">Name</span>
          <input
            v-model="form.name"
            class="input"
            placeholder="Enter benefit name"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Description</span>
          <textarea
            v-model="form.description"
            rows="3"
            class="textarea"
            placeholder="Enter benefit description"
          ></textarea>
        </label>

        <label class="checkbox-group card-surface">
          <input type="checkbox" v-model="form.is_active" class="checkbox" />
          <span class="checkbox-label">Active</span>
        </label>

        <div class="modal-actions">
          <button @click="close" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="save" class="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "../api";
import DataTable from "../components/DataTable.vue";

const benefits = ref([]);
const showModal = ref(false);

const form = ref({
  id: null,
  name: "",
  description: "",
  is_active: true
});

const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "is_active", label: "Active" }
];

const load = async () => {
  const { data } = await api.get("/benefits");
  benefits.value = data;
};

const openCreate = () => {
  form.value = { id: null, name: "", description: "", is_active: true };
  showModal.value = true;
};

const openEdit = (row) => {
  form.value = {
    id: row.id,
    name: row.name,
    description: row.description,
    is_active: !!row.is_active
  };
  showModal.value = true;
};

const save = async () => {
  if (!form.value.name) {
    alert("Name is required.");
    return;
  }
  if (form.value.id) {
    await api.put(`/benefits/${form.value.id}`, form.value);
  } else {
    await api.post("/benefits", form.value);
  }
  showModal.value = false;
  await load();
};

const remove = async (row) => {
  if (!confirm("Delete this benefit?")) return;
  await api.delete(`/benefits/${row.id}`);
  await load();
};

const close = () => (showModal.value = false);

onMounted(load);
</script>

<style scoped>
.benefits-actions {
  gap: 8px;
}

.nav-btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.benefits-shell :deep(.table-wrapper) {
  box-shadow: 0 14px 30px rgba(16, 35, 62, 0.08);
}

.benefits-modal-panel {
  width: min(520px, 92vw);
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #166534;
}

.checkbox-label {
  font-size: 14px;
  color: var(--text);
  font-weight: 650;
  user-select: none;
}

.modal-actions {
  justify-content: stretch;
}

.modal-actions .btn {
  flex: 1;
}
</style>