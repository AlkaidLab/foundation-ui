// Where an address or URL may break when it does not fit a narrow line (a phone): at its own joints, never inside a token.
// After a dot, a dash, an underscore, a slash (not between the two of "//"), ? & =, and after a colon inside the address or before a port (not the scheme's colon).
// "https://192.168.7.31:57990" -> ['https://', '192.', '168.', '7.', '31:', '57990']; an IPv6 address breaks after each group. The text itself is never changed (no hidden characters): the joints are <wbr> elements.
const JOINT = /(?<=[.\-_?&=]|\/)(?!\/)(?!$)|(?<=\w:)(?!\/\/)(?!$)/
export const breakText = (text) => String(text ?? '').split(JOINT).filter((s) => s !== '')
