<template>
  <div class="page-shell users-shell">
    <div class="page-header">
      <div>
        <h2 class="page-title">Users</h2>
        <p class="page-subtitle">Operational overview and management</p>
      </div>

      <div class="page-actions">
        <button @click="openCreate" class="btn btn-primary">+ New User</button>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="users"
      idKey="id"
      @edit="openEdit"
      @delete="remove"
    />

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-panel glass-soft users-modal-panel">
        <h3 class="modal-title">
          {{ form.id ? 'Edit User' : 'New User' }}
        </h3>

        <label class="form-field">
          <span class="form-label">Email</span>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="user@example.com"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Full Name</span>
          <input
            v-model="form.full_name"
            class="input"
            placeholder="John Doe"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Phone</span>
          <input
            v-model="form.phone"
            class="input"
            placeholder="+1234567890"
          />
        </label>

        <label v-if="!form.id" class="form-field">
          <span class="form-label">Password</span>
          <input
            v-model="form.password"
            type="password"
            class="input"
            placeholder="••••••••"
          />
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

const users = ref([]);
const showModal = ref(false);

const form = ref({
  id: null,
  email: "",
  full_name: "",
  phone: "",
  password: "",
  is_active: true
});

const columns = [
  { key: "id", label: "ID" },
  { key: "email", label: "Email" },
  { key: "full_name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "is_active", label: "Active" }
];

const load = async () => {
  const { data } = await api.get("/users");
  users.value = data;
};

const openCreate = () => {
  form.value = {
    id: null,
    email: "",
    full_name: "",
    phone: "",
    password: "",
    is_active: true
  };
  showModal.value = true;
};

const openEdit = (row) => {
  form.value = {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    is_active: !!row.is_active
  };
  showModal.value = true;
};

const save = async () => {
  if (form.value.id) {
    await api.put(`/users/${form.value.id}`, form.value);
  } else {
    await api.post("/users", form.value);
  }
  showModal.value = false;
  await load();
};

const remove = async (row) => {
  if (!confirm("Delete this user?")) return;
  await api.delete(`/users/${row.id}`);
  await load();
};

const close = () => (showModal.value = false);

onMounted(load);
</script>

<style scoped>
.users-shell :deep(.table-wrapper) {
  box-shadow: 0 14px 30px rgba(16, 35, 62, 0.08);
}

.users-modal-panel {
  width: min(520px, 92vw);
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