<script setup>
import { computed, ref } from 'vue'
import MIcon from './MIcon.vue'

// Data table for records and logs. columns: [{ key, label, align?, width?, sortable? }]; cells via slot `cell-<key>`.
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowKey: { type: String, default: 'id' },
  empty: { type: String, default: '' },
  dense: { type: Boolean, default: false },
})
const emit = defineEmits(['row'])
const sort = ref({ key: '', dir: 1 })
const sorted = computed(() => {
  const { key, dir } = sort.value
  if (!key) return props.rows
  return [...props.rows].sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0))
})
const by = (col) => { if (col.sortable) sort.value = { key: col.key, dir: sort.value.key === col.key ? -sort.value.dir : 1 } }
</script>

<template>
  <div class="m-table-wrap">
    <table class="m-table" :class="{ 'm-table--dense': dense }">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" :style="{ width: col.width, textAlign: col.align }" :aria-sort="sort.key === col.key ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined">
            <button v-if="col.sortable" type="button" class="m-table__sort" @click="by(col)">
              {{ col.label }}<MIcon v-if="sort.key === col.key" :name="sort.dir > 0 ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
            </button>
            <template v-else>{{ col.label }}</template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in sorted" :key="row[rowKey]" @click="emit('row', row)">
          <td v-for="col in columns" :key="col.key" :style="{ textAlign: col.align }">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">{{ row[col.key] }}</slot>
          </td>
        </tr>
        <tr v-if="!rows.length"><td :colspan="columns.length" class="m-table__empty">{{ empty }}</td></tr>
      </tbody>
    </table>
  </div>
</template>
