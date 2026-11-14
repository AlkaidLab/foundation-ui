// Prints the old→new mapping table of 显示与视频 from code (src/settings/displayTree.js): every setting key of the former pages, where it was, where it is now.
//   node scripts/display-mapping.mjs            Chinese text table
//   node scripts/display-mapping.mjs --json     the rows as JSON
import { DISPLAY_TREE, displayMapping } from '../src/settings/displayTree.js'
import { LABELS } from '../src/settings/labels.js'
import { SEARCH_INDEX } from '../src/settings/searchIndex.js'
import { displayTreeTexts } from '../src/settings/displayTreeTexts.js'

const zh = LABELS.zh
const en = LABELS.en
const T = displayTreeTexts('zh')
const OLD = { modes: '分辨率、帧率与码率', output: '显示输出', encoders: '编码器', video: '捕获与视频', hdr: 'HDR', virtual: '杂鱼虚拟显示器', audio: '音频' }
const placeName = (id) => { const k = DISPLAY_TREE.find((p) => p.place === id)?.labelKey; return zh[k] || en[k] || id }
const titleOf = (key) => { const e = SEARCH_INDEX.find((x) => x.id === key); return (e && (zh[e.title] || en[e.title])) || '' }
const rows = displayMapping().map((r) => ({ key: r.key, title: titleOf(r.key), from: OLD[r.from] || r.from, place: placeName(r.to.place), section: T.sections[r.to.place]?.[r.to.section] || r.to.section }))
if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1))
else {
  const pad = (s, n) => String(s) + ' '.repeat(Math.max(1, n - [...String(s)].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1), 0)))
  console.log(`${pad('设置键', 36)}${pad('名称', 30)}${pad('原位置', 22)}新位置`)
  for (const r of rows) console.log(`${pad(r.key, 36)}${pad(r.title, 30)}${pad(r.from, 22)}${r.place} › ${r.section}`)
  console.log(`\n共 ${rows.length} 个键，每个键在新树中恰好出现一次（test/displaytree.test.js 验证）。`)
}
