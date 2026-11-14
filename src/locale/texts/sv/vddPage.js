export default {
  "source": "Källa",
  "prepTitle": "Skärmar under en ström",
  "prepLabel": "Kombination av skärmar för strömning",
  "preps": {
    "no_operation": {
      "title": "Ingen åtgärd",
      "text": "Lämnar skärmarna som de är; du ser till att de är redo"
    },
    "ensure_active": {
      "title": "Aktivera vald skärm"
    },
    "ensure_primary": {
      "title": "Strömning från huvudskärmen",
      "text": "Slår på den valda skärmen och gör den till huvudskärm"
    },
    "ensure_only_display": {
      "title": "Endast den valda skärmen"
    },
    "ensure_secondary": {
      "title": "Sekundär skärm (Foundation Virtual Display)"
    }
  },
  "options": "Alternativ",
  "reuse": "En Foundation Virtual Display för alla klienter",
  "reuseText": "Rekommenderas inte: att byta klient går snabbare, men varje klient behåller inte längre sin egen bildskalning.",
  "headless": "Skapa en när värden saknar skärm",
  "displayRules": "Upplösning och uppdateringsfrekvens",
  "rulesFooter": "För att det ska fungera måste ”Optimera spelinställningar” vara på i Moonlight-klienten.",
  "follow": "Följ värdens upplösningsändringar under strömmen",
  "advanced": "Avancerat",
  "vsync": "Tvingande NVIDIA-vsync under Foundation Virtual Display-strömning",
  "vsyncText": "Slår tillfälligt på NVIDIAs globala vertikala synkronisering för att hjälpa till att fånga vissa DLSS Frame Generation-spel i full frekvens på Foundation Virtual Display.",
  "vulkan": "Vulkan HDR-kompatibilitet för Foundation Virtual Display",
  "vulkanText": "Hjälper Vulkan-spel att upptäcka HDR på Foundation Virtual Display. Aktiv bara vid en HDR-ström; ett misslyckat test avbryter inte strömningen.",
  "vulkanStatus": {
    "disabled": "Avstängt",
    "loading": "Kontrollerar kompatibilitet…",
    "unavailable": "Kompatibilitetskomponenterna är inte installerade",
    "waiting": "Redo: väntar på en HDR-Foundation Virtual Display",
    "idle": "Redo för Vulkan HDR",
    "validating": "Testar Vulkan HDR-presentation…",
    "enabled": "Aktiv för den aktuella HDR-strömmen",
    "error": "Testet misslyckades; strömningen påverkas inte"
  },
  "vulkanValidate": "Testa den aktuella skärmen",
  "vulkanValidating": "Testar…",
  "vulkanHint": "Starta en HDR-Foundation Virtual Display för att aktivera testningen.",
  "confirmTitle": "Ändra ”{name}”?",
  "confirmChange": "Ändra",
  "cancel": "Avbryt",
  "saveFailed": "Kunde inte spara: {error}",
  "risk": {
    "vsync": "Ändrar tillfälligt NVIDIAs globala vertikala synkronisering och kan påverka andra spel som startas under en ström; den återställs när den sista sessionen slutar. Spara innan du startar spelet.",
    "vulkan": "Gäller bara under en HDR-ström; ett misslyckat test avbryter inte strömningen.",
    "dolby": "Foundation Virtual Display måste skapas igen efter sparandet för att det ska börja gälla.",
    "customEdid": "En anpassad EDID är det riskfylldaste alternativet: en fel fil kan hindra Foundation Virtual Display från att skapas. Sker det, ta bort den anpassade filen och gå tillbaka till det inbyggda läget.",
    "reload": "Foundation Virtual Display försvinner ett ögonblick medan drivrutinen läses in igen, och en pågående ström avbryts.",
    "edidProfile": "Foundation Virtual Display måste skapas igen efter sparandet för att Windows ska läsa EDID:n igen. En fel version kan göra HDR eller vissa upplösningar otillgängliga.",
    "cursor": "Det här är vad drivrutinen deklarerar för Windows. Ett fel värde kan få muspekaren att försvinna eller blinka; det gäller nästa gång Foundation Virtual Display skapas."
  },
  "qualityTitle": "Bildkvalitet",
  "driverTitle": "Drivrutin och diagnostik",
  "tier3": "Expert",
  "edidProfile": "Inbyggd EDID-version",
  "edidProfileText": "Den inbyggda EDID som den virtuella skärmen rapporterar till Windows. Automatiskt väljer efter systemet: den kompatibla på Windows 10 22H2, den moderna på Windows 11 och senare.",
  "edidProfileIgnored": "En anpassad EDID är på, så den inbyggda versionen har ingen effekt.",
  "edidProfiles": {
    "auto": {
      "title": "Automatiskt",
      "text": "Efter värdens system"
    },
    "legacy": {
      "title": "Kompatibel",
      "text": "EDID 1.3, bredaste kompatibiliteten"
    },
    "modern": {
      "title": "Modern",
      "text": "EDID 1.4, 10 bitar, BT.2020, fullt HDR"
    }
  },
  "preventSpoof": "Behåll tillverkaren som den är",
  "preventSpoofText": "Med en anpassad EDID skriver drivrutinen inte om tillverkaren. Slå på den bara om du behöver.",
  "ceaOverride": "Lägg till CEA-tilläggsblocket",
  "ceaOverrideText": "Ersätter eller lägger till det inbyggda CEA-tilläggsblocket i en anpassad EDID så att den kan deklarera HDR.",
  "cursorTitle": "Muspekare",
  "cursorHint": "Standardvärdena passar alla; äldre Intel-processorer kan bara stödja 64×64. Muspekaren exporteras alltid av drivrutinen; värden avgör om den ritas i bilden eller lämnas åt klienten.",
  "cursorMax": "Största muspekare",
  "alphaCursor": "32-bitars muspekare med alfa",
  "alphaCursorText": "De flesta muspekare har det här formatet.",
  "xorCursor": "Stöd för XOR-muspekare",
  "xorCursorText": "Rör den inte om du inte vet vad den gör.",
  "xorLevels": {
    "0": "Oinitierad",
    "1": "Ingen",
    "2": "Full",
    "3": "Emulering"
  }
}
