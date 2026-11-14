<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MButton from './MButton.vue'
import MIconButton from './MIconButton.vue'
import MGithubMark from './MGithubMark.vue'
import { FRIENDS, FRIEND_FRAMES, FRIEND_HEIGHT, FRIEND_WIDTH, badgeBox, friendLine, friendSheet } from '../about/friends.js'
import { avatarImage } from '../about/avatars.js'
import { FOUNDER, TEAM_SPONSORS } from '../about/data.js'

// The pixel friends: one small figure per member of the team walks along the bottom edge of the window, now and then says a short line, and a
// click shows who it is with the GitHub and sponsor links. The about page shows them only after an easter egg, and only while it is open.
// A friend is the shared pixel body in the member's colours with the member's own GitHub avatar as a round badge for a head: the bundled image,
// cropped to a circle with an outline (never redrawn). The badge is outside the part that turns at each end, so the avatar is never mirrored.
// Cost: every motion is a CSS animation of a transform (the walk, the turn, the four frames of the strip, the bob of the badge in step with them),
// so the compositor runs it with no layout and no paint per frame. While the window is hidden the animations and the line timer stop; under reduced motion (动画 减少, or the
// system's setting when 动画 follows it) the figures stand still in a row at the end of the edge.
const props = defineProps({
  locale: { type: String, default: 'en' },
  /** the about texts (founder, follow, sponsorAfdian, friendsLabel, friendClose) */
  texts: { type: Object, required: true },
})
const emit = defineEmits(['open'])

const SCALE = 2 // CSS pixels per sprite pixel: a 64 x 80 figure, a 42 px avatar (96 px file at 1x and 2x)
const CARD_SCALE = 3 // the figure in the card: a 63 px avatar, the 256 px file on a dense screen
const PACES = [36, 43, 39, 47] // seconds for one crossing: each its own, so they never march in step
const STARTS = [0.05, 0.62, 0.3, 0.85] // where each is on its way when they appear (a share of the crossing)
// the 96 px file, and the 256 px one of the same avatar for the browser to take where the badge needs more pixels (a card, a dense or zoomed screen)
const avatarOf = (friend) => avatarImage(friend.avatar.sd)
const BADGE = badgeBox(SCALE)
const CARD_BADGE = badgeBox(CARD_SCALE)
const badgeStyle = (b) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.size}px`, height: `${b.size}px`, borderWidth: `${b.ring}px` })
const walkers = FRIENDS.map((friend, i) => ({
  friend,
  sheet: friendSheet(friend),
  avatar: avatarOf(friend),
  night: friendSheet(friend, { halo: 'rgba(255, 255, 255, 0.35)' }), // a light rim for dark pages
  url: `https://github.com/${friend.login}`,
  sponsor: TEAM_SPONSORS[friend.login] || '',
  founder: friend.login === FOUNDER,
  ring: friend.palette.k,
  style: { '--m-friend-s': `${SCALE}px`, '--m-friend-w': `${FRIEND_WIDTH * SCALE}px`, '--m-friend-d': `${PACES[i % PACES.length]}s`, '--m-friend-at': `${-STARTS[i % STARTS.length] * 2 * PACES[i % PACES.length]}s`, '--m-friend-i': i, '--m-friend-n': FRIENDS.length },
}))
const H = FRIEND_HEIGHT * SCALE

const hidden = ref(typeof document !== 'undefined' && document.hidden)
const talk = ref({ i: -1, text: '', side: 'center' })
const picked = ref(-1)
const card = ref({ left: 0 })
const root = ref(null)
const cardEl = ref(null)
const paused = computed(() => hidden.value || picked.value >= 0)

// a line every 6 to 10 seconds from one friend (never the one whose card is open), shown for 3.4 seconds; nothing while the window is hidden
let sayTimer = 0
let quietTimer = 0
let turn = 0
const sideOf = (el) => {
  const r = el?.getBoundingClientRect?.()
  if (!r) return 'center'
  return r.left < 120 ? 'start' : r.right > window.innerWidth - 120 ? 'end' : 'center'
}
function say(i) {
  const w = walkers[i]
  if (!w) return
  const el = root.value?.querySelectorAll('.m-friend')[i]
  talk.value = { i, text: friendLine(w.friend, props.locale, turn++), side: sideOf(el) }
  clearTimeout(quietTimer); quietTimer = setTimeout(() => { talk.value = { i: -1, text: '', side: 'center' } }, 3400)
}
function schedule(first = false) {
  clearTimeout(sayTimer)
  if (hidden.value) return
  sayTimer = setTimeout(() => {
    const pool = walkers.map((_, i) => i).filter((i) => i !== picked.value && i !== talk.value.i)
    if (pool.length) say(pool[Math.floor(Math.random() * pool.length)])
    schedule()
  }, first ? 1200 : 6000 + Math.random() * 4000)
}

