<script setup>
import { computed, ref } from 'vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import { diagnosticsTexts } from '../diagnostics/texts.js'
import { fillText } from './guideTexts.js'

// The problems the host reported at startup. On the page it is ONE slim line: the error icon, the most important problem, "+N" when there are more and one
// trailing "View" action. The action (or the line) opens a centred dialog that lists every problem as a segmented list (icon, short line, "Fix" where a fix is
// known, an expand row with the original message) and has the log in its footer. The original text is never on the page.
// problems: [{ id, short, raw, count, known: null | { go, link } }] (startupProblems()).
const props = defineProps({
  problems: { type: Array, required: true },
  locale: { type: String, default: 'en' },
  texts: { type: Object, default: null },
})
const emit = defineEmits(['logs', 'fix'])
const T = computed(() => ({ ...diagnosticsTexts(props.locale), ...(props.texts || {}) }))
const dialog = ref(false)
const open = ref(new Set())
// the most important first: a problem with a known fix, then a known one, then the rest in the order of the log
const ordered = computed(() => [...props.problems].sort((a, b) => (Number(!!b.known) + Number(!!(b.known && (b.known.go || b.known.link)))) - (Number(!!a.known) + Number(!!(a.known && (a.known.go || a.known.link))))))
const first = computed(() => ordered.value[0])
const more = computed(() => props.problems.length - 1)
const title = computed(() => fillText(props.problems.length === 1 ? T.value.startupTitle : T.value.startupTitleMany, { n: props.problems.length }))
const hasFix = (p) => !!(p.known && (p.known.go || p.known.link))
function toggle(id) { const next = new Set(open.value); next.has(id) ? next.delete(id) : next.add(id); open.value = next }
function fix(p) { dialog.value = false; emit('fix', p) }
function logs() { dialog.value = false; emit('logs') }
</script>

<template>
  <section v-if="problems.length" class="m-sprob" role="alert">
    <span class="m-sprob__icon"><MIcon name="error" fill /></span>
    <button type="button" class="m-sprob__line" :aria-label="`${first.short}. ${T.startupView}`" @click="dialog = true">
      <span class="m-sprob__text">{{ first.short }}</span>
      <span v-if="more > 0" class="m-sprob__more">+{{ more }}</span>
    </button>
    <MButton variant="tonal" size="sm" class="m-sprob__view" :title="T.startupView" :aria-label="T.startupView" @click="dialog = true"><MIcon class="m-sprob__viewicon" name="chevron_right" /><span class="m-sprob__viewlabel">{{ T.startupView }}</span></MButton>
  </section>

  <MDialog v-model="dialog" :title="title" icon="error" tone="error">
    <MGroup>
      <template v-for="p in ordered" :key="p.id">
        <MItem action icon="error" :title="p.short" :text="p.count > 1 ? `×${p.count}` : ''" :aria-expanded="open.has(p.id)" :aria-label="`${p.short}. ${T.showRaw}`" @click="toggle(p.id)">
          <template #trail>
            <MButton v-if="hasFix(p)" variant="tonal" size="sm" icon="build" class="m-sprob__fix" :title="T.fixIt" :aria-label="T.fixIt" @click.stop="fix(p)"><span class="m-sprob__fixlabel">{{ T.fixIt }}</span></MButton>
            <MIcon class="m-sprob__chev" :class="{ 'is-open': open.has(p.id) }" name="chevron_right" :title="T.showRaw" />
          </template>
        </MItem>
        <MItem v-if="open.has(p.id)" plain :title="p.raw" class="m-sprob__rawrow" />
      </template>
    </MGroup>
    <template #actions>
      <MButton variant="text" icon="terminal" @click="logs">{{ T.viewLog }}</MButton>
      <MButton variant="tonal" @click="dialog = false">{{ T.closeIt }}</MButton>
    </template>
  </MDialog>
</template>
