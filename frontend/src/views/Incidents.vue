<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2 class="page-title">Incidents</h2>
        <p class="page-subtitle">Track reports and update resolution status quickly.</p>
      </div>

      <div class="page-header-right">
        <div class="page-search">
          <SearchBar v-model="search" placeholder="Search incidents..." />
        </div>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredIncidents"
      idKey="id"
      :showActions="true"
      @edit="openEditStatus"
      @delete="removeIncident"
    >
      <template #cell-evidence_count="{ row }">
        <button
          class="evidence-trigger"
          :disabled="!row.evidence_count"
          @click="openEvidence(row)"
        >
          {{ row.evidence_count ? `View (${row.evidence_count})` : "None" }}
        </button>
      </template>
    </DataTable>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-panel">
        <h3 class="modal-title">Update Incident Status</h3>

        <div class="info-grid card-surface">
          <p><strong>ID:</strong> #{{ form.id }}</p>
          <p><strong>Reporter:</strong> {{ form.user_name }}</p>
          <p><strong>Category:</strong> {{ form.category }}</p>
          <p class="description"><strong>Description:</strong> {{ form.description }}</p>

          <div class="evidence-panel">
            <p><strong>Evidence:</strong></p>
            <div v-if="form.evidence_items.length" class="evidence-grid">
              <button
                v-for="(item, idx) in form.evidence_items"
                :key="`modal-evidence-${form.id}-${idx}`"
                type="button"
                class="evidence-item evidence-button"
                :disabled="evidenceBusy"
                @click="viewEvidenceFile(item)"
              >
                <img v-if="isImageUrl(item.url)" :src="item.url" :alt="`Evidence ${idx + 1}`" loading="lazy" />
                <span v-else class="evidence-file">Open file {{ idx + 1 }}</span>
              </button>
            </div>
            <p v-else class="evidence-empty">No evidence attached for this report.</p>
          </div>
        </div>

        <label class="form-field">
          <span class="form-label">Status</span>
          <select v-model="form.status" class="select">
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
        </label>

        <label class="form-field">
          <span class="form-label">Handled By (User ID)</span>
          <input v-model.number="form.handled_by" type="number" class="input" />
        </label>

        <label class="form-field">
          <span class="form-label">Resolved At</span>
          <input v-model="form.resolved_at" type="date" class="input" />
        </label>

        <div class="modal-actions">
          <button @click="close" class="btn btn-secondary">Cancel</button>
          <button @click="saveStatus" class="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>

    <div v-if="showEvidenceModal" class="modal-overlay" @click.self="closeEvidence">
      <div class="modal-panel evidence-modal">
        <h3 class="modal-title">Incident Evidence #{{ evidenceContext.id }}</h3>
        <p class="modal-subtitle">Reporter: {{ evidenceContext.user_name || "N/A" }}</p>

        <div v-if="evidenceContext.items.length" class="evidence-grid">
          <button
            v-for="(item, idx) in evidenceContext.items"
            :key="`table-evidence-${evidenceContext.id}-${idx}`"
            type="button"
            class="evidence-item evidence-button"
            :disabled="evidenceBusy"
            @click="viewEvidenceFile(item)"
          >
            <img v-if="isImageUrl(item.url)" :src="item.url" :alt="`Evidence ${idx + 1}`" loading="lazy" />
            <span v-else class="evidence-file">Open file {{ idx + 1 }}</span>
          </button>
        </div>
        <p v-else class="evidence-empty">No evidence attached for this report.</p>

        <div class="modal-actions">
          <button @click="closeEvidence" class="btn btn-secondary">Close</button>
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

const incidents = ref([]);
const search = ref("");

const filteredIncidents = computed(() => {
  const q = String(search.value || "").trim().toLowerCase();
  if (!q) return incidents.value;
  return incidents.value.filter((r) =>
    Object.values(r || {}).some((v) => String(v || "").toLowerCase().includes(q))
  );
});
const showModal = ref(false);
const showEvidenceModal = ref(false);
const evidenceBusy = ref(false);

const evidenceContext = ref({
  id: null,
  user_name: "",
  items: []
});

const EVIDENCE_KEYS = [
  "evidence_files",
  "evidence_url",
  "evidence_urls",
  "photo_url",
  "photo_urls",
  "image_url",
  "image_urls",
  "attachment_url",
  "attachment_urls",
  "evidence",
  "photo",
  "photos",
  "image",
  "images",
  "attachments",
  "files"
];

const form = ref({
  id: null,
  user_name: "",
  meter_number: "",
  category: "",
  description: "",
  status: "open",
  handled_by: null,
  resolved_at: "",
  evidence_items: []
});

const columns = [
  { key: "id", label: "ID" },
  { key: "user_name", label: "Reporter" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "status", label: "Status" },
  { key: "evidence_count", label: "Evidence" },
  { key: "reported_at", label: "Reported At" },
  { key: "handled_by", label: "Handled By" },
  { key: "resolved_at", label: "Resolved At" }
];

const isImageUrl = (url) => {
  const value = String(url || "").toLowerCase();
  return (
    value.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/.test(value)
  );
};

