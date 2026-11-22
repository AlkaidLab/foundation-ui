// When the card that is carried over the overview may take the place of the card under the pointer. The swap moves the carried card's slot (the layout is reflowed under the finger), so a
// rule that only asks "is the pointer over another card's middle?" swaps back at once when the reflow puts that card under the pointer again: two or three places traded 3 times in 300 ms
// with a finger resting on the border, each with a frame of the card in the wrong place (measured on the phone viewport, docs/tile-drag.md). Two rules end it:
//  - the card the carried card just took the place of is not swapped with again until the pointer has been outside its middle part (then a deliberate return is a new swap);
//  - and no swap follows another until the pointer has travelled SWAP_TRAVEL_PX from where the last one happened (a finger resting on a border moves less than that).
export const SWAP_TRAVEL_PX = 24

export function createSwapGate({ travel = SWAP_TRAVEL_PX } = {}) {
  let last = '' // the card the carried card took the place of last
  let at = null // where the pointer was then
  return {
    /** may the places be swapped with `id`, the card whose middle part the pointer (x, y) is in? */
    allow(id, x, y) {
      if (!id || id === last) return false
      return !at || Math.hypot(x - at.x, y - at.y) >= travel
    },
    /** the swap with `id` was made with the pointer at (x, y) */
    took(id, x, y) { last = id; at = { x, y } },
    /** after each look at the cards: `under` is the card whose middle part holds the pointer ('' for none); the last one swapped with is released as soon as the pointer is not in it */
    over(under) { if (last && under !== last) last = '' },
    reset() { last = ''; at = null },
  }
}
