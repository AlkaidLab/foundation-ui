// Loaded by every test run (node --import): no unit test may reach the real release-metadata hosts. The global fetch is replaced by one that refuses requests to
// alkaidlab.com / alkaidlab.cn and records them; a recorded request fails the run at exit. Tests inject their own fetch; this is the net under them.
const HOST = /^https?:\/\/([^/]+\.)?alkaidlab\.(com|cn)(\/|$)/i
const seen = (globalThis.__alkRequests = globalThis.__alkRequests || [])
const real = globalThis.fetch
globalThis.fetch = function guardedFetch(input, init) {
  const url = String(input && typeof input === 'object' && 'url' in input ? input.url : input)
  if (HOST.test(url)) {
    seen.push(url)
    return Promise.reject(new TypeError(`a test reached ${url}: inject a fetch`))
  }
  return real ? real.call(this, input, init) : Promise.reject(new TypeError('no fetch'))
}
process.on('exit', (code) => {
  if (seen.length && code === 0) {
    console.error(`\nFAIL: ${seen.length} request(s) to the real hosts from the tests:\n${seen.join('\n')}`)
    process.exitCode = 1
  }
})
