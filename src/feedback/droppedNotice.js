import { droppedWhy } from './texts.js'

/**
 * The notice of a kept report that was given up on (the options of notify.system): its reference and why in words; 重新反馈 only where the feedback panel is mounted (`hosted`), since pressing it
 * opens that panel and a host without it would show nothing.
 */
export function droppedNotice(info, ref, W, { hosted = false, again = () => {} } = {}) {
  return {
    tone: 'warn', icon: 'error', dismissible: true, revision: info.id,
    title: `${W.droppedTitle} #${ref}`, text: droppedWhy(W, info),
    ...(hosted ? { actions: [{ id: 'again', label: W.droppedAction, onClick: again }] } : {}),
  }
}
