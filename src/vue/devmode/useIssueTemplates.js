import { ref, watch } from 'vue'
import { looksLikeForm } from '../../devmode/issueForm.js'

// The live Issue Forms of a repository for the reader: read once per repository while the window lives (the client keeps them six hours), and only when an issue looks like a form. A repository that has no templates
// (or cannot be read now) is not asked again; the reader then uses the built-in ones.
const tried = new Map()
export function useIssueTemplates(getClient, getItem) {
  const live = ref([])
  watch(() => [getItem().repo, getItem().kind, looksLikeForm(getItem().body)], async ([repo, kind, maybe]) => {
    live.value = []
    const client = getClient()
    if (!maybe || kind === 'pr' || typeof client?.templates !== 'function') return
    if (!tried.has(repo)) tried.set(repo, client.templates(repo).then((r) => (r.state === 'ok' ? r.items : (tried.delete(repo), []))).catch(() => (tried.delete(repo), [])))
    const items = await tried.get(repo)
    if (getItem().repo === repo) live.value = items
  }, { immediate: true })
  return live
}
export const forgetIssueTemplates = () => tried.clear()
