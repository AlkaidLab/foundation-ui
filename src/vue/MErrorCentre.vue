<script setup>
import { computed, ref } from 'vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MEmpty from './MEmpty.vue'
import { diagnosticsTexts } from '../diagnostics/texts.js'
import { buildErrorCentre } from '../diagnostics/known.js'
import { fillText } from './guideTexts.js'

// Recent errors in plain words: grouped, with the likely cause and what to do where the project's own documents say so, otherwise the raw line.
// `rows` are parsed log rows. Emits show (row id: the viewer jumps to it), go (place id: drivers | encoder | network | audio | display), open (url).
const props = defineProps({ rows: { type: Array, default: () => [] }, locale: { type: String, default: 'en' }, texts: { type: Object, default: null }, limit: { type: Number, default: 12 } })
const emit = defineEmits(['show', 'go', 'open'])
const T = computed(() => diagnosticsTexts(props.locale, props.texts))
const groups = computed(() => buildErrorCentre(props.rows, { limit: props.limit }))
const openKey = ref('')
const textOf = (g) => (g.known ? T.value.known[g.known.id] : null)
const title = (g) => textOf(g)?.title || g.sample.split('\n')[0].slice(0, 140)
const sub = (g) => `${g.count > 1 ? `${fillText(T.value.times, { n: g.count })} · ` : ''}${fillText(T.value.lastSeen, { time: g.last.stamp.slice(5, 19) })}`
</script>

<template>
  <section class="m-errc" :aria-label="T.errorCentre">
    <MEmpty v-if="!groups.length" icon="check_circle" :title="T.noErrors" />
    <MGroup v-else>
      <template v-for="g in groups" :key="g.key">
        <MItem action data-redact="path" :icon="g.level === 'Fatal' ? 'error' : 'warning'" :title="title(g)" :text="sub(g)" :selected="openKey === g.key" @click="openKey = openKey === g.key ? '' : g.key">
          <template #trail><MIcon :name="openKey === g.key ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" /></template>
        </MItem>
        <template v-if="openKey === g.key">
          <MItem v-if="textOf(g)" plain icon="help" :title="T.cause" :text="textOf(g).cause" />
          <MItem v-if="textOf(g)" plain icon="build" :title="T.fix" :text="textOf(g).fix" />
          <MItem v-else plain icon="info" :title="T.otherError" :text="T.raw" />
          <MItem plain :title="''"><template #control><pre class="m-errc__raw" data-redact="path">{{ g.sample }}</pre></template></MItem>
          <MItem plain :title="''">
            <template #control>
              <span class="m-errc__actions">
                <MButton size="sm" variant="tonal" icon="terminal" @click="emit('show', g.last.id)">{{ T.showInLog }}</MButton>
                <MButton v-if="g.known?.go" size="sm" variant="tonal" icon="open_in_new" @click="emit('go', g.known.go)">{{ T.go[g.known.go] }}</MButton>
                <MButton v-if="g.known?.link" size="sm" variant="outlined" icon="menu_book" @click="emit('open', g.known.link)">{{ T.docs }}</MButton>
              </span>
            </template>
          </MItem>
        </template>
      </template>
    </MGroup>
  </section>
</template>
