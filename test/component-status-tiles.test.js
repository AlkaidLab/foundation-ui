import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { ICONS } from '../src/icons/icons.js'

test('overview component tiles distinguish warnings, errors and optional components', async (t) => {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [vue()],
  })
  t.after(() => server.close())
  const { default: MDashCardView } = await server.ssrLoadModule('/src/vue/MDashCardView.vue')
  const { default: MComponentStatus } = await server.ssrLoadModule('/src/vue/MComponentStatus.vue')
  const { createComponentStatus, registerComponentStatus } = await server.ssrLoadModule('/src/status/controller.js')
  const { setBold } = await server.ssrLoadModule('/src/vue/tiles/registry.js')
  const render = async (component, props) => (await renderToString(createSSRApp(component, props))).replace(/<!--[\s\S]*?-->/g, '')

  let vulkan = null
  const status = registerComponentStatus(createComponentStatus({ sources: { vulkan: async () => vulkan } }))
  t.after(() => { setBold(true); registerComponentStatus(null) })
  const cases = [
    [{ artifacts_installed: false }, 'neutral', 'download'],
    [{ artifacts_installed: true, display_available: false }, 'warn', 'warning'],
    [{ artifacts_installed: true, state: 'error' }, 'error', 'error'],
    [{ artifacts_installed: true, display_available: true }, 'ok', 'check_circle'],
    [null, 'neutral', 'help'],
  ]

  for (const [raw, tone, icon] of cases) {
    vulkan = raw
    await status.refresh(['vulkan'])
    const glyph = ICONS[icon]
    const hasIcon = (html, path) => assert.ok(html?.includes(`d="${path}"`), `expected ${icon} icon`)
    const chipClass = tone === 'neutral' ? 'm-chip' : `m-chip m-chip--${tone}`
    const page = await render(MComponentStatus, { status })
    const row = page.match(/<article[^>]*data-component="vulkan"[\s\S]*?<\/article>/)?.[0]
    hasIcon(row?.split(`<span class="${chipClass}">`)[1]?.split('</span>')[0], glyph.f || glyph.d)

    for (const size of ['s', 'm']) {
      const card = { id: 'comp:vulkan', kind: 'component', title: 'Vulkan HDR', data: { id: 'vulkan' }, size }
      setBold(true)
      const tile = await render(MDashCardView, { card })
      hasIcon(tile.match(/<span class="m-b2__state">[\s\S]*?<\/span>/)?.[0], glyph.d)
      assert.match(tile, new RegExp(`<div class="m-b2plate[^"]*" data-tone="${tone}"`))

      setBold(false)
      const fallback = await render(MDashCardView, { card })
      if (size === 's') {
        assert.match(fallback, /class="[^\"]*\bm-dsmall--component\b/)
        hasIcon(fallback.match(new RegExp(`<div class="m-dsmall__avatars"[^>]*><i class="is-${tone}">[\\s\\S]*?<\\/i>`))?.[0], glyph.d)
      } else {
        hasIcon(fallback.split(`<span class="${chipClass}">`)[1]?.split('</span>')[0], glyph.f || glyph.d)
      }
    }
  }
})
