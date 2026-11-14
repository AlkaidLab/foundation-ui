<script setup>
import { useSlots } from 'vue'

// The caption bar over the top of the window, beside the rail, one for both products. It only orders what the product puts in it:
//   [back] brand [version] | search | mita (a character's avatar button: the control panel only) | connect (连接设备) | announcements (公告) | account (the account menu) | controls (the window's own buttons: the control panel only)
// `mita`, `connect`, `announcements` and `account` sit together in one actions group right of the search, in that order, then the window controls, all in one cluster at the end (the third
// column of the control panel's grid); a slot the product does not fill takes no room.
// `back` (the global back button, left of the logo) and `version` (the short version and the update line, after the name) are optional; with either, the three sit in one row in the first column.
// `bem` is the product's own class (panel-caption, web-caption): the group is `<bem>__actions`, so the product's styles keep working.
defineProps({ bem: { type: String, default: 'm-caption' } })
const slots = useSlots()
const actions = () => !!(slots.mita || slots.connect || slots.announcements || slots.account)
</script>

<template>
  <header class="m-caption" :class="bem">
    <div v-if="$slots.back || $slots.version" class="m-caption__lead" :class="`${bem}__lead`">
      <slot name="back" />
      <slot name="brand" />
      <slot name="version" />
    </div>
    <slot v-else name="brand" />
    <slot name="search" />
    <div v-if="actions() || $slots.controls" class="m-caption__end" :class="`${bem}__end`">
      <div v-if="actions()" class="m-caption__actions" :class="`${bem}__actions`">
        <slot name="mita" />
        <slot name="connect" />
        <slot name="announcements" />
        <slot name="account" />
      </div>
      <slot name="controls" />
    </div>
  </header>
</template>
