<script setup>
import { computed } from 'vue'
import MIcon from './MIcon.vue'

// The displays as cards, the way Windows arranges them: a monitor drawn at the shape of its screen, its name and one line under it. 自动 is first,
// then 基地虚拟显示器, then each physical display. One of them is chosen (a radio group for the keyboard); the main display carries a star.
const model = defineModel({ type: String, default: '' })
const props = defineProps({
  /** [{ id, kind: 'auto' | 'virtual' | 'physical', title, text?, size?: '2560x1440', primary?, off?: Boolean }] */
  items: { type: Array, required: true },
  label: { type: String, default: '' },
  primaryLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const ratio = (item) => {
  const m = /^(\d+)\s*[x×]\s*(\d+)$/.exec(String(item.size || ''))
  return m && Number(m[2]) > 0 ? Math.min(2.4, Math.max(1.1, Number(m[1]) / Number(m[2]))) : 16 / 9
}
const cards = computed(() => props.items.map((item) => ({ ...item, ratio: ratio(item), icon: item.kind === 'auto' ? 'bolt' : item.kind === 'virtual' ? 'tv_gen' : 'monitor' })))
function onKey(event, index) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step) return
  event.preventDefault()
  const list = props.items.filter((i) => !i.off)
  const at = list.findIndex((i) => i.id === props.items[index].id)
  const next = list[(at + step + list.length) % list.length]
  model.value = next.id
  event.currentTarget.parentElement.querySelectorAll('button')[props.items.indexOf(next)]?.focus()
}
</script>

<template>
  <div class="m-dcards" role="radiogroup" :aria-label="label">
    <button
      v-for="(card, index) in cards" :key="card.id" type="button" role="radio" class="m-dcards__card"
      :class="[`is-${card.kind}`, { 'is-on': card.id === model, 'is-off': card.off }]" :aria-checked="card.id === model" :tabindex="card.id === model || (!model && index === 0) ? 0 : -1"
      :disabled="disabled || card.off" @click="model = card.id" @keydown="onKey($event, index)"
    >
      <span class="m-dcards__screen" :style="{ aspectRatio: card.ratio }"><MIcon :name="card.icon" fill /><b v-if="card.size">{{ card.size.replace('x', '×') }}</b></span>
      <span class="m-dcards__stand" aria-hidden="true" />
      <span class="m-dcards__title" data-redact="serial">{{ card.title }}</span>
      <small v-if="card.text" class="m-dcards__text" data-redact="serial">{{ card.text }}</small>
      <MIcon v-if="card.primary" class="m-dcards__star" name="star" fill :title="primaryLabel" />
      <MIcon v-if="card.id === model" class="m-dcards__mark" name="check_circle" fill />
    </button>
  </div>
</template>

<style>
.m-dcards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 168px), 1fr)); gap: 8px; }
.m-dcards__card { all: unset; box-sizing: border-box; position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 12px 14px; border-radius: 28px; background: var(--m-card); color: var(--md-sys-color-on-surface); cursor: pointer; transition: background-color .2s, border-radius .2s, transform .2s; }
.m-dcards__card:hover { background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, var(--m-card)); border-radius: 22px; }
.m-dcards__card:active { border-radius: 16px; transform: scale(.98); }
.m-dcards__card:focus-visible { outline: 2px solid var(--md-sys-color-primary); outline-offset: 2px; }
.m-dcards__card:disabled { opacity: .38; cursor: not-allowed; }
.m-dcards__card.is-on { background: color-mix(in srgb, var(--md-sys-color-primary) 16%, var(--m-card)); }
.m-dcards__screen { box-sizing: border-box; display: grid; place-items: center; align-content: center; gap: 2px; width: min(100%, 132px); max-height: 84px; border-radius: 10px; border: 2px solid var(--md-sys-color-outline); background: color-mix(in srgb, var(--md-sys-color-on-surface) 6%, transparent); color: var(--md-sys-color-on-surface-variant); font-size: 26px; }
.m-dcards__screen b { font: var(--m-label-small, 500 11px/14px sans-serif); font-variant-numeric: tabular-nums; }
.m-dcards__card.is-on .m-dcards__screen { border-color: var(--md-sys-color-primary); background: color-mix(in srgb, var(--md-sys-color-primary) 16%, transparent); color: var(--md-sys-color-primary-text); }
.m-dcards__card.is-auto .m-dcards__screen { border-style: dashed; }
.m-dcards__stand { width: 36px; height: 4px; border-radius: 2px; background: var(--md-sys-color-outline); margin-top: -2px; }
.m-dcards__title { max-width: 100%; margin-top: 6px; font: var(--m-title-small, 600 14px/20px sans-serif); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-dcards__text { max-width: 100%; font: var(--m-body-small, 400 12px/16px sans-serif); color: var(--md-sys-color-on-surface-variant); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-dcards__star { position: absolute; top: 12px; left: 14px; font-size: 18px; color: var(--md-sys-color-tertiary, var(--md-sys-color-primary-text)); }
.m-dcards__mark { position: absolute; top: 12px; right: 14px; font-size: 22px; color: var(--md-sys-color-primary-text); }
</style>
