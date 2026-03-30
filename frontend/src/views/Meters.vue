<template>
  <div class="page-shell meters-shell">
    <div class="page-header">
      <div>
        <h2 class="page-title">Meters</h2>
        <p class="page-subtitle">Operational overview and management</p>
      </div>

      <div class="page-actions meters-actions">
        <button type="button" @click="downloadXlsx" class="btn btn-secondary meter-toolbar-btn">
          Export XLSX
        </button>

        <button type="button" @click="triggerImport" class="btn btn-secondary file-btn meter-toolbar-btn">
          Import XLSX
        </button>

        <input
          ref="importInput"
          type="file"
          accept=".xlsx"
          class="file-input"
          @change="onImportFile"
        />

        <button type="button" @click="openCreate" class="btn btn-primary">+ New Meter</button>
      </div>
    </div>
    <DataTable
      :columns="columns"
      :rows="meters"
      idKey="id"
      @edit="openEdit"
      @delete="remove"
    />

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-panel glass-soft meter-modal-panel">
        <h3 class="modal-title">
          {{ form.id ? 'Edit Meter' : 'New Meter' }}
        </h3>

        <label class="form-field">
          <span class="form-label">Meter Number</span>
          <input
            v-model="form.meter_number"
            class="input"
            placeholder="MTR-001"
          />
        </label>

        <label class="form-field">
          <span class="form-label">User ID / Member Code</span>
          <input
            v-model="form.user_id"
            type="text"
            list="user-reference-list"
            class="input"
            placeholder="e.g. 1 or 120392"
          />
          <datalist id="user-reference-list">
            <option
              v-for="u in users"
              :key="u.id"
              :value="String(u.id)"
            >
              {{ `${u.full_name} (${u.email || 'no-email'})` }}
            </option>
          </datalist>
          <small class="field-help">
            Tip: Use an existing User ID from suggestions, or enter a Member Code.
          </small>
        </label>

        <label class="form-field">
          <span class="form-label">Installation Address</span>
          <textarea
            rows="2"
            v-model="form.installation_address"
            class="textarea"
            placeholder="123 Main Street, City"
          ></textarea>
        </label>

        <label class="form-field">
          <span class="form-label">Installed At</span>
          <input
            v-model="form.installed_at"
            type="date"
            class="input"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Status</span>
          <select v-model="form.status" class="select">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="disconnected">Disconnected</option>
          </select>
        </label>

        <div class="modal-actions">
          <button type="button" @click="close" class="btn btn-secondary">
            Cancel
          </button>
          <button type="button" @click="save" class="btn btn-primary">
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

const meters = ref([]);
const users = ref([]);
const showModal = ref(false);
const importInput = ref(null);

const form = ref({
  id: null,
  meter_number: "",
  user_id: "",
  installation_address: "",
  installed_at: "",
  status: "active"
});

const columns = [
  { key: "id", label: "ID" },
  { key: "meter_number", label: "Meter No." },
  { key: "user_id", label: "User ID" },
  { key: "installation_address", label: "Address" },
  { key: "installed_at", label: "Installed At" },
  { key: "status", label: "Status" }
];

const load = async () => {
  try {
    const { data } = await api.get("/meters");
    meters.value = data;
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to load meters";
    alert(msg);
  }
};

const loadUsers = async () => {
  try {
    const { data } = await api.get("/users");
    users.value = Array.isArray(data) ? data : [];
  } catch (err) {
    users.value = [];
  }
};

const triggerImport = () => {
  importInput.value?.click();
};

const downloadXlsx = async () => {
  const res = await api.get("/meters/export", { responseType: "blob" });
  const blob = new Blob([res.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meters.xlsx";
  a.click();
  window.URL.revokeObjectURL(url);
};

const onImportFile = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  const fd = new FormData();
  fd.append("file", file);

  try {
    const { data } = await api.post("/meters/import", fd, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    const inserted = Number(data.inserted ?? data.inserted_or_upserted ?? 0);
    const updated = Number(data.updated ?? 0);
    alert(`Import OK. Inserted/Upserted: ${inserted}, Updated: ${updated}`);
    await load();
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Import failed";
    alert(msg);
  }
};


const openCreate = () => {
  form.value = {
    id: null,
    meter_number: "",
    user_id: "",
    installation_address: "",
    installed_at: "",
    status: "active"
  };
  showModal.value = true;
};

const openEdit = (row) => {
  form.value = {
    id: row.id,
    meter_number: row.meter_number,
    user_id: row.user_id,
    installation_address: row.installation_address,
    installed_at: row.installed_at ? row.installed_at.slice(0, 10) : "",
    status: row.status
  };
  showModal.value = true;
};

const save = async () => {
  if (!form.value.meter_number || !form.value.user_id) {
    alert("Meter number and User ID are required.");
    return;
  }

  const payload = {
    meter_number: String(form.value.meter_number || "").trim(),
    user_id: String(form.value.user_id || "").trim(),
    installation_address: String(form.value.installation_address || "").trim(),
    installed_at: form.value.installed_at || null,
    status: String(form.value.status || "active").toLowerCase()
  };

  if (!payload.user_id) {
    alert("User ID or Member Code is required.");
    return;
  }

  try {
    if (form.value.id) {
      await api.put(`/meters/${form.value.id}`, payload);
    } else {
      await api.post("/meters", payload);
    }
    showModal.value = false;
    await load();
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to save meter";
    alert(msg);
  }
};

const remove = async (row) => {
  if (!confirm("Delete this meter?")) return;
  await api.delete(`/meters/${row.id}`);
  await load();
};

const close = () => (showModal.value = false);

onMounted(async () => {
  await Promise.all([load(), loadUsers()]);
});
</script>

<style scoped>
.meters-shell :deep(.table-wrapper) {
  box-shadow: 0 14px 30px rgba(16, 35, 62, 0.08);
}

.meters-actions {
  gap: 10px;
}

.meter-toolbar-btn {
  font-weight: 650;
}

.file-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.file-input {
  display: none;
}

.meter-modal-panel {
  width: min(560px, 94vw);
}

.field-help {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #5f738f;
}

.textarea {
  resize: vertical;
  min-height: 60px;
}

.modal-actions {
  justify-content: stretch;
}

.modal-actions .btn {
  flex: 1;
}
</style>