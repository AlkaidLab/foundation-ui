<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MIcon from './MIcon.vue'
import MSheet from './MSheet.vue'
import MToolbar from './MToolbar.vue'
import MIconButton from './MIconButton.vue'
import MButton from './MButton.vue'
import { TILE_SIZES } from './useTiles.js'
import { packTiles } from './tilePack.js'

/**
 * The tile grid of a home page. Columns follow the width of the grid itself (container, not window).
 * `store` comes from useTiles; the page renders each tile through the `tile` slot ({ tile, def }).
 */
const edit = defineModel('edit', { type: Boolean, default: false })
const props = defineProps({
  store: { type: Object, required: true },
  label: { type: String, default: 'Home' },
  /** hide tiles that have nothing to show right now: (tile, def) => boolean (edit mode shows all) */
  visible: { type: Function, default: null },
  /** size of a tile right now (a live tile can be large, an idle one small): (tile, def) => '1x1' | '2x1' | '2x2' */
  sizeOf: { type: Function, default: null },
  texts: { type: Object, default: () => ({}) }, // { done, add, reset, remove, larger, earlier, later, addTitle, nothingToAdd, edit }
})
const T = computed(() => ({ done: 'Done', add: 'Add tile', reset: 'Reset to default', remove: 'Remove', resize: 'Change size', earlier: 'Move earlier', later: 'Move later', addTitle: 'Add a tile', nothing: 'All tiles are on the page', edit: 'Edit tiles', ...props.texts }))
const grid = ref(null)
const cols = ref(4)
let observer = null
onMounted(() => {
  const read = () => { const w = grid.value?.clientWidth || 720; cols.value = Math.max(2, Math.min(6, Math.floor((w + 12) / (164 + 12)))) }
  read()
  observer = new ResizeObserver(read)
  observer.observe(grid.value)
})
onBeforeUnmount(() => observer?.disconnect())

const adding = ref(false)
const dragId = ref('')
const sizeFor = (tile) => (props.sizeOf ? props.sizeOf(tile, props.store.byId.get(tile.id)) || tile.size : tile.size)
const shown = computed(() => props.store.tiles.value.filter((t) => edit.value || !props.visible || props.visible(t, props.store.byId.get(t.id))))
const packed = computed(() => packTiles(shown.value.map((t) => ({ id: t.id, w: TILE_SIZES[sizeFor(t)][0], h: TILE_SIZES[sizeFor(t)][1] })), cols.value))
const cell = (tile) => packed.value.cells.get(tile.id) || { span: 1, rows: 1 }
const onDrop = () => { dragId.value = '' }
defineExpose({ edit })
</script>

<template>
  <div ref="grid" class="m-tilegrid" :class="{ 'is-edit': edit }" :aria-label="label">
    <TransitionGroup tag="div" name="m-tile" class="m-tiles" :style="{ '--m-cols': cols, '--m-units': packed.units }">
      <div
        v-for="tile in shown"
        :key="tile.id"
        class="m-tiles__cell"
        :class="{ 'is-drag': dragId === tile.id }"
        :style="{ gridColumn: `span ${cell(tile).span}`, gridRow: `span ${cell(tile).rows}` }"
        :draggable="edit"
        @dragstart="dragId = tile.id; $event.dataTransfer.effectAllowed = 'move'"
        @dragenter.prevent="dragId && store.moveBefore(dragId, tile.id)"
        @dragover.prevent
        @drop.prevent="onDrop"
        @dragend="onDrop"
      >
        <slot name="tile" :tile="tile" :def="store.byId.get(tile.id)" :size="sizeFor(tile)" :span="cell(tile).span" :rows="cell(tile).rows" :edit="edit" />
        <div v-if="edit" class="m-tiles__tools">
          <MIconButton icon="chevron_left" :label="T.earlier" @click="store.move(tile.id, -1)" />
          <MIconButton icon="chevron_right" :label="T.later" @click="store.move(tile.id, 1)" />
          <MIconButton v-if="store.byId.get(tile.id).sizes.length > 1" icon="crop_square" :label="T.resize" tonal @click="store.resize(tile.id)" />
          <MIconButton icon="close" :label="T.remove" tonal @click="store.remove(tile.id)" />
        </div>
      </div>
    </TransitionGroup>


    <Teleport v-if="edit" to="body">
      <div class="m-tilegrid__dock">
        <MToolbar :label="T.edit">
          <MIconButton icon="add" :label="T.add" @click="adding = true" />
          <MIconButton icon="restart_alt" :label="T.reset" @click="store.reset()" />
          <template #fab><MButton variant="filled" icon="check" @click="edit = false">{{ T.done }}</MButton></template>
        </MToolbar>
      </div>
    </Teleport>

    <MSheet v-model="adding" :title="T.addTitle" side="end">
      <ul v-if="store.available.value.length" class="m-tilepick">
        <li v-for="def in store.available.value" :key="def.id">
          <button type="button" class="m-tilepick__row" @click="store.add(def.id)">
            <span class="m-tilepick__icon"><MIcon :name="def.icon" /></span>
            <span class="m-tilepick__title">{{ def.title }}</span>
            <MIcon name="add_circle" />
          </button>
        </li>
      </ul>
      <p v-else class="m-tilepick__none">{{ T.nothing }}</p>
    </MSheet>
  </div>
</template>
