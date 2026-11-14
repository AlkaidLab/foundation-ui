<script setup>
import { computed, ref } from 'vue'
import MBanner from './MBanner.vue'
import MButton from './MButton.vue'
import MCheckItem from './MCheckItem.vue'
import MFooter from './MFooter.vue'
import MGroup from './MGroup.vue'
import MIcon from './MIcon.vue'
import MIconButton from './MIconButton.vue'
import MItem from './MItem.vue'
import MLoading from './MLoading.vue'
import MSection from './MSection.vue'
import MSheet from './MSheet.vue'
import { diagnosticsTexts } from '../diagnostics/texts.js'

// The diagnosis sheet of 诊断与日志. The product runs the request; this shows the configuration, the local findings and the reply.
const props = defineProps({
  show: { type: Boolean, default: false },
  config: { type: Object, default: null },
  isConfigLoading: { type: Boolean, default: false },
  isSavingConfig: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  result: { type: String, default: '' },
  error: { type: String, default: '' },
  localFindings: { type: Array, default: () => [] },
  localSuggestions: { type: Array, default: () => [] },
  locale: { type: String, default: 'en' },
  texts: { type: Object, default: null },
})
const emit = defineEmits(['close', 'diagnose'])
const T = computed(() => diagnosticsTexts(props.locale, props.texts).aiSheet)
const zh = computed(() => /^zh/i.test(String(props.locale)))
const showConfig = ref(false)
const checkState = (severity) => (severity === 'fatal' || severity === 'error' ? 'error' : severity === 'warning' ? 'warn' : 'info')
const onSheet = (open) => { if (!open) emit('close') }
const findingLabel = (finding) => (zh.value && finding?.labels?.zh) || finding?.message || finding?.type || ""
const suggestionTitle = (suggestion) => (zh.value && suggestion?.labels?.zh) || suggestion?.title || suggestion?.findingType || ""
const suggestionActions = (suggestion) => (zh.value && Array.isArray(suggestion?.actionLabels?.zh) ? suggestion.actionLabels.zh : (Array.isArray(suggestion?.actions) ? suggestion.actions : []))
function renderMarkdown(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
    .replace(/^### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^## (.+)$/gm, '<h5>$1</h5>')
    .replace(/^# (.+)$/gm, '<h4>$1</h4>')
    .replace(/\n/g, '<br>')
}
const html = computed(() => renderMarkdown(props.result))
function copyResult() { navigator.clipboard?.writeText(String(props.result || "")).catch(() => {}) }
</script>

<template>
  <MSheet :model-value="show" :title="T.title" side="end" :close-label="T.close" @update:model-value="onSheet">
    <MSection>
      <MGroup>
        <MItem action icon="tune" :title="T.config" :aria-expanded="showConfig" @click="showConfig = !showConfig">
          <template #trail><MLoading v-if="isConfigLoading || isSavingConfig" size="20px" :label="isSavingConfig ? T.savingConfig : T.loadingConfig" /><MIcon :name="showConfig ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" /></template>
        </MItem>
        <template v-if="showConfig">
          <MItem :title="T.status" :value="config?.enabled ? T.enabled : T.disabled" />
          <MItem :title="T.provider" :value="config?.provider || '-'" />
          <MItem :title="T.compatibility" :value="config?.compatibility || '-'" />
          <MItem :title="T.model" :value="config?.model || '-'" />
        </template>
      </MGroup>
      <MFooter v-if="showConfig">{{ T.managed }} {{ T.keysLocal }}</MFooter>
    </MSection>
    <MSection v-if="localFindings?.length" :title="T.local">
      <MGroup>
        <MCheckItem v-for="finding in localFindings" :key="finding.id" :state="checkState(finding.severity)" :title="findingLabel(finding)" :text="finding.count > 1 ? '×' + finding.count : ''">
          <template v-if="finding.evidence?.[0]?.text" #default><code class="m-tip">{{ finding.evidence[0].text }}</code></template>
        </MCheckItem>
      </MGroup>
    </MSection>
    <MSection v-if="localSuggestions?.length" :title="T.fixes">
      <MGroup>
        <MCheckItem v-for="suggestion in localSuggestions" :key="suggestion.id" :state="checkState(suggestion.severity)" :title="suggestionTitle(suggestion)">
          <ul class="m-tip"><li v-for="(action, index) in suggestionActions(suggestion)" :key="index">{{ action }}</li></ul>
        </MCheckItem>
      </MGroup>
    </MSection>
    <div v-if="isLoading && !result" class="m-diagai__wait"><MLoading /><span>{{ T.analyzing }}</span></div>
    <MBanner v-if="error" tone="error" icon="error"><b>{{ T.error }}</b> {{ error }}</MBanner>
    <MSection v-if="result" :title="T.result">
      <div class="m-tip m-diagai__result">
        <MIconButton class="m-diagai__copy" icon="content_copy" :label="T.copy" @click="copyResult" />
        <div class="m-diagai__html" v-html="html" />
      </div>
    </MSection>
    <template #actions>
      <MButton v-if="!result && !error" size="lg" :loading="isLoading" :disabled="isLoading" icon="wand_stars" @click="emit('diagnose')">{{ isLoading ? T.analyzing : T.start }}</MButton>
      <MButton v-else variant="tonal" size="lg" :loading="isLoading" :disabled="isLoading" icon="refresh" @click="emit('diagnose')">{{ error ? T.retry : T.again }}</MButton>
    </template>
  </MSheet>
</template>
