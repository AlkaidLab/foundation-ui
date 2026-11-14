<script setup>
import { computed, reactive, watch } from 'vue'
import MSheet from './MSheet.vue'
import MItem from './MItem.vue'
import MGroup from './MGroup.vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MBanner from './MBanner.vue'
import MFieldItem from './MFieldItem.vue'
import { fillText } from './guideTexts.js'

// The game library scan and adding by hand, as a sheet over the apps step of the first-run guide: closing it returns to the guide. The product gives
// `scanGames(sources) -> { ok, games: [{ key, name, platform }], warnings?, busy?, unsupported?, error? }` and `addGames(games) -> { ok, added?, error? }`.
const open = defineModel({ type: String, default: '' }) // '' | 'scan' | 'add'
const props = defineProps({ T: { type: Object, required: true }, callbacks: { type: Object, default: () => ({}) } })
const emit = defineEmits(['added'])
const LIBRARIES = [
  ['steam', 'Steam', 'sports_esports'],
  ['epic', 'Epic Games', 'sports_esports'],
  ['gog', 'GOG', 'sports_esports'],
  ['xbox', 'Xbox', 'sports_esports'],
  ['ea', 'EA app', 'sports_esports'],
  ['ubisoft', 'Ubisoft Connect', 'sports_esports'],
  ['battlenet', 'Battle.net', 'sports_esports'],
  ['riot', 'Riot Client', 'sports_esports'],
  ['hoyoplay', 'HoYoPlay', 'sports_esports'],
  ['wegame', 'WeGame', 'sports_esports'],
  ['sparxie', 'Sparxie', 'touch_app'],
]
const sheet = reactive({ sources: LIBRARIES.map(([id]) => id), busy: false, found: null, picked: [], note: '', failed: false, name: '', cmd: '' })
watch(open, (mode) => { if (mode) Object.assign(sheet, { busy: false, found: null, picked: [], note: '', failed: false, name: '', cmd: '' }) })
const visible = computed({ get: () => !!open.value, set: (v) => { if (!v) open.value = '' } })
const A = computed(() => props.T.apps)
const toggleSource = (value) => { sheet.sources = sheet.sources.includes(value) ? sheet.sources.filter((v) => v !== value) : [...sheet.sources, value] }
const togglePicked = (key) => { sheet.picked = sheet.picked.includes(key) ? sheet.picked.filter((v) => v !== key) : [...sheet.picked, key] }
const warningText = (code) => A.value.warnings?.[code] || A.value.warnings?.unknown || ''
const noteFrom = (warnings) => (warnings || []).map(warningText).filter(Boolean).join(' ')
const launchName = (id) => (id === 'touch' ? A.value.launchTouch : id === 'pc' ? A.value.launchPc : id)
const setMode = (game, id) => { game.mode = id }
async function runScan() {
  if (sheet.busy || !sheet.sources.length) return
  sheet.busy = true; sheet.note = ''; sheet.failed = false; sheet.found = null
  try {
    const r = (await props.callbacks.scanGames([...sheet.sources])) || { ok: false }
    if (r.ok) {
      sheet.found = r.games || []
      sheet.picked = sheet.found.map((g) => g.key)
      const notes = noteFrom(r.warnings)
      sheet.note = sheet.found.length ? notes : [A.value.none, notes].filter(Boolean).join(' ')
    }
    else { sheet.failed = true; sheet.note = r.busy ? A.value.busy : r.unsupported ? A.value.scanOnly : (r.error || A.value.scanFailed) }
  } catch (error) { sheet.failed = true; sheet.note = error?.message || A.value.scanFailed } finally { sheet.busy = false }
}
async function addPicked() {
  if (sheet.busy) return
  const byHand = open.value === 'add'
  const chosen = byHand ? [{ key: 'by-hand', name: sheet.name.trim(), cmd: sheet.cmd.trim() }] : (sheet.found || []).filter((g) => sheet.picked.includes(g.key))
  if (!chosen.length || (byHand && !chosen[0].name)) return
  sheet.busy = true; sheet.note = ''; sheet.failed = false
  try {
    const r = (await props.callbacks.addGames(chosen)) || { ok: false }
    if (r.ok) {
      const n = r.added ?? chosen.length
      emit('added', n); sheet.note = fillText(A.value.added, { n })
      sheet.found = (sheet.found || []).filter((g) => !sheet.picked.includes(g.key)); sheet.picked = []
      if (byHand) { sheet.name = ''; sheet.cmd = '' }
    } else { sheet.failed = true; sheet.note = r.error || A.value.addFailed }
  } catch (error) { sheet.failed = true; sheet.note = error?.message || A.value.addFailed } finally { sheet.busy = false }
}
</script>

