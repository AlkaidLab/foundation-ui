/** The source of a log line as the column shows it: a long path keeps its end (the file and the line) behind a leading ellipsis; the whole path is the tooltip. */
export function shortSource(src, max = 30) {
  const s = String(src || '')
  return s.length <= max ? s : `…${s.slice(s.length - (max - 1))}`
}
