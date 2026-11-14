import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * How much room the search has in the caption bar. The bar's two ends are content-sized (the logo, the name, the version and the update line; the actions and the window buttons), the search
 * takes what is left. When what is left cannot show the field with its hint (about 290 px for 「搜索设置、页面、操作…」 and Ctrl K), `tight` is true and the product draws the search as its icon (as on a
 * phone) instead of letting the bar cut the field. The ends do not depend on the search, so the decision cannot flip back and forth.
 */
export const SEARCH_MIN = 290
export const roomFor = ({ bar, lead, end }) => bar - lead - end
export const isTight = (parts, min = SEARCH_MIN) => roomFor(parts) < min

export function useCaptionRoom({ selector = '.m-caption', min = SEARCH_MIN } = {}) {
  const tight = ref(false)
  let resize = null
  let mutate = null
  const measure = () => {
    const bar = document.querySelector(selector)
    if (!bar) return
    const lead = bar.querySelector('.m-caption__lead')
    const last = lead && lead.lastElementChild
    const end = bar.querySelector('.m-caption__end')
    const leadWidth = last && lead ? last.getBoundingClientRect().right - lead.getBoundingClientRect().left : (bar.firstElementChild ? bar.firstElementChild.getBoundingClientRect().width : 0)
    tight.value = isTight({ bar: bar.clientWidth, lead: leadWidth, end: end ? end.getBoundingClientRect().width : 0 }, min)
  }
  onMounted(() => {
    const bar = document.querySelector(selector)
    if (!bar) return
    resize = new ResizeObserver(measure)
    resize.observe(bar)
    mutate = new MutationObserver(measure)
    mutate.observe(bar, { childList: true, subtree: true, characterData: true })
    document.fonts?.ready?.then(measure)
    measure()
  })
  onBeforeUnmount(() => { resize?.disconnect(); mutate?.disconnect() })
  return { tight, measure }
}
