// What the name of a device says about its system (a name the person gave: 'Pixel 9', 'Studio MacBook'), a guess: the host's own `os` comes first wherever it is known.
/** The system a paired device's name says it is ('iPhone 15' is iOS, 'Pixel 9' Android, 'MacBook Pro' macOS, 'Steam Deck' Linux, 'Windows PC'), or '' when it says nothing. */
export function osFromClientName(name) {
  const n = String(name || '').toLowerCase()
  if (/iphone|ipad|ipados|\bios\b/.test(n)) return 'ios'
  if (/macbook|\bimac\b|mac mini|mac studio|macos|\bmac\b/.test(n)) return 'macos'
  if (/harmony|鸿蒙|matepad|\bmate ?\d/.test(n)) return 'harmony'
  if (/steam ?deck|linux|ubuntu|fedora|arch/.test(n)) return 'linux'
  if (/windows|\bpc\b|desktop|laptop|thinkpad|surface/.test(n)) return 'windows'
  if (/android|pixel|galaxy|samsung|xiaomi|redmi|oneplus|oppo|vivo|honor|phone|tablet/.test(n)) return 'android'
  if (/\btv\b|shield|bravia/.test(n)) return 'tv'
  return ''
}

