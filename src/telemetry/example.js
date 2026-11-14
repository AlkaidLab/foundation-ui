/**
 * A real example of what a usage statistic is: the event of a page change as the Web UI and the control panel send it (events.js `track.pageView`: the name of the page and how long it took to show it;
 * the version, system and channel that split the numbers go with every batch). It is shown in the privacy page so the person sees the whole thing.
 */
export const usageExample = ({ version = '', os = '', channel = 'stable' } = {}) => ({
  event: 'panel_page',
  page: 'display-modes',
  time_to_content_ms: 180,
  app_version: version || '2026.1110.004928',
  os: os || 'Windows',
  channel,
})
