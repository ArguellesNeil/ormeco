<template>
  <div class="page-shell approvals-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">Benefit Approvals</h2>
        <p class="page-subtitle">Review submitted applications and approve or reject each request.</p>
      </div>

      <div class="page-header-right">
        <div class="page-search">
          <SearchBar v-model="search" placeholder="Search applications..." />
        </div>

        <div class="filter-wrap center-filter">
          <label class="filter-label" for="approval-status-filter">Status</label>
          <select id="approval-status-filter" v-model="statusFilter" class="select" @change="loadApplications">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div class="page-refresh">
          <button type="button" class="btn btn-secondary" @click="loadApplications" :disabled="loading">
            Refresh
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card-surface state-card">Loading benefit applications...</div>
    <div v-else-if="error" class="card-surface state-card error">{{ error }}</div>

    <section v-else class="card-surface table-card">
      <div v-if="!filteredApplications.length" class="empty-state">
        No benefit applications found for the selected filter.
      </div>

      <div v-else class="table-wrap">
        <table class="approvals-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Applicant</th>
              <th>Benefit</th>
              <th>Status</th>
              <th>Applied At</th>
              <th>Reviewed At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredApplications" :key="row.id">
              <td>#{{ row.id }}</td>
              <td>{{ row.applicant_name || '-' }}</td>
              <td>{{ row.benefit_name || '-' }}</td>
              <td>
                <span class="status-chip" :class="statusClass(row.status)">{{ row.status }}</span>
              </td>
              <td>{{ formatDateTime(row.applied_at) }}</td>
              <td>{{ formatDateTime(row.reviewed_at) }}</td>
              <td>
                <button type="button" class="btn btn-primary btn-sm" @click="openReview(row)">
                  Review
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-panel glass-soft review-modal">
        <h3 class="modal-title">Review Benefit Application</h3>

        <div class="modal-body-scroll">
          <div class="summary-grid card-surface">
            <p><strong>Application ID:</strong> #{{ selected.id }}</p>
            <p><strong>Applicant:</strong> {{ selected.applicant_name || '-' }}</p>
            <p><strong>Benefit:</strong> {{ selected.benefit_name || '-' }}</p>
            <p><strong>Status:</strong> {{ selected.status || '-' }}</p>
            <p><strong>Applied:</strong> {{ formatDateTime(selected.applied_at) }}</p>
            <p><strong>Reviewed By:</strong> {{ selected.reviewed_by_name || '-' }}</p>
          </div>

          <label class="form-field">
            <span class="form-label">Status</span>
            <select v-model="reviewForm.status" class="select">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label class="form-field">
            <span class="form-label">Remarks</span>
            <textarea
              v-model="reviewForm.remarks"
              class="textarea"
              rows="4"
              placeholder="Add your review notes..."
            ></textarea>
          </label>

          <section class="docs-section card-surface">
            <div class="docs-head">
              <h4>Submitted Documents</h4>
              <span>{{ documents.length }} file(s)</span>
            </div>

            <div v-if="docsLoading" class="docs-state">Loading documents...</div>
            <div v-else-if="docsError" class="docs-state docs-error">{{ docsError }}</div>

            <ul v-else-if="documents.length" class="docs-list">
              <li v-for="doc in documents" :key="doc.fileName" class="doc-item">
                <div class="doc-main">
                  <strong class="doc-name">{{ doc.originalName || doc.fileName }}</strong>
                  <span class="doc-meta">{{ formatDateTime(doc.uploadedAt) }} • {{ formatFileSize(doc.sizeBytes) }}</span>
                </div>
                <div class="doc-actions">
                  <button type="button" class="btn btn-secondary btn-xs" @click="viewDocument(doc)" :disabled="docBusy">
                    View
                  </button>
                  <button type="button" class="btn btn-secondary btn-xs" @click="downloadDocument(doc)" :disabled="docBusy">
                    Download
                  </button>
                </div>
              </li>
            </ul>

            <div v-else class="docs-state">No uploaded documents found for this applicant.</div>
          </section>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="submitReview" :disabled="saving">
            {{ saving ? "Saving..." : "Save Review" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from "vue";
import api from "../api";
import { useAuthStore } from "../store/auth";
import SearchBar from "../components/SearchBar.vue";

const auth = useAuthStore();
const applications = ref([]);
const search = ref("");

const filteredApplications = computed(() => {
  const q = String(search.value || "").trim().toLowerCase();
  if (!q) return applications.value;
  return applications.value.filter((r) =>
    [r.id, r.applicant_name, r.benefit_name, r.email]
      .map((v) => String(v || "").toLowerCase())
      .some((s) => s.includes(q))
  );
});
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const statusFilter = ref("all");

const showModal = ref(false);
const selected = ref({});
const documents = ref([]);
const docsLoading = ref(false);
const docsError = ref("");
const docBusy = ref(false);
const reviewForm = ref({
  status: "pending",
  remarks: "",
});

const statusClass = (status) => String(status || "").toLowerCase().replace(/\s+/g, "-");

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const loadApplications = async () => {
  loading.value = true;
  error.value = "";
  try {
    const query = statusFilter.value === "all" ? "" : `?status=${encodeURIComponent(statusFilter.value)}`;
    const { data } = await api.get(`/benefits/applications${query}`);
    applications.value = Array.isArray(data) ? data : [];
  } catch (err) {
    error.value = (err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to load applications";
  } finally {
    loading.value = false;
  }
};

const loadDocuments = async (applicationId) => {
  docsLoading.value = true;
  docsError.value = "";
  documents.value = [];
  try {
    const { data } = await api.get(`/benefits/applications/${applicationId}/documents`);
    documents.value = Array.isArray(data && data.documents) ? data.documents : [];
  } catch (err) {
    docsError.value = (err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to load documents";
  } finally {
    docsLoading.value = false;
  }
};

const fetchDocumentBlob = async (doc) => {
  const encoded = encodeURIComponent(doc.fileName);
  const res = await api.get(`/benefits/documents/${encoded}`, {
    responseType: "blob",
  });
  return res.data;
};

const viewDocument = async (doc) => {
  docBusy.value = true;
  try {
    const blob = await fetchDocumentBlob(doc);
    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 12000);
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Unable to open document");
  } finally {
    docBusy.value = false;
  }
};

const downloadDocument = async (doc) => {
  docBusy.value = true;
  try {
    const blob = await fetchDocumentBlob(doc);
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = doc.originalName || doc.fileName || "document";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 12000);
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Unable to download document");
  } finally {
    docBusy.value = false;
  }
};

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = size;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const openReview = (row) => {
  selected.value = { ...row };
  reviewForm.value = {
    status: row.status || "pending",
    remarks: row.remarks || "",
  };
  showModal.value = true;
  loadDocuments(row.id);
};

const closeModal = () => {
  showModal.value = false;
  documents.value = [];
  docsError.value = "";
};

const submitReview = async () => {
  saving.value = true;
  try {
    await api.put(`/benefits/applications/${selected.value.id}`, {
      status: reviewForm.value.status,
      remarks: reviewForm.value.remarks,
      reviewed_by: auth.user && auth.user.id ? auth.user.id : null,
    });
    showModal.value = false;
    await loadApplications();
  } catch (err) {
    alert((err && err.response && err.response.data && err.response.data.message) || err.message || "Failed to update application");
  } finally {
    saving.value = false;
  }
};

onMounted(loadApplications);
</script>

<style scoped>
.approvals-page {
  display: grid;
  gap: 12px;
}

.page-header-right {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
}

.page-search {
  flex: 0 0 330px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.center-filter {
  flex: 1 1 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
}

.filter-wrap label {
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  flex: 0 0 auto;
}

.filter-wrap select {
  flex: 1;
  min-width: 160px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #d7e0ee;
  background: #fff;
  font-size: 13px;
}

.page-refresh {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

@media (max-width: 920px) {
  .page-header-right { flex-direction:column; align-items:stretch; gap:10px; }
  .page-search, .center-filter, .page-refresh { flex: none; }
}

.filter-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #577090;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
}

.approvals-table {
  width: 100%;
  border-collapse: collapse;
}

.approvals-table thead {
  background: #f3f8fe;
}

.approvals-table th,
.approvals-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #ebf1f7;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
  white-space: nowrap;
}

.approvals-table th {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #385676;
}

.btn-sm {
  padding: 7px 11px;
  font-size: 12px;
  border-radius: 10px;
}

.state-card {
  padding: 16px;
  font-weight: 700;
}

.state-card.error {
  color: #b73838;
  border-color: #f2c2c2;
  background: #fff2f2;
}

.empty-state {
  padding: 28px;
  text-align: center;
  color: #5f738f;
  font-weight: 700;
}

.review-modal {
  width: min(620px, 94vw);
  max-height: min(86vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-body-scroll {
  overflow-y: auto;
  padding-right: 2px;
  margin-top: 2px;
}

.summary-grid {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
}

.modal-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid #dce5ef;
  background: rgba(255, 255, 255, 0.96);
}

.modal-body-scroll::-webkit-scrollbar {
  width: 8px;
}

.modal-body-scroll::-webkit-scrollbar-thumb {
  background: #c8d7e7;
  border-radius: 999px;
}

.modal-body-scroll::-webkit-scrollbar-track {
  background: #eef4fb;
  border-radius: 999px;
}

.summary-grid p {
  margin: 0;
  font-size: 13px;
  color: #425b78;
}

.docs-section {
  margin-top: 8px;
  border-radius: 12px;
  padding: 12px;
}

.docs-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.docs-head h4 {
  margin: 0;
  font-size: 14px;
  color: #284664;
}

.docs-head span {
  font-size: 12px;
  color: #56708d;
  font-weight: 700;
}

.docs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.doc-item {
  border: 1px solid #e1eaf4;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: #fbfdff;
}

.doc-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.doc-name {
  font-size: 13px;
  color: #1f3d5d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 290px;
}

.doc-meta {
  font-size: 12px;
  color: #6c84a0;
}

.doc-actions {
  display: flex;
  gap: 6px;
}

.btn-xs {
  padding: 6px 9px;
  font-size: 12px;
  border-radius: 8px;
}

.docs-state {
  padding: 8px 2px;
  font-size: 13px;
  color: #56708d;
}

.docs-error {
  color: #b13a3a;
}

@media (max-width: 920px) {
  .approvals-table th,
  .approvals-table td {
    padding: 10px 12px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .doc-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .doc-name {
    max-width: 100%;
  }
}
</style>
