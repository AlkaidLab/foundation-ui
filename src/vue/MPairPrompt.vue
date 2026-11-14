<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'
import MPinEntry from './MPinEntry.vue'
import { connectTexts } from '../clients/recommend.js'

/**
 * The pairing prompt: a card that comes forward on any page while a device waits for its PIN. It does not block anything: one row per request with the device's name, the
 * PIN field, the time left and 拒绝; below, once, 还没装客户端？ which opens the install tab of the connect dialog. Requests that expire disappear (the list is the host's).
 */
const props = defineProps({
  requests: { type: Array, default: () => [] },
  locale: { type: String, default: 'en' },
  now: { type: Number, default: 0 },
  closeLabel: { type: String, default: '' },
})
const emit = defineEmits(['submit', 'reject', 'install'])
const T = computed(() => connectTexts(props.locale))
const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const left = (r) => { const s = Math.max(0, Math.round(r.expires_at - (props.now || Date.now()) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
</script>

<template>
  <Transition name="m-pairprompt">
    <section v-if="requests.length" class="m-pairprompt" role="alertdialog" aria-live="polite" :aria-label="T.pendingTitle.replace('{name}', requests[0].device_name)">
      <article v-for="r in requests" :key="r.id" class="m-pairprompt__row">
        <header>
          <span class="m-pairprompt__ico"><MIcon name="person_add" fill /></span>
          <div class="m-pairprompt__text"><b data-redact="client">{{ fill(T.pendingTitle, { name: r.device_name }) }}</b><small>{{ T.pendingHint }}</small></div>
          <span class="m-pairprompt__left m-dnum" :title="T.pendingLeft">{{ left(r) }}</span>
        </header>
        <div class="m-pairprompt__entry">
          <MPinEntry data-redact="pin" :label="T.pinLabel" :go="T.pairGo" @submit="(pin) => emit('submit', { id: r.id, pin, name: r.device_name })" />
          <button type="button" class="m-pairprompt__reject" @click="emit('reject', r.id)">{{ T.reject }}</button>
        </div>
      </article>
      <footer><button type="button" class="m-conn__link" @click="emit('install')"><MIcon name="download" />{{ T.noClient }}</button></footer>
    </section>
  </Transition>
</template>
