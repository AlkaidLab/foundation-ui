<script setup>
// A small picture of what a tray gesture opens: the main window, one of the three menus (drawn at the corner of a taskbar), or nothing. Theme roles only.
defineProps({ kind: { type: String, required: true } })
</script>

<template>
  <svg viewBox="0 0 112 72" aria-hidden="true" focusable="false">
    <rect width="112" height="72" fill="var(--md-sys-color-surface-container-low)" />
    <template v-if="kind === 'panel'">
      <rect x="14" y="8" width="84" height="50" rx="6" fill="var(--md-sys-color-surface)" stroke="var(--md-sys-color-outline-variant)" />
      <rect x="14" y="8" width="84" height="9" rx="6" fill="var(--md-sys-color-surface-container-high)" />
      <rect x="19" y="22" width="18" height="30" rx="3" fill="var(--md-sys-color-surface-container-high)" />
      <rect x="42" y="22" width="50" height="10" rx="3" fill="var(--md-sys-color-primary-container)" />
      <rect x="42" y="36" width="23" height="16" rx="3" fill="var(--md-sys-color-surface-container-highest)" />
      <rect x="69" y="36" width="23" height="16" rx="3" fill="var(--md-sys-color-surface-container-highest)" />
    </template>
    <template v-else-if="kind === 'none'">
      <circle cx="56" cy="30" r="14" fill="none" stroke="var(--md-sys-color-outline)" stroke-width="2" stroke-dasharray="4 3" />
      <path d="M46 40 L66 20" stroke="var(--md-sys-color-outline)" stroke-width="2" stroke-linecap="round" />
    </template>
    <template v-else>
      <!-- the card against the taskbar corner -->
      <g v-if="kind === 'v1'">
        <rect x="58" y="8" width="48" height="50" rx="7" fill="var(--md-sys-color-surface-container-high)" stroke="var(--md-sys-color-outline-variant)" />
        <circle cx="66" cy="16" r="3.2" fill="var(--md-sys-color-primary)" /><rect x="72" y="14" width="18" height="2.6" rx="1.3" fill="var(--md-sys-color-on-surface)" />
        <rect x="63" y="23" width="38" height="3.4" rx="1.7" fill="var(--md-sys-color-on-surface-variant)" opacity=".55" />
        <rect x="63" y="29" width="38" height="3.4" rx="1.7" fill="var(--md-sys-color-on-surface-variant)" opacity=".55" />
        <rect x="63" y="35" width="38" height="3.4" rx="1.7" fill="var(--md-sys-color-on-surface-variant)" opacity=".55" />
        <rect x="63" y="41" width="38" height="3.4" rx="1.7" fill="var(--md-sys-color-on-surface-variant)" opacity=".55" />
        <rect x="63" y="48" width="18" height="6" rx="3" fill="var(--md-sys-color-secondary-container)" /><rect x="84" y="48" width="17" height="6" rx="3" fill="var(--md-sys-color-secondary-container)" />
      </g>
      <g v-else-if="kind === 'v2'">
        <rect x="54" y="4" width="52" height="54" rx="7" fill="var(--md-sys-color-surface-container-high)" stroke="var(--md-sys-color-outline-variant)" />
        <rect x="58" y="8" width="44" height="21" rx="5" fill="var(--md-sys-color-surface-container-highest)" />
        <circle cx="65" cy="15" r="3.4" fill="var(--md-sys-color-primary)" /><rect x="71" y="13" width="16" height="2.6" rx="1.3" fill="var(--md-sys-color-on-surface)" />
        <rect x="61" y="21" width="38" height="5" rx="2.5" fill="var(--md-sys-color-primary-container)" />
        <rect x="60" y="33" width="40" height="3.4" rx="1.7" fill="var(--md-sys-color-on-surface-variant)" opacity=".55" />
        <rect x="60" y="39" width="40" height="3.4" rx="1.7" fill="var(--md-sys-color-on-surface-variant)" opacity=".55" />
        <rect x="60" y="45" width="40" height="3.4" rx="1.7" fill="var(--md-sys-color-on-surface-variant)" opacity=".55" />
        <rect x="60" y="51" width="18" height="4" rx="2" fill="var(--md-sys-color-secondary-container)" /><rect x="81" y="51" width="19" height="4" rx="2" fill="var(--md-sys-color-secondary-container)" />
      </g>
      <g v-else-if="kind === 'v3'">
        <rect x="52" y="4" width="54" height="54" rx="9" fill="var(--md-sys-color-surface-container-high)" stroke="var(--md-sys-color-outline-variant)" />
        <rect x="56" y="8" width="46" height="10" rx="5" fill="var(--md-sys-color-surface-container-highest)" />
        <rect x="56" y="21" width="22" height="9" rx="4.5" fill="var(--md-sys-color-primary-container)" /><rect x="80" y="21" width="22" height="9" rx="4.5" fill="var(--md-sys-color-surface-container-highest)" />
        <rect x="56" y="32" width="22" height="9" rx="4.5" fill="var(--md-sys-color-primary-container)" /><rect x="80" y="32" width="22" height="9" rx="4.5" fill="var(--md-sys-color-surface-container-highest)" />
        <rect x="56" y="43" width="10" height="7" rx="3.5" fill="var(--md-sys-color-surface-container-highest)" /><rect x="68" y="43" width="10" height="7" rx="3.5" fill="var(--md-sys-color-surface-container-highest)" />
        <rect x="80" y="43" width="10" height="7" rx="3.5" fill="var(--md-sys-color-surface-container-highest)" /><rect x="92" y="43" width="10" height="7" rx="3.5" fill="var(--md-sys-color-surface-container-highest)" />
        <circle cx="72" cy="54" r="1.2" fill="var(--md-sys-color-outline)" /><rect x="76" y="53" width="6" height="2.4" rx="1.2" fill="var(--md-sys-color-primary)" /><circle cx="86" cy="54" r="1.2" fill="var(--md-sys-color-outline)" />
      </g>
      <rect x="0" y="64" width="112" height="8" fill="var(--md-sys-color-outline-variant)" /><rect x="92" y="66" width="14" height="4" rx="1" fill="var(--md-sys-color-outline)" />
    </template>
  </svg>
</template>