<template>
  <MSheet v-model="visible" :title="open === 'add' ? A.manual : A.scan" side="end" :close-label="T.close">
    <div class="m-guide__sheet">
      <template v-if="open === 'scan'">
        <MGroup role="group" :aria-label="A.sources">
          <MItem v-for="[value, label, icon] in LIBRARIES" :key="value" action role="checkbox" :icon="icon" :title="label" :selected="sheet.sources.includes(value)" :aria-checked="sheet.sources.includes(value)" :disabled="sheet.busy" @click="toggleSource(value)">
            <template #trail><MIcon :name="sheet.sources.includes(value) ? 'check_circle' : 'radio_button_unchecked'" :fill="sheet.sources.includes(value)" /></template>
          </MItem>
        </MGroup>
        <MButton icon="search" :loading="sheet.busy && !sheet.found" :disabled="sheet.busy || !sheet.sources.length" @click="runScan">{{ sheet.found ? A.again : A.start }}</MButton>
        <template v-if="sheet.found && sheet.found.length">
          <h2 class="m-guide__label">{{ fillText(A.found, { n: sheet.found.length }) }}</h2>
          <MGroup role="group">
            <MItem v-for="g in sheet.found" :key="g.key" action role="checkbox" icon="sports_esports" :title="g.name" :text="[g.platform, g.region].filter(Boolean).join(' · ')" :selected="sheet.picked.includes(g.key)" :aria-checked="sheet.picked.includes(g.key)" @click="togglePicked(g.key)">
              <template #trail>
                <span v-if="g.launches?.length > 1" @click.stop.prevent @pointerdown.stop>
                  <span v-for="choice in g.launches" :key="choice.id" role="button" tabindex="0" @click.stop.prevent="setMode(g, choice.id)" @keydown.enter.stop.prevent="setMode(g, choice.id)">{{ launchName(choice.id) }}{{ g.mode === choice.id ? ' ·' : '' }}</span>
                </span>
                <MIcon :name="sheet.picked.includes(g.key) ? 'check_circle' : 'radio_button_unchecked'" :fill="sheet.picked.includes(g.key)" />
              </template>
            </MItem>
          </MGroup>
          <MButton icon="add" :loading="sheet.busy" :disabled="sheet.busy || !sheet.picked.length" @click="addPicked">{{ fillText(A.addPicked, { n: sheet.picked.length }) }}</MButton>
        </template>
      </template>
      <template v-else>
        <MGroup>
          <MFieldItem v-model="sheet.name" :label="A.nameLabel" autocomplete="off" :disabled="sheet.busy" />
          <MFieldItem v-model="sheet.cmd" :label="A.cmdLabel" :supporting="A.cmdHint" autocomplete="off" :disabled="sheet.busy" />
        </MGroup>
        <MButton icon="add" :loading="sheet.busy" :disabled="sheet.busy || !sheet.name.trim()" @click="addPicked">{{ A.addOne }}</MButton>
      </template>
      <MBanner v-if="sheet.note" :tone="sheet.failed ? 'error' : 'info'" :icon="sheet.failed ? 'error' : 'check_circle'">{{ sheet.note }}</MBanner>
    </div>
    <template #actions><MButton variant="tonal" icon="arrow_back" @click="open = ''">{{ A.backToGuide }}</MButton></template>
  </MSheet>
</template>
