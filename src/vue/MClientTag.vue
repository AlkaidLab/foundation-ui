<script setup>
import { computed } from 'vue'
import { clientTexts } from '../clients/catalogue.js'

// The tag every client card and row carries: 官方 (a work of the team: a primary tonal chip) or 合作 (a partner's: a neutral outline chip). Plain words, nothing explaining them.
const props = defineProps({
  official: { type: Boolean, default: false },
  locale: { type: String, default: 'en' },
})
const T = computed(() => clientTexts(props.locale))
</script>

<template>
  <span class="m-ctag" :class="official ? 'm-ctag--official' : 'm-ctag--partner'" data-client-tag :data-tag="official ? 'official' : 'partner'">{{ official ? T.tagOfficial : T.tagPartner }}</span>
</template>
