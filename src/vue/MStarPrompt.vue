<script setup>
import MIcon from './MIcon.vue'
import MGithubMark from './MGithubMark.vue'
import MBilibiliMark from './MBilibiliMark.vue'
import { fillText } from './guideTexts.js'
import { BILIBILI } from '../about/data.js'

// The ask for a star: a compact card at the top of the overview (see starCard.js), never a tile of the grid. A clear title, one short line and buttons with the GitHub mark.
//   streaming:   the star of the host (filled) and the star of the client in use (`client`, tonal); the host's alone when that client has no star of its own (a client that is not ours);
//   not streaming: the star of the host and the sponsor entry (the sponsor sheet of 关于: `sponsor` goes to the product).
// 以后再说 hides it until the next stream. The permanent, quiet entries are the star rows of 关于.
//   Both end with 关注 B 站 (the channel, the same address in every language). Every ask is a real button of one height and shape: the star of the host filled, the others filled-tonal
//   (secondary container, with the Bilibili mark and the filled heart at the size of the GitHub mark), 以后再说 a quiet text button at the far right.
//   texts: { title, sub, action: 'Star {name}', later, sponsor, bilibili }     host, client: { name, url }     streaming: boolean
defineProps({
  texts: { type: Object, default: () => ({}) },
  host: { type: Object, required: true },
  client: { type: Object, default: null },
  streaming: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'later', 'sponsor'])
</script>

<template>
  <section class="m-sprompt" role="region" :aria-label="texts.title">
    <span class="m-sprompt__ico"><MIcon name="star" fill /></span>
    <div class="m-sprompt__text"><h3>{{ texts.title }}</h3><p>{{ texts.sub }}</p></div>
    <div class="m-sprompt__btns">
      <template v-if="streaming">
        <button type="button" class="m-sprompt__btn m-sprompt__btn--fill" data-star="host" @click="emit('open', host.url)"><MGithubMark />{{ fillText(texts.action, { name: host.name }) }}</button>
        <button v-if="client" type="button" class="m-sprompt__btn" data-star="client" @click="emit('open', client.url)"><MGithubMark />{{ fillText(texts.action, { name: client.name }) }}</button>
      </template>
      <template v-else>
        <button type="button" class="m-sprompt__btn m-sprompt__btn--fill" data-star="host" @click="emit('open', host.url)"><MGithubMark />{{ fillText(texts.action, { name: host.name }) }}</button>
        <button type="button" class="m-sprompt__btn" data-star="sponsor" @click="emit('sponsor')"><MIcon name="favorite" fill />{{ texts.sponsor }}</button>
      </template>
      <button v-if="texts.bilibili" type="button" class="m-sprompt__btn" data-star="bilibili" @click="emit('open', BILIBILI.url)"><MBilibiliMark />{{ texts.bilibili }}</button>
      <button type="button" class="m-sprompt__later" @click="emit('later')">{{ texts.later }}</button>
    </div>
  </section>
</template>
