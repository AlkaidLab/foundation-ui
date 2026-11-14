<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import MButton from '../MButton.vue'
import TestPad from './TestPad.vue'
import { KEYBOARD_ARROWS, KEYBOARD_CODES, KEYBOARD_ROWS, MOUSE_BUTTON_NAMES, codeLabel, createKeyTracker, mouseButtons, pollingRate, wheelGauge } from '../../testtools/logic.js'

// 键盘鼠标触控 (and, in the guide, 手柄): a keyboard tester. The keys of a drawn keyboard light up while they are held and stay pale once pressed; the mouse's buttons and wheel and the touch points show in their zones;
// the page keeps its scroll everywhere except inside the wheel zone. Keys are taken only while the pointer is over the keyboard or it has focus (Tab always leaves), so typing elsewhere is never swallowed.
// part: the guide shows the keyboard and the mouse as two tests ('keyboard', 'mouse'); the 测试工具 page shows both in one ('all').
// pad: also show the 手柄 tool below.
const props = defineProps({ T: { type: Object, required: true }, pad: { type: Boolean, default: false }, part: { type: String, default: 'all' } })
const showKb = computed(() => props.part !== 'mouse')
const showMouse = computed(() => props.part !== 'keyboard')
const split = computed(() => props.part !== 'all')
const tracker = createKeyTracker()
const down = ref([])
const seen = reactive(new Set())
const max = ref(0)
const rate = ref(0)
const buttons = ref(0)
const seenButtons = reactive(new Set())
const wheel = ref(0)
const gauge = ref(0)
const touches = reactive({})
const keyboard = ref(null)
const hover = ref(false)
const focus = ref(false)
const active = computed(() => hover.value || focus.value)
let moves = []
let wheelTimer = 0

const sync = () => { down.value = tracker.keys(); max.value = tracker.max }
const keydown = (e) => {
  if (!active.value) return
  if (e.code !== 'Tab') e.preventDefault()
  tracker.down(e.code); seen.add(e.code); sync()
}
const keyup = (e) => { tracker.up(e.code); sync() }
const lose = () => { tracker.clear(); sync(); buttons.value = 0 }
onMounted(() => { window.addEventListener('keydown', keydown, true); window.addEventListener('keyup', keyup, true); window.addEventListener('blur', lose) })
onBeforeUnmount(() => { window.removeEventListener('keydown', keydown, true); window.removeEventListener('keyup', keyup, true); window.removeEventListener('blur', lose); clearTimeout(wheelTimer) })

const isDown = (code) => down.value.includes(code)
const others = computed(() => [...seen].filter((c) => !KEYBOARD_CODES.has(c)))
const downText = computed(() => (down.value.length ? down.value.map(codeLabel).join(' + ') : props.T.input.none))

// the click zone: buttons (including back and forward), the polling rate while the mouse moves, touch points
const pointerMove = (e) => {
  if (e.pointerType === 'mouse') { moves.push(e.timeStamp); if (moves.length > 120) moves.shift(); rate.value = pollingRate(moves); buttons.value = e.buttons }
  else touches[e.pointerId] = { x: e.offsetX, y: e.offsetY }
}
const pointerDown = (e) => {
  e.currentTarget.setPointerCapture?.(e.pointerId)
  if (e.pointerType === 'mouse') { buttons.value = e.buttons; seenButtons.add(MOUSE_BUTTON_NAMES[e.button]) }
  else touches[e.pointerId] = { x: e.offsetX, y: e.offsetY }
}
const pointerUp = (e) => { delete touches[e.pointerId]; if (e.pointerType === 'mouse') buttons.value = e.buttons }
const btn = computed(() => mouseButtons(buttons.value))
const BTN_LABELS = ['left', 'middle', 'right', 'back', 'forward']
const touchList = computed(() => Object.entries(touches))

// the wheel zone: the only place the wheel is taken; the gauge follows the last tick and returns
const onWheel = (e) => {
  wheel.value = Math.round(e.deltaY || e.deltaX)
  gauge.value = wheelGauge(e.deltaY || e.deltaX)
  seenButtons.add('wheel')
  clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { gauge.value = 0 }, 450)
}
const reset = () => { tracker.reset(); seen.clear(); seenButtons.clear(); moves = []; rate.value = 0; wheel.value = 0; gauge.value = 0; sync() }
</script>

