import { computed, onMounted, ref, unref } from 'vue'
import { PROJECT_LINKS } from '../about/data.js'
import { applyCommunity, communityUrlsFor, fetchCommunity } from '../community/index.js'

// The project rows of the about page with the community file's addresses over the bundled ones (the README values). One shared state: the file is
// fetched once per start; until it answers, offline or when it is not published, the bundled addresses are what the page shows.
const remote = ref({})
let started = false

async function refresh(force = false, locale = 'en') {
  remote.value = await fetchCommunity({ force, urls: communityUrlsFor(locale) })
}

export function useCommunityLinks({ locale = 'en' } = {}) {
  const links = computed(() => applyCommunity(PROJECT_LINKS, remote.value))
  onMounted(() => { if (!started) { started = true; void refresh(false, unref(locale)) } })
  return { links, refresh: (force = true) => refresh(force, unref(locale)) }
}
