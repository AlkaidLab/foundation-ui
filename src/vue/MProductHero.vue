<script setup>
import MMascot from './MMascot.vue'
import { PRODUCT } from '../about/data.js'

// The product's hero card, one component for the About page and the first screen of the first-run flow: 薇薇, the name and the slogan, centred on the card colour
// (the look `a` of MAbout; its styles are the `m-about__top--a` rules of about.css, nothing is restated here). The default slot is the row of actions under the slogan.
// `mascot` is the size of 薇薇 in px: the About page draws her at 96, the first screen where room is short a little smaller; the type and the padding are the same.
defineProps({ slogan: { type: String, required: true }, mascot: { type: Number, default: 96 } })
</script>

<template>
  <section class="m-about__top m-about__top--a" :aria-label="PRODUCT.name">
    <MMascot class="m-about__mascot m-about__mascot--plain" :size="mascot" :style="mascot === 96 ? undefined : { width: `${mascot}px`, height: `${mascot}px` }" />
    <div class="m-about__id">
      <h2 class="m-about__name">{{ PRODUCT.name }}</h2>
      <p class="m-about__slogan">{{ slogan }}</p>
      <div v-if="$slots.default" class="m-about__actions"><slot /></div>
    </div>
  </section>
</template>
