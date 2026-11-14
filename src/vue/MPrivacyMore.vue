<script setup>
// 隐私 under the two switches of 关于: what is sent and what is not (one dialog, per switch: sent, never sent, goes to, kept for) and "see what will be sent" (the records waiting for the next send, exactly as they
// leave, from the product's own host). The words are errorTexts.js; the facts are docs/privacy-data-inventory.md.
import { computed, ref } from 'vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import MIcon from './MIcon.vue'
import MButton from './MButton.vue'
import MDialog from './MDialog.vue'
import { errorTexts } from './errorTexts.js'

const props = defineProps({
  /** 'on' | 'off' of the error reports and the usage statistics; empty: the product has no such switch and its part is left out */
  errors: { type: String, default: '' },
  consent: { type: String, default: '' },
  locale: { type: String, default: 'en' },
  /** `() => Promise<{ events: object[], envelope?: object, endpoint?: string }>`; empty: the row is not shown */
  previewLoader: { type: Function, default: null },
})
const E = computed(() => errorTexts(props.locale))
const privacyOpen = ref(false)
const previewOpen = ref(false)
const previewState = ref('idle')
const preview = ref({ events: [], envelope: null, endpoint: '' })
const parts = computed(() => [
  ...(props.errors ? [{ id: 'errors', title: E.value.errorsRow, collected: E.value.errorsCollected, kept: E.value.errorsKept }] : []),
  ...(props.consent ? [{ id: 'usage', title: E.value.usageRow, collected: E.value.usageCollected, kept: E.value.usageKept }] : []),
])
const previewText = computed(() => JSON.stringify({ ...(preview.value.endpoint ? { to: preview.value.endpoint } : {}), ...(preview.value.envelope || {}), events: preview.value.events }, null, 2))
async function openPreview() {
  previewOpen.value = true
  previewState.value = 'loading'
  try {
    const answer = await props.previewLoader()
    preview.value = { events: Array.isArray(answer?.events) ? answer.events : [], envelope: answer?.envelope ?? null, endpoint: String(answer?.endpoint || '') }
    previewState.value = 'ready'
  } catch { previewState.value = 'failed' }
}
</script>

<template>
  <MGroup>
    <MItem action icon="shield" :title="E.privacyMore" data-privacy="more" @click="privacyOpen = true"><template #trail><MIcon name="chevron_right" /></template></MItem>
    <MItem v-if="previewLoader" action icon="visibility" :title="E.previewRow" data-privacy="preview" @click="openPreview"><template #trail><MIcon name="chevron_right" /></template></MItem>
  </MGroup>

  <MDialog v-model="privacyOpen" class="m-privacy" :title="E.privacyTitle" icon="shield">
    <p class="m-privacy__lead">{{ E.privacyLead }}</p>
    <section v-for="part in parts" :key="part.id" class="m-privacy__part" :data-privacy-part="part.id">
      <h3>{{ part.title }}</h3>
      <dl>
        <dt>{{ E.lblCollected }}</dt><dd>{{ part.collected }}</dd>
        <dt>{{ E.lblKept }}</dt><dd>{{ part.kept }}</dd>
      </dl>
    </section>
    <!-- the same for both switches: said once -->
    <section class="m-privacy__part m-privacy__part--shared" data-privacy-part="shared">
      <dl>
        <dt>{{ E.lblNever }}</dt><dd>{{ E.neverText }}</dd>
        <dt>{{ E.lblWhere }}</dt><dd>{{ E.whereText }}</dd>
      </dl>
    </section>
    <template #actions><MButton variant="text" @click="privacyOpen = false">{{ E.close }}</MButton></template>
  </MDialog>

  <MDialog v-model="previewOpen" class="m-privacy m-privacy--preview" :title="E.previewRow" icon="visibility">
    <p class="m-privacy__lead">{{ E.previewLead }}</p>
    <p v-if="previewState === 'failed'" class="m-privacy__empty" data-privacy-failed>{{ E.previewFailed }}</p>
    <template v-else-if="previewState === 'ready'">
      <p v-if="!preview.events.length" class="m-privacy__empty" data-privacy-empty>{{ E.previewEmpty }}</p>
      <pre class="m-privacy__json" data-privacy-json>{{ previewText }}</pre>
    </template>
    <template #actions><MButton variant="text" @click="previewOpen = false">{{ E.close }}</MButton></template>
  </MDialog>
</template>
