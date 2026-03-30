<template>
  <div class="table-wrapper card-surface">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">
            {{ col.label }}
          </th>
          <th v-if="showActions">Actions</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in rows" :key="row[idKey]" class="table-row">
          <td v-for="col in columns" :key="col.key">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :column="col">
              <span v-if="col.key === 'status'" :class="['status-chip', String(row[col.key] || '').toLowerCase().replace(/\s+/g, '-')]">
                {{ row[col.key] }}
              </span>
              <span v-else-if="col.key === 'is_active'" :class="['status-chip', row[col.key] ? 'active' : 'inactive']">
                {{ row[col.key] ? 'Active' : 'Inactive' }}
              </span>
              <span v-else>
                {{ row[col.key] }}
              </span>
            </slot>
          </td>

          <td v-if="showActions" class="actions-cell">
            <div class="action-buttons">
              <button @click="$emit('edit', row)" class="btn-edit">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20H8L18.5 9.5L14.5 5.5L4 16V20Z" />
                  <path d="M13.5 6.5L17.5 10.5" />
                </svg>
                Edit
              </button>
              <button @click="$emit('delete', row)" class="btn-delete">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7H20" />
                  <path d="M9 7V5H15V7" />
                  <path d="M7 7L8 20H16L17 7" />
                  <path d="M10 11V17" />
                  <path d="M14 11V17" />
                </svg>
                Delete
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  columns: Array,
  rows: Array,
  idKey: { type: String, default: "id" },
  showActions: { type: Boolean, default: true }
});
</script>

<style scoped>
.table-wrapper {
  overflow-x: auto;
  margin-top: 12px;
  border-radius: 16px;
  max-height: calc(100vh - 230px);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f3f8fe;
  color: #334e71;
  position: sticky;
  top: 0;
  z-index: 2;
}

.data-table th {
  padding: 13px 14px;
  text-align: left;
  font-weight: 650;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
  border-bottom: 1px solid #dce5ef;
}

.data-table tbody {
  background: #ffffff;
}

.table-row {
  border-bottom: 1px solid #ecf2f8;
  transition: background 0.15s ease, transform 0.12s ease;
}

.table-row:hover {
  background: #f8fbff;
  transform: translateX(1px);
}

.table-row:nth-child(even) {
  background: #fcfdff;
}

.table-row:last-child {
  border-bottom: none;
}

.data-table td {
  padding: 12px 14px;
  font-size: 14px;
  color: #10233e;
  vertical-align: middle;
}

.actions-cell {
  padding: 10px 14px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-edit,
.btn-delete {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #dce5ef;
  border-radius: 10px;
  cursor: pointer;
  background: #ffffff;
  color: #10233e;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.btn-edit:hover {
  background: #eef6ff;
  border-color: #ccddf0;
}

.btn-delete {
  color: #b91c1c;
}

.btn-delete:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.btn-icon {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .data-table th,
  .data-table td {
    padding: 10px 12px;
    font-size: 13px;
  }

  .action-buttons {
    flex-direction: column;
    align-items: flex-end;
  }
}
</style>