export default {
  "source": "Zdroj",
  "prepTitle": "Displeje během streamu",
  "prepLabel": "Kombinace displejů pro streamování",
  "preps": {
    "no_operation": {
      "title": "Žádná operace",
      "text": "Nechá displeje tak, jak jsou; o jejich připravenost se staráte sami"
    },
    "ensure_active": {
      "title": "Aktivovat zvolený displej"
    },
    "ensure_primary": {
      "title": "Streamování z hlavního displeje",
      "text": "Zapne zvolený displej a učiní jej hlavním"
    },
    "ensure_only_display": {
      "title": "Pouze zvolený displej"
    },
    "ensure_secondary": {
      "title": "Vedlejší displej (Foundation Virtual Display)"
    }
  },
  "options": "Volby",
  "reuse": "Jeden Foundation Virtual Display pro všechny klienty",
  "reuseText": "Nedoporučuje se: přepínání klientů je rychlejší, ale každý klient už si neuchovává vlastní škálování obrazu.",
  "headless": "Vytvořit, když hostitel nemá displej",
  "displayRules": "Rozlišení a obnovovací frekvence",
  "rulesFooter": "Aby to fungovalo, musí být v klientovi Moonlight zapnuté „Optimalizovat nastavení her“.",
  "follow": "Sledovat změny rozlišení hostitele během streamu",
  "advanced": "Rozšířené",
  "vsync": "Vynucení NVIDIA vsync při streamování na Foundation Virtual Display",
  "vsyncText": "Dočasně zapne globální vertikální synchronizaci NVIDIA, aby pomohl zachytit některé hry s DLSS Frame Generation na plné frekvenci na Foundation Virtual Display.",
  "vulkan": "Kompatibility Vulkan HDR pro Foundation Virtual Display",
  "vulkanText": "Pomáhá hrám Vulkan rozpoznat HDR na Foundation Virtual Display. Aktivní je jen u HDR streamu; neúspěšný test stream nepřeruší.",
  "vulkanStatus": {
    "disabled": "Vypnuto",
    "loading": "Kontrola kompatibility…",
    "unavailable": "Komponenty kompatibility nejsou nainstalovány",
    "waiting": "Připraveno: čeká na HDR Foundation Virtual Display",
    "idle": "Připraveno pro Vulkan HDR",
    "validating": "Testování Vulkan HDR prezentace…",
    "enabled": "Aktivní pro aktuální HDR stream",
    "error": "Test selhal; streamování není ovlivněno"
  },
  "vulkanValidate": "Otestovat aktuální displej",
  "vulkanValidating": "Testování…",
  "vulkanHint": "Chcete-li povolit testování, spusťte HDR Foundation Virtual Display.",
  "confirmTitle": "Změnit „{name}“?",
  "confirmChange": "Změnit",
  "cancel": "Zrušit",
  "saveFailed": "Nelze uložit: {error}",
  "risk": {
    "vsync": "Dočasně mění globální vertikální synchronizaci NVIDIA a může ovlivnit další hry spuštěné během streamu; obnoví se, když skončí poslední relace. Před spuštěním hry uložte.",
    "vulkan": "Platí jen během HDR streamu; neúspěšný test stream nepřeruší.",
    "dolby": "Aby se to projevilo, je potřeba Foundation Virtual Display po uložení znovu vytvořit.",
    "customEdid": "Vlastní EDID je nejrizikovější volba: špatný soubor může zabránit vytvoření Foundation Virtual Display. Pokud se to stane, smažte vlastní soubor a vraťte se k vestavěnému režimu.",
    "reload": "Foundation Virtual Display na okamžik zmizí, když se ovladač načítá znovu, a probíhající stream se přeruší.",
    "edidProfile": "Aby Windows znovu přečetl EDID, je potřeba Foundation Virtual Display po uložení znovu vytvořit. Špatná verze může znepřístupnit HDR nebo některá rozlišení.",
    "cursor": "To je to, co ovladač Windows hlásí. Špatná hodnota může způsobit, že kurzor zmizí nebo bliká; projeví se při příštím vytvoření Foundation Virtual Display."
  },
  "qualityTitle": "Kvalita obrazu",
  "driverTitle": "Ovladač a diagnostika",
  "tier3": "Pro experty",
  "edidProfile": "Vestavěná verze EDID",
  "edidProfileText": "Vestavěný EDID, který virtuální displej Windows hlásí. Automatické vybírá podle systému: kompatibilní na Windows 10 22H2, moderní na Windows 11 a novějších.",
  "edidProfileIgnored": "Je zapnutý vlastní EDID, vestavěná verze tedy nemá žádný vliv.",
  "edidProfiles": {
    "auto": {
      "title": "Automaticky",
      "text": "Podle systému hostitele"
    },
    "legacy": {
      "title": "Kompatibilní",
      "text": "EDID 1.3, nejširší kompatibilita"
    },
    "modern": {
      "title": "Moderní",
      "text": "EDID 1.4, 10 bitů, BT.2020, plné HDR"
    }
  },
  "preventSpoof": "Ponechat výrobce tak, jak je",
  "preventSpoofText": "Při vlastním EDID ovladač výrobce nepřepisuje. Zapněte jen v případě potřeby.",
  "ceaOverride": "Přidat rozšiřující blok CEA",
  "ceaOverrideText": "Přepíše nebo přidá vestavěný rozšiřující blok CEA vlastního EDID, aby mohl deklarovat HDR.",
  "cursorTitle": "Kurzor",
  "cursorHint": "Výchozí hodnoty vyhovují všem; starší procesory Intel mohou podporovat jen 64×64. Kurzor vždy exportuje ovladač; hostitel rozhoduje, zda se kreslí do obrazu, nebo se ponechá klientovi.",
  "cursorMax": "Největší kurzor",
  "alphaCursor": "32bitový kurzor s alfakanálem",
  "alphaCursorText": "Většina kurzorů je v tomto formátu.",
  "xorCursor": "Podpora XOR kurzoru",
  "xorCursorText": "Nesahejte na to, pokud nevíte, co dělá.",
  "xorLevels": {
    "0": "Neinicializováno",
    "1": "Žádná",
    "2": "Plná",
    "3": "Emulace"
  }
}
