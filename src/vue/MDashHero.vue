<script setup>
import MIcon from './MIcon.vue'

// Hero: status chip, host name large, chips, two label and value pairs, and one labelled action at the bottom right (end the session while streaming, restart the service when idle). Nothing decorative.
defineProps({
  statusLabel: { type: String, default: '' },
  statusTone: { type: String, default: 'ok' }, // ok | live | warn | off
  title: { type: String, default: '' },
  chips: { type: Array, default: () => [] }, // [{ icon?, label, tone? }]
  pairs: { type: Array, default: () => [] }, // [{ label, value }]
  action: { type: Object, default: null }, // { icon, label, busy }
  chevron: { type: Boolean, default: false },
  chevronLabel: { type: String, default: '' },
  icon: { type: String, default: 'dns' },
  heading: { type: String, default: '' },
  /** 中: the status, the name, the chips and two pairs. 大 adds the host's facts (version, the clients, the session), 特大 the rest of them (encoder, network, system) in a second column */
  size: { type: String, default: 'm' },
  facts: { type: Array, default: () => [] }, // [{ icon, label, value, tier: 'l' | 'xl' }]
})
const shown = (size, facts) => (size === 'xl' ? facts : size === 'l' ? facts.filter((f) => f.tier !== 'xl') : [])
const emit = defineEmits(['action', 'open'])
</script>

<template>
  <section class="m-dcard m-dhero" :class="`m-dhero--${size}`">
    <div class="m-dhero__main">
      <header class="m-dcard__head">
        <MIcon class="m-dcard__icon" :name="icon" />
        <h3 class="m-dcard__title">{{ heading }}</h3>
        <span v-if="statusLabel" class="m-dchip m-dchip--status" :class="`m-dchip--${statusTone}`"><i />{{ statusLabel }}</span>
        <button v-if="chevron" type="button" class="m-dcard__more" :aria-label="chevronLabel || heading" @click="emit('open')"><MIcon name="chevron_right" /></button>
      </header>
      <div class="m-dhero__name" data-redact="host">{{ title }}</div>
      <div class="m-dhero__chips"><span v-for="(c, i) in chips" :key="i" class="m-dchip" :class="c.tone && `m-dchip--${c.tone}`"><MIcon v-if="c.icon" :name="c.icon" />{{ c.label }}</span></div>
      <div class="m-dhero__pairs"><div v-for="(p, i) in pairs" :key="i"><small>{{ p.label }}</small><b class="m-dnum">{{ p.value }}</b></div></div>
    </div>
    <dl v-if="shown(size, facts).length" class="m-dhero__facts"><div v-for="f in shown(size, facts)" :key="f.label"><MIcon :name="f.icon" /><dt>{{ f.label }}</dt><dd>{{ f.value }}</dd></div></dl>
    <button v-if="action" type="button" class="m-dhero__go" :data-kind="action.kind" :disabled="action.busy" :aria-label="action.label" @click="emit('action')">
      <MIcon :name="action.icon" fill /><span>{{ action.label }}</span>
    </button>
  </section>
</template>