const toAbsoluteEvidenceUrl = (rawValue) => {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  try {
    const apiBase = new URL(String(api.defaults.baseURL || "http://localhost:4000/api"));
    const origin = apiBase.origin;

    if (value.startsWith("/")) return `${origin}${value}`;
    if (value.startsWith("uploads/")) return `${origin}/${value}`;
    if (value.startsWith("api/")) return `${origin}/${value}`;
    return `${origin}/${value}`;
  } catch (err) {
    return value;
  }
};

const normalizeEvidenceList = (source) => {
  if (source == null) return [];

  if (Array.isArray(source)) {
    return source.flatMap((item) => normalizeEvidenceList(item));
  }

  if (typeof source === "object") {
    if (source.url || source.path || source.file || source.name) {
      return [source.url || source.path || source.file || source.name];
    }
    return Object.values(source).flatMap((item) => normalizeEvidenceList(item));
  }

  const text = String(source).trim();
  if (!text) return [];

  if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
    try {
      return normalizeEvidenceList(JSON.parse(text));
    } catch (err) {
      return [text];
    }
  }

  if (text.includes("\n") || text.includes(";") || text.includes("|")) {
    return text
      .split(/\n|;|\|/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [text];
};

const extractEvidenceItems = (row) => {
  if (!row || typeof row !== "object") return [];

  const rawItems = EVIDENCE_KEYS.flatMap((key) => normalizeEvidenceList(row[key]));
  const deduped = Array.from(new Set(rawItems.map((item) => toAbsoluteEvidenceUrl(item)).filter(Boolean)));

  return deduped.map((url) => ({ url }));
};

const load = async () => {
  const { data } = await api.get("/incidents");
  incidents.value = (Array.isArray(data) ? data : []).map((row) => {
    const evidenceItems = extractEvidenceItems(row);
    return {
      ...row,
      evidence_items: evidenceItems,
      evidence_count: evidenceItems.length
    };
  });
};

const openEditStatus = (row) => {
  form.value = {
    id: row.id,
    user_name: row.user_name,
    meter_number: row.meter_number,
    category: row.category,
    description: row.description,
    status: row.status,
    handled_by: row.handled_by,
    resolved_at: row.resolved_at ? row.resolved_at.slice(0, 10) : "",
    evidence_items: row.evidence_items || []
  };
  showModal.value = true;
};

const openEvidence = (row) => {
  evidenceContext.value = {
    id: row.id,
    user_name: row.user_name,
    items: row.evidence_items || []
  };
  showEvidenceModal.value = true;
};

const closeEvidence = () => {
  showEvidenceModal.value = false;
};

const saveStatus = async () => {
  await api.put(`/incidents/${form.value.id}/status`, {
    status: form.value.status,
    handled_by: form.value.handled_by || null,
    resolved_at: form.value.resolved_at || null
  });
  showModal.value = false;
  await load();
};

const fetchEvidenceBlob = async (item) => {
  const res = await api.get(item.url, {
    responseType: "blob"
  });
  return res.data;
};

const viewEvidenceFile = async (item) => {
  if (!item || !item.url) return;

  evidenceBusy.value = true;
  try {
    const blob = await fetchEvidenceBlob(item);
    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 12000);
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Unable to open evidence");
  } finally {
    evidenceBusy.value = false;
  }
};

const removeIncident = async (row) => {
  if (!row || !row.id) return;
  if (!confirm(`Delete incident #${row.id}?`)) return;

  await api.delete(`/incidents/${row.id}`);

  if (showModal.value && form.value.id === row.id) {
    showModal.value = false;
  }
  if (showEvidenceModal.value && evidenceContext.value.id === row.id) {
    showEvidenceModal.value = false;
  }

  await load();
};

const close = () => (showModal.value = false);

onMounted(load);
</script>

<style scoped>
.page-header-right { display: flex; align-items: center; gap: 12px; }
.page-search { margin-right: 6px; }
.info-grid {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  font-size: 13px;
  color: #425b78;
}

.info-grid p {
  margin: 0 0 8px 0;
}

.info-grid p:last-child {
  margin-bottom: 0;
}

.description {
  line-height: 1.5;
}

.evidence-trigger {
  border: 1px solid #dce5ef;
  border-radius: 10px;
  background: #ffffff;
  color: #10233e;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  cursor: pointer;
}

.evidence-trigger:hover:not(:disabled) {
  background: #eef6ff;
  border-color: #ccddf0;
}

.evidence-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.evidence-panel {
  margin-top: 10px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.evidence-item {
  display: grid;
  place-items: center;
  text-decoration: none;
  border: 1px solid #dce5ef;
  border-radius: 12px;
  background: #ffffff;
  min-height: 92px;
  overflow: hidden;
}

.evidence-button {
  width: 100%;
  padding: 0;
  cursor: pointer;
  color: inherit;
  background: #ffffff;
}

.evidence-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.evidence-item img {
  width: 100%;
  height: 96px;
  object-fit: cover;
}

.evidence-file {
  padding: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #2c4a6e;
}

.evidence-empty {
  margin: 0;
  color: #5b7391;
  font-size: 13px;
}

.evidence-modal {
  width: min(920px, 96vw);
}

.modal-subtitle {
  margin: -4px 0 12px;
  color: #5b7391;
  font-size: 13px;
}
</style>
