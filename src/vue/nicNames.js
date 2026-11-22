// How an adapter's name is shown on a tile. The name stays the adapter's identity (the choice is kept by it); what is drawn is shorter when a rule says so: the id that a virtual adapter puts in brackets and the boilerplate of a vendor
// (「ZeroTier One [154a350c867ec550]」 is 「ZeroTier One」, 「Intel(R) Ethernet Connection I219-V」 is 「Ethernet Connection I219-V」). What is still wider than its row is cut at a word, with an ellipsis (MTrimWords.vue), never inside one.
const RULES = [
  [/\s*\[[0-9a-f-]{8,}\]\s*/gi, ' '],
  [/\((?:R|TM|tm|r)\)/g, ''],
  [/\s+(?:Family Controller|Network Adapter|Network Connection)(?=\s+#?\d*$|$)/i, ''],
]
// the vendor in front goes only when at least three words are left after it (「Realtek PCIe GbE」 keeps its vendor, 「Intel Ethernet Connection I219-V」 does not need it)
const VENDOR = /^(?:Microsoft|Intel|Realtek|Qualcomm Atheros|Broadcom|Killer)\s+(?=(?:\S+\s+){2}\S)/i
/** The name to draw for an adapter name; the name itself when no rule applies or a rule would leave nothing. */
export function shortNicName(name) {
  const full = String(name ?? '').trim()
  let s = full
  for (const [re, to] of RULES) s = s.replace(re, to)
  s = s.replace(VENDOR, '').replace(/\s{2,}/g, ' ').trim()
  return s && s !== full ? s : full
}
