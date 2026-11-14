<script setup>
import MIcon from './MIcon.vue'
import { fillText } from './guideTexts.js'

// The recommendation of a client (see clientPrompt.js), in the place and the shape of the star card: an icon, a title, one short line, ONE button that opens the client download page of this application
// (on the recommended system when it is known) and 以后再说.
//   texts: { title, line: '{app} · {os}: {names}', lineAny, download, later }     rec: { app, os, osWord, options: [{ id, label }], platform }
defineProps({
  texts: { type: Object, default: () => ({}) },
  rec: { type: Object, required: true },
})
const emit = defineEmits(['open', 'later'])
const names = (rec) => rec.options.map((o) => o.label).join(' · ')
</script>

<template>
  <section class="m-sprompt m-cprompt" role="region" :aria-label="texts.title">
    <span class="m-sprompt__ico m-cprompt__ico"><MIcon name="devices" fill /></span>
    <div class="m-sprompt__text"><h3>{{ texts.title }}</h3><p>{{ rec.os ? fillText(texts.line, { app: rec.app, os: rec.osWord, names: names(rec) }) : fillText(texts.lineAny, { app: rec.app }) }}</p></div>
    <div class="m-sprompt__btns">
      <button type="button" class="m-sprompt__btn m-sprompt__btn--fill" data-rec="download" @click="emit('open', rec)"><MIcon name="download" />{{ texts.download }}</button>
      <button type="button" class="m-sprompt__later" @click="emit('later')">{{ texts.later }}</button>
    </div>
  </section>
</template>
