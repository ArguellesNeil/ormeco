<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2 class="page-title">Announcements</h2>
        <p class="page-subtitle">Publish updates and advisories for users in the mobile app.</p>
      </div>

      <div class="page-header-right">
        <div class="page-actions">
          <button class="btn btn-primary" @click="openCreate">+ New Announcement</button>
          <div class="page-search">
            <SearchBar v-model="search" placeholder="Search announcements..." />
          </div>
        </div>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredAnnouncements"
      idKey="id"
      @edit="openEdit"
      @delete="removeAnnouncement"
    >
      <template #cell-attachments_count="{ row }">
        <button class="btn btn-secondary btn-xs" :disabled="!row.attachments_count" @click="openAttachments(row)">
          {{ row.attachments_count ? `View (${row.attachments_count})` : "None" }}
        </button>
      </template>

      <template #cell-created_at="{ row }">
        <span class="date-cell">{{ formatDateTime(row.created_at) }}</span>
      </template>
    </DataTable>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-panel glass-soft">
        <h3 class="modal-title">{{ form.id ? "Edit Announcement" : "New Announcement" }}</h3>

        <label class="form-field">
          <span class="form-label">Title</span>
          <input v-model="form.title" class="input" placeholder="Service interruption notice" />
        </label>

        <label class="form-field">
          <span class="form-label">Body</span>
          <textarea
            v-model="form.body"
            rows="5"
            class="textarea"
            placeholder="Write the announcement details here..."
          ></textarea>
        </label>

        <label class="form-field">
          <span class="form-label">Target Audience</span>
          <select v-model="form.target_role" class="select">
            <option value="">All Users</option>
            <option value="member">Members</option>
            <option value="admin">Admins</option>
          </select>
        </label>

        <label class="form-field">
          <span class="form-label">Attach Photos</span>
          <input type="file" class="input" accept="image/*" multiple @change="onPhotosChange" />
          <small class="attachments-help">You can upload up to 10 images, max 10MB each.</small>
        </label>

        <div v-if="form.attachments.length || selectedPhotos.length" class="attachments-preview">
          <p class="attachments-title">Attached Photos</p>
          <div class="attachments-grid">
            <a
              v-for="(item, idx) in form.attachments"
              :key="`existing-photo-${form.id || 'new'}-${idx}`"
              class="attachment-thumb"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              title="Open photo"
            >
              <img :src="item.url" :alt="`Photo ${idx + 1}`" loading="lazy" />
            </a>
            <div
              v-for="(file, idx) in selectedPhotos"
              :key="`new-photo-${idx}`"
              class="attachment-pill"
            >
              {{ file.name }}
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="close">Cancel</button>
          <button class="btn btn-primary" @click="save">Save Announcement</button>
        </div>
      </div>
    </div>

    <div v-if="showAttachmentsModal" class="modal-overlay" @click.self="closeAttachments">
      <div class="modal-panel glass-soft attachments-modal">
        <h3 class="modal-title">Announcement Photos</h3>
        <p class="attachments-title">{{ attachmentContext.title }}</p>

        <div v-if="attachmentContext.items.length" class="attachments-grid">
          <a
            v-for="(item, idx) in attachmentContext.items"
            :key="`published-photo-${attachmentContext.id}-${idx}`"
            class="attachment-thumb"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            title="Open photo"
          >
            <img :src="item.url" :alt="`Photo ${idx + 1}`" loading="lazy" />
          </a>
        </div>
        <p v-else class="attachments-help">No photos attached to this announcement.</p>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeAttachments">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import api from "../api";
import DataTable from "../components/DataTable.vue";
import SearchBar from "../components/SearchBar.vue";

const announcements = ref([]);
const search = ref("");

const filteredAnnouncements = computed(() => {
  const q = String(search.value || "").trim().toLowerCase();
  if (!q) return announcements.value;
  return announcements.value.filter((r) =>
    Object.values(r || {}).some((v) => String(v || "").toLowerCase().includes(q))
  );
});
const showModal = ref(false);
const selectedPhotos = ref([]);
const showAttachmentsModal = ref(false);
const attachmentContext = ref({ id: null, title: "", items: [] });

const backendOrigin = (() => {
  try {
    return new URL(String(api.defaults.baseURL || "http://localhost:4000/api")).origin;
  } catch (_err) {
    return "http://localhost:4000";
  }
})();

