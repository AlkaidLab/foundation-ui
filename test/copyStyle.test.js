import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { scanFile, scanText, listFiles } from '../scripts/copy-lint.mjs'

// docs/copy-style.zh.md: the explaining voice of the interface text (wording that says nothing clearly, talks about the code) and the unit spacing. The brand voice is not checked.
const src = fileURLToPath(new URL('../src/', import.meta.url))
// other languages that share a source file with English or Chinese are not judged by these rules
const OTHER = /\/(de|fr|es|it|ja|ko|ru|pt_BR|pt|bg|cs|pl|sv|tr|uk)(\/|\.js$|\.json$)|devmode\/locales\.js|developer\/locales\.js/
// developer-only pages may say "API" and "endpoint"; every other rule still applies to them
const DEV_ONLY = /\/src\/(devmode|developer|testtools)\//
const allow = (file) => (DEV_ONLY.test(file) ? ['dev-api', 'dev-return', 'dev-en'] : [])

test('the lint catches the explaining voice the team rejected, in Chinese and English', () => {
  const ids = (s) => scanText(s).map((h) => h.rule)
  assert.ok(ids('评论暂时读不到：这个小时的公开额度用完了').includes('zan-shi'))
  assert.ok(ids('评论暂时读不到：这个小时的公开额度用完了').includes('du-bu-dao'))
  assert.ok(ids('这个小时的公开额度用完了').includes('yong-wan'))
  assert.ok(ids('这里没法测').includes('mei-fa'))
  assert.ok(ids('路由器没说').includes('mei-shuo'))
  assert.ok(ids('主机应答了 HTTP 404').includes('ying-da'))
  assert.ok(ids('主机回答了接口').includes('dev-api'))
  assert.ok(ids('接口返回的内容为空').includes('dev-return'))
  assert.ok(ids('码率 22.6Mbps').includes('unit-space'))
  assert.ok(ids('Cached for now').includes('explain-en'))
  assert.ok(ids('The host answered HTTP 404').includes('dev-en'))
  // the accepted wording and legitimate uses pass
  assert.deepEqual(scanText('GitHub 公共访问额度已用尽，登录 GitHub 后可查看最新评论。'), [])
  assert.deepEqual(scanText('22.6 Mbps · 60 fps · 10.3 GB'), [])
  assert.deepEqual(scanText('应用完全无法接收键盘输入'), [])
  assert.deepEqual(scanText('所有网络接口'), [])
  assert.deepEqual(scanText('The GitHub public access limit has been reached.'), [])
})

test('the brand voice is deliberate and passes: the team approved these lines', () => {
  const approved = [
    '杂鱼~ 没有开始串流还在调码率呢', '串流进来再说嘛', '还没有日志记录哦~', '没有找到匹配的日志呢~', '刷新一下',
    '你不能退出!\n那么想退吗? 真拿你没办法呢, 继续点一下吧~\n\n这将同时关闭Sunshine GUI应用程序。', "Wait! Don't Leave Me! T_T", "Nooo! You can't just quit like that!",
    '你找到大家啦！', '回来啦，', '配对成功！', 'Pairing successful!', 'Boom! Stop Sunshine', '还没配好米塔 AI 哦，去「米塔 AI」填个 Key 吧～', 'Drop the image here~', '你好！想玩点什么？',
  ]
  for (const line of approved) assert.deepEqual(scanText(line), [], line)
})

test('no interface text of the shared UI package breaks the copy rules', () => {
  const hits = []
  for (const file of listFiles(src)) {
    if (OTHER.test(file)) continue
    for (const h of scanFile(file, { allow })) hits.push(`${file.replace(src, 'src/')}: [${h.rule}] ${h.text.slice(0, 120)}`)
  }
  assert.deepEqual(hits, [], `copy rule violations (docs/copy-style.zh.md):\n${hits.join('\n')}`)
})

test('the style guide exists and the rules it names are the ones the lint checks', () => {
  const doc = readFileSync(new URL('../docs/copy-style.zh.md', import.meta.url), 'utf8')
  for (const word of ['暂时读不到', '用完了', '杂鱼', '品牌语气', '更新于', '登录 GitHub', '每小时', '术语表']) assert.ok(doc.includes(word), word)
})
