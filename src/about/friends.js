// The pixel friends of the about page: one small walker per member of the team, in team order.
// Original pixel art made for this project: one body, drawn here by hand, shared by everyone in each member's own colours. The head is a round badge
// of the member's GitHub avatar: the bundled file itself (src/about/avatars), cropped to a circle with an outline, never redrawn or traced.
// The body is 32 x 40 sprite pixels in four walk frames (a step, the pass, the other step, the pass); `dy` is how far the body sits down in a frame,
// and the badge bobs with it. `friendSheet` turns the body into one SVG strip of the four frames (rectangles of runs, built once); the page steps
// through it with a transform and moves the badge with a transform, so a walking friend costs no layout and no paint per frame.

export const FRIEND_WIDTH = 32
export const FRIEND_HEIGHT = 40
export const FRIEND_FRAMES = 4
/** The avatar badge in sprite pixels: its centre and radius while the body is up (`dy` 0); the outline ring is one pixel outside the radius. */
export const BADGE = Object.freeze({ cx: 16, cy: 11.5, r: 10.5, ring: 1 })

const freeze = (o) => Object.freeze(o)
/** The shared body: four frames of palette letters ('.' is empty): k outline, b body, B its shade, w belly, a scarf, A its shade, m mittens, l legs, o shoes. */
export const BODY = freeze([
  freeze({ dy: 1, rows: freeze([
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '.........kkkkkkkkkkkkkkk........',
    '........kaaaaaaaaaaaaaaak.......',
    '........kaaaaaaaaaaaaaaak.......',
    '.....kk..kaaabbbbbbbbbkk.kk.....',
    '....kBBkkBaaabbbbbbbbbbkkbbk....',
    '....kBBkkBaaabbwwwwbbbbkkbbk....',
    '....kBBkBBbAAbwwwwwwbbbbkbbk....',
    '....kBBkkBbbbwwwwwwwwbbkkbbk....',
    '...kmmmkkBbbbwwwwwwwwbbkkmmmk...',
    '...kmmmk.kbbbbwwwwwwbbk.kmmmk...',
    '....kkk..klbbbbwwwwbbk...kkk....',
    '.........kllkbbbbbbllk..........',
    '.........kllkkkkkkkllk..........',
    '.........koook....koook.........',
    '........kooook...kooook.........',
    '........kooook...kooook.........',
    '.........kkkk.....kkkk..........',
    '................................',
  ]) }),
  freeze({ dy: 0, rows: freeze([
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '.........kkkkkkkkkkkkkkk........',
    '........kaaaaaaaaaaaaaaak.......',
    '........kaaaaaaaaaaaaaaak.......',
    '......kk.kaaabbbbbbbbbkkkk......',
    '.....kBBkBaaabbbbbbbbbbkbbk.....',
    '.....kBBkBaaabbwwwwbbbbkbbk.....',
    '.....kBBBBbAAbwwwwwwbbbbbbk.....',
    '.....kBBkBbbbwwwwwwwwbbkbbk.....',
    '....kmmmkBbbbwwwwwwwwbbkmmmk....',
    '....kmmmkkbbbbwwwwwwbbkkmmmk....',
    '.....kkk..kbbbbwwwwbbk..kkk.....',
    '...........klbbbbbblk...........',
    '...........koookkkllk...........',
    '..........kooook.kllk...........',
    '..........kooook.koook..........',
    '...........kkkk.kooook..........',
    '................kooook..........',
    '.................kkkk...........',
    '................................',
  ]) }),
  freeze({ dy: 1, rows: freeze([
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '.........kkkkkkkkkkkkkkk........',
    '........kaaaaaaaaaaaaaaak.......',
    '........kaaaaaaaaaaaaaaak.......',
    '.......kkkaaabbbbbbbbbkkk.......',
    '......kBBBaaabbbbbbbbbbbbk......',
    '......kBBBaaabbwwwwbbbbbbk......',
    '......kBBBbAAbwwwwwwbbbbbk......',
    '......kBBBbbbwwwwwwwwbbbbk......',
    '.....kmmmBbbbwwwwwwwwbbmmmk.....',
    '.....kmmmkbbbbwwwwwwbbkmmmk.....',
    '......kkk.kbbbbwwwwbbk.kkk......',
    '...........kkbbbbbbkk...........',
    '............kllkllk.............',
    '............kooooook............',
    '...........koooooook............',
    '...........koooooook............',
    '............kkkkkkk.............',
    '................................',
  ]) }),
  freeze({ dy: 0, rows: freeze([
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '.........kkkkkkkkkkkkkkk........',
    '........kaaaaaaaaaaaaaaak.......',
    '........kaaaaaaaaaaaaaaak.......',
    '......kk.kaaabbbbbbbbbkkkk......',
    '.....kBBkBaaabbbbbbbbbbkbbk.....',
    '.....kBBkBaaabbwwwwbbbbkbbk.....',
    '.....kBBBBbAAbwwwwwwbbbbbbk.....',
    '.....kBBkBbbbwwwwwwwwbbkbbk.....',
    '....kmmmkBbbbwwwwwwwwbbkmmmk....',
    '....kmmmkkbbbbwwwwwwbbkkmmmk....',
    '.....kkk..kbbbbwwwwbbk..kkk.....',
    '...........klbbbbbblk...........',
    '...........kllkkkkoook..........',
    '...........kllk.kooook..........',
    '...........koookkooook..........',
    '..........kooook.kkkk...........',
    '..........kooook................',
    '...........kkkk.................',
    '................................',
  ]) }),
])