async function pick(i, event) {
  if (picked.value === i) { picked.value = -1; return }
  const r = event.currentTarget.getBoundingClientRect()
  const width = 288
  card.value = { left: Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2)) }
  picked.value = i
  await nextTick()
  cardEl.value?.querySelector('button')?.focus({ preventScroll: true })
}
const close = () => { picked.value = -1 }
const onKey = (e) => { if (e.key === 'Escape' && picked.value >= 0) { e.stopPropagation(); close() } }
const onDown = (e) => { if (picked.value >= 0 && !root.value?.contains(e.target)) close() }
const onVisibility = () => { hidden.value = document.hidden; if (hidden.value) { clearTimeout(sayTimer); talk.value = { i: -1, text: '', side: 'center' } } else schedule() }

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  document.addEventListener('keydown', onKey, true)
  document.addEventListener('pointerdown', onDown, true)
  schedule(true)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  document.removeEventListener('keydown', onKey, true)
  document.removeEventListener('pointerdown', onDown, true)
  clearTimeout(sayTimer); clearTimeout(quietTimer)
})
const open = (url) => { emit('open', url); close() }
const current = computed(() => walkers[picked.value] || null)
</script>

<template>
  <Teleport to="body">
    <div ref="root" class="m-friends" :class="{ 'is-paused': paused }" role="group" :aria-label="texts.friendsLabel">
      <div v-for="(w, i) in walkers" :key="w.friend.login" class="m-friend" :class="{ 'is-picked': picked === i }" :style="w.style">
        <Transition name="m-friend-bubble"><p v-if="talk.i === i" :key="talk.text" class="m-friend__bubble" :class="`m-friend__bubble--${talk.side}`" role="status">{{ talk.text }}</p></Transition>
        <button type="button" class="m-friend__body" :aria-label="w.friend.login" :aria-expanded="picked === i" :style="{ height: `${H}px` }" @click="pick(i, $event)">
          <span class="m-friend__face"><img class="m-friend__strip m-friend__strip--day" :src="w.sheet" alt="" :width="FRIEND_WIDTH * FRIEND_FRAMES * SCALE" :height="H" draggable="false" decoding="async" /><img class="m-friend__strip m-friend__strip--night" :src="w.night" alt="" :width="FRIEND_WIDTH * FRIEND_FRAMES * SCALE" :height="H" draggable="false" decoding="async" /></span>
          <img class="m-friend__badge" :src="w.avatar.src" :srcset="w.avatar.srcset || undefined" :sizes="`${BADGE.inner}px`" alt="" :style="{ ...badgeStyle(BADGE), borderColor: w.ring }" draggable="false" decoding="async" />
        </button>
      </div>
      <Transition name="m-friend-card">
        <div v-if="current" ref="cardEl" class="m-friend-card" role="dialog" :aria-label="current.friend.login" :style="{ left: `${card.left}px` }">
          <span class="m-friend-card__figure" aria-hidden="true">
            <img class="m-friend-card__body" :src="current.sheet" alt="" :width="FRIEND_WIDTH * FRIEND_FRAMES * CARD_SCALE" :height="FRIEND_HEIGHT * CARD_SCALE" draggable="false" />
            <img class="m-friend__badge m-friend-card__badge" :src="current.avatar.src" :srcset="current.avatar.srcset || undefined" :sizes="`${CARD_BADGE.inner}px`" alt="" :style="{ ...badgeStyle(CARD_BADGE), borderColor: current.ring }" draggable="false" />
          </span>
          <div class="m-friend-card__id">
            <p class="m-friend-card__name">{{ current.friend.login }}</p>
            <span v-if="current.founder" class="m-about__tag">{{ texts.founder }}</span>
          </div>
          <MIconButton class="m-friend-card__close" icon="close" :label="texts.friendClose" @click="close" />
          <div class="m-friend-card__actions">
            <MButton variant="tonal" size="sm" @click="open(current.url)"><MGithubMark :size="16" />{{ texts.follow }}</MButton>
            <MButton v-if="current.sponsor" variant="text" size="sm" icon="favorite" @click="open(current.sponsor)">{{ texts.sponsorAfdian }}</MButton>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
