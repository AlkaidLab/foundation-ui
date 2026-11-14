<script setup>
import MIcon from './MIcon.vue'
import { CLIENT_OS, OS_ICON, osChipName } from '../clients/catalogue.js'

// The chips of the systems a client can be for (Windows, macOS, Linux, Android, iOS / iPadOS, HarmonyOS, TV and the rest), each with its icon. One choice. `compact`: the
// chips that are not chosen show only their icon (the name stays as the accessible name and the tooltip), so seven chips fit a half-width tile.
const os = defineModel({ type: String, default: 'android' })
defineProps({ locale: { type: String, default: 'en' }, label: { type: String, default: '' }, compact: { type: Boolean, default: false }, big: { type: Boolean, default: false } })
const names = (o, locale) => osChipName(o, locale)
const move = (e, delta) => {
  const i = CLIENT_OS.indexOf(os.value)
  os.value = CLIENT_OS[(i + delta + CLIENT_OS.length) % CLIENT_OS.length]
  e.currentTarget.parentElement.querySelectorAll('button')[CLIENT_OS.indexOf(os.value)]?.focus()
  e.preventDefault()
}
</script>

<template>
  <div class="m-oschips" :class="{ 'is-compact': compact, 'is-big': big }" role="radiogroup" :aria-label="label">
    <button v-for="o in CLIENT_OS" :key="o" type="button" role="radio" class="m-oschips__chip" :aria-checked="os === o" :tabindex="os === o ? 0 : -1" :aria-label="names(o, locale)" :data-tip="compact && os !== o ? names(o, locale) : undefined"
      @click="os = o" @keydown.right="move($event, 1)" @keydown.left="move($event, -1)"><MIcon :name="OS_ICON[o]" :fill="os === o" /><span>{{ names(o, locale) }}</span></button>
  </div>
</template>
