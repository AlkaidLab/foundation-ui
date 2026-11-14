// The size a pixel-art avatar is drawn at so that every source pixel becomes a whole number of device pixels (crisp edges, no blur, no uneven pixels).
//   grid: the source's side in pixels (a 16 x 16 sprite), box: the most CSS pixels the button may give it, dpr: the screen's device pixel ratio.
// Returns { scale, css }: `scale` device pixels per source pixel (at least 1), `css` the side to draw it at in CSS pixels. Where even one device pixel per source pixel does
// not fit the box, it is still drawn at one (the box then is a little exceeded rather than the sprite blurred).
export function pixelSize(grid = 16, box = 32, dpr = 1) {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  const scale = Math.max(1, Math.floor((box * ratio) / grid))
  return { scale, css: Math.round(((grid * scale) / ratio) * 1000) / 1000 }
}

/** The state of the avatar: 'thinking' while a reply is being made, 'answer' while one waits unread, else 'idle'. */
export const avatarState = ({ thinking = false, unread = false } = {}) => (thinking ? 'thinking' : unread ? 'answer' : 'idle')