export const FRIENDS = freeze([
  // qiin2333: ocean blue with a white scarf
  freeze({
    login: 'qiin2333',
    avatar: freeze({ sd: '2795904.jpg', hd: '2795904-256.jpg' }), // 96 px and 256 px files of the same GitHub avatar
    palette: freeze({ b: '#3f8fd8', B: '#2b67a8', a: '#f3f7fb', A: '#c6d3e2', m: '#f3f7fb', o: '#24354f', l: '#24354f', w: '#e6f4ff', k: '#14243a' }),
    lines: freeze([freeze({ zh: '虚拟显示器交给 ZakoDisplay。', en: 'ZakoDisplay takes care of the virtual screen.' }), freeze({ zh: '手机上试试 Moonlight V+？', en: 'Try Moonlight V+ on your phone?' }), freeze({ zh: '串流愉快！', en: 'Happy streaming!' })]),
  }),
  // Yundi339: slate grey with a blue scarf
  freeze({
    login: 'Yundi339',
    avatar: freeze({ sd: '38252824.png', hd: '38252824-256.png' }), // 96 px and 256 px files of the same GitHub avatar
    palette: freeze({ b: '#596173', B: '#3f4656', a: '#2f6fd0', A: '#204f9c', m: '#e9ecf2', o: '#272b35', l: '#272b35', w: '#eceef3', k: '#171a22' }),
    lines: freeze([freeze({ zh: '画面稳了，再来一局。', en: 'Frames are steady. One more round.' }), freeze({ zh: '遇到问题？到 Issues 告诉我们。', en: 'Found a bug? Tell us in Issues.' }), freeze({ zh: '记得让眼睛歇一歇。', en: 'Give your eyes a break now and then.' })]),
  }),
  // skyhua0224: cream with a gold scarf and red shoes
  freeze({
    login: 'skyhua0224',
    avatar: freeze({ sd: '91328606.png', hd: '91328606-256.png' }), // 96 px and 256 px files of the same GitHub avatar
    palette: freeze({ b: '#fbf6ec', B: '#e4d9c4', a: '#ffd24f', A: '#d9a12f', m: '#ffffff', o: '#c93a57', l: '#7b4a36', w: '#ffe8ea', k: '#3b2412' }),
    lines: freeze([freeze({ zh: 'Mac 上也能串流哦。', en: 'It streams to a Mac too.' }), freeze({ zh: '面板和网页，是同一套样子。', en: 'The panel and the Web UI share one look.' }), freeze({ zh: '觉得好用？点个 Star 吧。', en: 'Like it? Leave a star.' })]),
  }),
  // ShadowLemoon: black with a pink scarf and pink shoes
  freeze({
    login: 'ShadowLemoon',
    avatar: freeze({ sd: '119576779.jpg', hd: '119576779-256.jpg' }), // 96 px and 256 px files of the same GitHub avatar
    palette: freeze({ b: '#2b2030', B: '#160e19', a: '#ff8fbc', A: '#d9608e', m: '#fde9f0', o: '#ff8fbc', l: '#160e19', w: '#fde9f0', k: '#120a14' }),
    lines: freeze([freeze({ zh: '哔哔！连接成功。', en: 'Beep! Connected.' }), freeze({ zh: '延迟很低，滴滴滴。', en: 'Latency is low. Beep beep.' }), freeze({ zh: '我在这条边上巡逻。', en: 'Patrolling this edge.' })]),
  }),
])