<template>
  <section class="m-tt__tool m-kt">
    <p v-if="!split" class="m-tt__note">{{ T.input.note }}</p>

    <div v-if="showKb" class="m-kt__card">
      <div class="m-kt__head">
        <h3 class="m-kt__title">{{ T.input.keyboard }}</h3>
        <span class="m-kt__state" :class="{ 'is-live': active }" role="status">{{ active ? T.input.kbLive : T.input.kbIdle }}</span>
      </div>
      <div ref="keyboard" class="m-kb" :class="{ 'is-live': active }" tabindex="0" role="group" :aria-label="T.input.keyboard" @pointerenter="hover = true" @pointerleave="hover = false" @focus="focus = true" @blur="focus = false">
        <div class="m-kb__rows">
          <div class="m-kb__main">
            <div v-for="(row, r) in KEYBOARD_ROWS" :key="r" class="m-kb__row">
              <template v-for="(k, i) in row" :key="i">
                <span v-if="!Array.isArray(k)" class="m-kb__gap" :style="{ '--w': k }" />
                <span v-else class="m-kb__cell" :style="{ '--w': k[2] }"><i class="m-kb__key" :class="{ 'is-down': isDown(k[0]), 'is-seen': seen.has(k[0]) }" :data-code="k[0]" :data-long="k[1].length > 1 ? '' : null">{{ k[1] }}</i></span>
              </template>
            </div>
          </div>
          <div class="m-kb__arrows">
            <div v-for="(row, r) in KEYBOARD_ARROWS" :key="r" class="m-kb__row">
              <template v-for="(k, i) in row" :key="i">
                <span v-if="!k" class="m-kb__gap" style="--w: 1" />
                <span v-else class="m-kb__cell" style="--w: 1"><i class="m-kb__key" :class="{ 'is-down': isDown(k[0]), 'is-seen': seen.has(k[0]) }" :data-code="k[0]" :data-long="k[1].length > 1 ? '' : null">{{ k[1] }}</i></span>
              </template>
            </div>
          </div>
        </div>
      </div>
      <p class="m-kt__legend">{{ T.input.kbLegend }}</p>
      <p v-if="others.length" class="m-kt__other"><b>{{ T.input.kbOther }}</b> {{ others.map(codeLabel).join(' · ') }}</p>
      <template v-if="split">
        <dl class="m-tt__stats">
          <div><dt>{{ T.input.keys }}</dt><dd>{{ downText }}</dd></div>
          <div><dt>{{ T.input.max }}</dt><dd>{{ max }}</dd></div>
        </dl>
        <div class="m-tt__row"><MButton variant="text" icon="restart_alt" @click="reset">{{ T.reset }}</MButton></div>
      </template>
    </div>

    <div v-if="showMouse" class="m-kt__card">
      <h3 class="m-kt__title">{{ T.input.mouse }}</h3>
      <div class="m-kt__zones">
        <div class="m-kt__zone m-kt__click" :aria-label="T.input.clickZone" @pointermove="pointerMove" @pointerdown="pointerDown" @pointerup="pointerUp" @pointercancel="pointerUp" @pointerleave="touchList.length || (buttons = 0)" @contextmenu.prevent @mousedown.middle.prevent @auxclick.prevent>
          <span class="m-kt__zonename">{{ T.input.clickZone }}</span>
          <div class="m-kt__mouse" aria-hidden="true">
            <i class="m-kt__mbody" /><i class="m-kt__ml" :class="{ 'is-down': btn.left }" /><i class="m-kt__mr" :class="{ 'is-down': btn.right }" /><i class="m-kt__mw" :class="{ 'is-down': btn.middle }" />
            <i class="m-kt__mb" :class="{ 'is-down': btn.back }" /><i class="m-kt__mf" :class="{ 'is-down': btn.forward }" />
          </div>
          <div class="m-kt__btns" role="group" :aria-label="T.input.buttons">
            <span v-for="n in BTN_LABELS" :key="n" class="m-kt__btn" :class="{ 'is-down': btn[n], 'is-seen': seenButtons.has(n) }">{{ T.input[n] }}</span>
          </div>
          <span class="m-kt__hint">{{ T.input.clickHint }}</span>
          <i v-for="[id, p] in touchList" :key="id" class="m-tt__touch" :style="{ left: `${p.x}px`, top: `${p.y}px` }" />
        </div>
        <div class="m-kt__zone m-kt__wheel" :class="{ 'is-on': gauge !== 0 }" :aria-label="T.input.wheelZone" @wheel.prevent="onWheel" @pointermove="pointerMove">
          <span class="m-kt__zonename">{{ T.input.wheelZone }}</span>
          <span class="m-kt__gauge" aria-hidden="true"><i class="m-kt__tick" :style="{ transform: `translateY(${gauge * 46}px)` }" /></span>
          <span class="m-kt__reading"><b>{{ wheel > 0 ? '↓ ' + T.input.wheelDown : wheel < 0 ? '↑ ' + T.input.wheelUp : '' }}</b> {{ wheel }}</span>
          <span class="m-kt__hint">{{ T.input.wheelHint }}</span>
        </div>
      </div>
      <dl class="m-tt__stats">
        <template v-if="!split">
          <div><dt>{{ T.input.keys }}</dt><dd>{{ downText }}</dd></div>
          <div><dt>{{ T.input.max }}</dt><dd>{{ max }}</dd></div>
        </template>
        <div><dt>{{ T.input.rate }}</dt><dd>{{ rate ? `${rate} Hz` : T.input.move }}</dd></div>
        <div><dt>{{ T.input.wheel }}</dt><dd>{{ wheel }}</dd></div>
        <div><dt>{{ T.input.touches }}</dt><dd>{{ touchList.length }}</dd></div>
      </dl>
      <div class="m-tt__row"><MButton variant="text" icon="restart_alt" @click="reset">{{ T.reset }}</MButton></div>
    </div>

    <div v-if="pad && !split" class="m-kt__card">
      <h3 class="m-kt__title">{{ T.input.pad }}</h3>
      <TestPad :T="T" />
    </div>
  </section>
</template>
