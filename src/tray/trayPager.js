// The geometry of the V3 pager (MTrayMenu), kept apart from the component so that it can be tested without a browser.
//
// The track holds every page side by side, each exactly as wide as the viewport (flex: 0 0 100%), so the page `index` rests at -index x 100 % of the track, whose width IS the viewport's. The finger adds
// `dx` px. Percent, not a stored pixel width: the engine measures the viewport at the moment of the paint, so a window resize, a 125 / 150 / 225 % display scale or a width that is no whole pixel
// (360.4 css px) can never leave the track at the width of an earlier measure.
export const trackTransform = (index, dx = 0) => `translateX(calc(${-index * 100}% + ${dx}px))`

// The track's offset in px for a viewport `width` wide (what trackTransform asks the engine for), and where the page `index` then lies against the viewport's left edge when the viewport has been scrolled
// `scrollLeft` px: 0 is a page that sits exactly in the viewport. At rest (dx 0, scrollLeft 0) that is 0 for every page, at every width.
export const trackOffset = (index, width, dx = 0) => -index * width + dx
export const pageLeft = (index, width, dx = 0, scrollLeft = 0) => index * width + trackOffset(index, width, dx) - scrollLeft

// The viewport (overflow: hidden) is still a scroll container: an element inside it that is focused, or scrolled to, makes the engine scroll the viewport to show it. The page that is on is moving into
// view along the track at that moment, so the engine finds its first button off to the side and scrolls the viewport sideways by that distance (272 px with the V3 pills): the track is where it should be
// and the pages are shifted against the viewport for good. The viewport must never be scrolled sideways: its scrollLeft is always this.
export const alignedScrollLeft = 0

// The vertical-only "nearest" scroll for a focused control: the scrollTop that shows it in the viewport (a column that scrolls when the page is taller than the window). Focus is given with
// preventScroll and then this is applied to scrollTop alone, so a focus never moves anything sideways.
export function nearestScrollTop({ top, bottom, viewTop, viewBottom, scrollTop }) {
  if (top < viewTop) return scrollTop - (viewTop - top)
  if (bottom > viewBottom) return scrollTop + Math.min(bottom - viewBottom, top - viewTop) // taller than the view: its top at the view's top
  return scrollTop
}