/** The four frames of a friend's body as rows of palette letters, each `FRIEND_HEIGHT` rows of `FRIEND_WIDTH` letters (the body is shared). */
export const friendFrames = () => BODY.map((frame) => frame.rows)

const sheets = new Map()
/**
 * One SVG strip of the body's four frames side by side (`FRIEND_WIDTH` x 4 wide, `FRIEND_HEIGHT` high) in the friend's colours, as a data URL; one
 * rectangle per run of one colour in a row. `halo` (a colour) adds a one-pixel rim around the body, so its dark outline still reads on a dark or black
 * page. The avatar is not part of the strip: the page shows the image file itself over it.
 */
export function friendSheet(friend, { halo = '' } = {}) {
  const key = `${friend.login}|${halo}`
  if (sheets.has(key)) return sheets.get(key)
  const w = FRIEND_WIDTH
  const rects = []
  const run = (f, y, x, end, fill) => rects.push(`<rect x="${f * w + x}" y="${y}" width="${end - x}" height="1" fill="${fill}"/>`)
  friendFrames().forEach((rows, f) => {
    const solid = (x, y) => x >= 0 && x < w && y >= 0 && y < rows.length && rows[y][x] !== '.'
    rows.forEach((row, y) => {
      if (halo) {
        for (let x = 0; x < w;) {
          const rim = (i) => !solid(i, y) && (solid(i - 1, y) || solid(i + 1, y) || solid(i, y - 1) || solid(i, y + 1))
          if (!rim(x)) { x += 1; continue }
          let end = x + 1
          while (end < w && rim(end)) end += 1
          run(f, y, x, end, halo)
          x = end
        }
      }
      for (let x = 0; x < row.length;) {
        const ch = row[x]
        let end = x + 1
        while (end < row.length && row[end] === ch) end += 1
        if (ch !== '.' && friend.palette[ch]) run(f, y, x, end, friend.palette[ch])
        x = end
      }
    })
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * FRIEND_FRAMES}" height="${FRIEND_HEIGHT}" viewBox="0 0 ${w * FRIEND_FRAMES} ${FRIEND_HEIGHT}" shape-rendering="crispEdges">${rects.join('')}</svg>`
  const url = `data:image/svg+xml,${encodeURIComponent(svg)}`
  sheets.set(key, url)
  return url
}

/**
 * Where the badge sits on a body drawn at `scale` CSS pixels per sprite pixel, in the first frame: left, top and outer size of the ring, its width,
 * and the size of the picture inside (for `sizes`, so the browser takes the 96 px file where it is enough and the 256 px one where it is not).
 */
export function badgeBox(scale) {
  const outer = (BADGE.r + BADGE.ring) * 2
  return { left: (BADGE.cx - BADGE.r - BADGE.ring) * scale, top: (BADGE.cy - BADGE.r - BADGE.ring + BODY[0].dy) * scale, size: outer * scale, ring: BADGE.ring * scale, inner: BADGE.r * 2 * scale }
}

/** Line `i` of a friend in the language of the interface (Chinese for zh-*, English otherwise). */
export const friendLine = (friend, locale = 'en', i = 0) => {
  const line = friend.lines[((i % friend.lines.length) + friend.lines.length) % friend.lines.length]
  return /^zh/i.test(String(locale)) ? line.zh : line.en
}