const toAbsoluteUrl = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/")) return `${backendOrigin}${raw}`;
  return `${backendOrigin}/${raw}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  } catch (_err) {
    return String(value);
  }
};

const form = ref({
  id: null,
  title: "",
  body: "",
  target_role: "",
  attachments: []
});

const columns = [
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "attachments_count", label: "Photos" },
  { key: "target_role_name", label: "Target" },
  { key: "created_at", label: "Created" }
];

const load = async () => {
  const { data } = await api.get("/announcements");
  announcements.value = (data || []).map((row) => ({
    ...row,
    target_role_name: row.target_role_name || "all",
    attachments: Array.isArray(row.attachments)
      ? row.attachments.map((item) => ({ ...item, url: toAbsoluteUrl(item.url) }))
      : [],
    attachments_count: Number(row.attachments_count || 0)
  }));
};

const openCreate = () => {
  form.value = {
    id: null,
    title: "",
    body: "",
    target_role: "",
    attachments: []
  };
  selectedPhotos.value = [];
  showModal.value = true;
};

const openEdit = (row) => {
  form.value = {
    id: row.id,
    title: row.title || "",
    body: row.body || "",
    target_role: row.target_role_name === "all" ? "" : (row.target_role_name || ""),
    attachments: Array.isArray(row.attachments) ? row.attachments : []
  };
  selectedPhotos.value = [];
  showModal.value = true;
};

const onPhotosChange = (event) => {
  const files = Array.from((event && event.target && event.target.files) || []);
  selectedPhotos.value = files;
};

const save = async () => {
  if (!form.value.title || !form.value.body) {
    alert("Title and body are required.");
    return;
  }

  const payload = new FormData();
  payload.append("title", form.value.title);
  payload.append("body", form.value.body);
  payload.append("target_role", form.value.target_role || "");
  for (const file of selectedPhotos.value) {
    payload.append("photos", file);
  }

  try {
    if (form.value.id) {
      await api.put(`/announcements/${form.value.id}`, payload);
    } else {
      await api.post("/announcements", payload);
    }

    showModal.value = false;
    selectedPhotos.value = [];
    await load();
  } catch (err) {
    alert(err?.response?.data?.message || err?.message || "Failed to save announcement");
  }
};

const openAttachments = (row) => {
  attachmentContext.value = {
    id: row.id,
    title: row.title || "Announcement",
    items: Array.isArray(row.attachments) ? row.attachments : []
  };
  showAttachmentsModal.value = true;
};

const closeAttachments = () => {
  showAttachmentsModal.value = false;
};

const removeAnnouncement = async (row) => {
  if (!confirm("Delete this announcement?")) return;
  await api.delete(`/announcements/${row.id}`);
  await load();
};

const close = () => {
  showModal.value = false;
  selectedPhotos.value = [];
};

onMounted(load);
</script>

<style scoped>
.page-shell :deep(.table-wrapper) {
  box-shadow: 0 14px 30px rgba(16, 35, 62, 0.08);
}

.btn-xs {
  padding: 6px 10px;
  font-size: 12px;
}

.attachments-help {
  display: block;
  margin-top: 6px;
  color: #6c829f;
  font-size: 12px;
}

.attachments-title {
  margin: 0 0 8px;
  font-weight: 700;
  color: #314964;
}

.attachments-preview {
  margin-top: 8px;
}

.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.attachment-thumb {
  border: 1px solid #d6e2f0;
  border-radius: 10px;
  overflow: hidden;
  background: #f8fbff;
  display: block;
  min-height: 80px;

.page-header-right { display: flex; align-items: center; gap: 12px; }
.page-actions { display: flex; align-items: center; gap: 10px; }
.page-search { margin-left: 8px; }
}

.attachment-thumb img {
  width: 100%;
  height: 100%;
  min-height: 80px;
  object-fit: cover;
  display: block;
}

.attachment-pill {
  border: 1px dashed #c8d7e8;
  border-radius: 10px;
  padding: 8px;
  font-size: 11px;
  color: #4f6987;
  background: #f7fbff;
  word-break: break-word;
}

.attachments-modal {
  width: min(760px, 94vw);
}
</style>
