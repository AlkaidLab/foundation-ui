export default {
  "source": "Źródło",
  "prepTitle": "Wyświetlacze podczas strumienia",
  "prepLabel": "Kombinacja wyświetlaczy do streamowania",
  "preps": {
    "no_operation": {
      "title": "Bez działania",
      "text": "Zostawia wyświetlacze bez zmian; ty dbasz o ich gotowość"
    },
    "ensure_active": {
      "title": "Aktywuj wybrany wyświetlacz"
    },
    "ensure_primary": {
      "title": "Streamowanie z głównego wyświetlacza",
      "text": "Włącza wybrany wyświetlacz i czyni go głównym"
    },
    "ensure_only_display": {
      "title": "Tylko wybrany wyświetlacz"
    },
    "ensure_secondary": {
      "title": "Dodatkowy wyświetlacz (Foundation Virtual Display)"
    }
  },
  "options": "Opcje",
  "reuse": "Jeden Foundation Virtual Display dla wszystkich klientów",
  "reuseText": "Niezalecane: przełączanie klientów jest szybsze, ale każdy klient nie zachowuje już własnego skalowania ekranu.",
  "headless": "Utwórz, gdy host nie ma wyświetlacza",
  "displayRules": "Rozdzielczość i częstotliwość odświeżania",
  "rulesFooter": "Aby to działało, w kliencie Moonlight musi być włączone „Optymalizuj ustawienia gry”.",
  "follow": "Podążaj za zmianami rozdzielczości hosta podczas strumienia",
  "advanced": "Zaawansowane",
  "vsync": "Wymuszony vsync NVIDIA podczas streamowania na Foundation Virtual Display",
  "vsyncText": "Tymczasowo włącza globalną synchronizację pionową NVIDIA, aby pomóc przechwytywać niektóre gry z DLSS Frame Generation w pełnej częstotliwości na Foundation Virtual Display.",
  "vulkan": "Zgodność Vulkan HDR dla Foundation Virtual Display",
  "vulkanText": "Pomaga grom Vulkan wykrywać HDR na Foundation Virtual Display. Aktywne tylko przy strumieniu HDR; nieudany test nie przerywa streamowania.",
  "vulkanStatus": {
    "disabled": "Wyłączone",
    "loading": "Sprawdzanie zgodności…",
    "unavailable": "Komponenty zgodności nie są zainstalowane",
    "waiting": "Gotowe: oczekiwanie na Foundation Virtual Display z HDR",
    "idle": "Gotowe dla Vulkan HDR",
    "validating": "Testowanie prezentacji Vulkan HDR…",
    "enabled": "Aktywne dla bieżącego strumienia HDR",
    "error": "Test nie powiódł się; streamowanie nie jest dotknięte"
  },
  "vulkanValidate": "Przetestuj bieżący wyświetlacz",
  "vulkanValidating": "Testowanie…",
  "vulkanHint": "Uruchom Foundation Virtual Display z HDR, aby włączyć testowanie.",
  "confirmTitle": "Zmienić „{name}”?",
  "confirmChange": "Zmień",
  "cancel": "Anuluj",
  "saveFailed": "Nie udało się zapisać: {error}",
  "risk": {
    "vsync": "Tymczasowo zmienia globalną synchronizację pionową NVIDIA i może wpłynąć na inne gry uruchomione podczas strumienia; przywracana jest po zakończeniu ostatniej sesji. Zapisz przed uruchomieniem gry.",
    "vulkan": "Działa tylko podczas strumienia HDR; nieudany test nie przerywa streamowania.",
    "dolby": "Aby to zadziałało, Foundation Virtual Display musi zostać ponownie utworzony po zapisaniu.",
    "customEdid": "Niestandardowy EDID to najbardziej ryzykowna opcja: błędny plik może uniemożliwić utworzenie Foundation Virtual Display. Jeśli tak się stanie, usuń plik niestandardowy i wróć do trybu wbudowanego.",
    "reload": "Foundation Virtual Display znika na chwilę podczas ponownego ładowania sterownika, a trwający strumień jest przerywany.",
    "edidProfile": "Foundation Virtual Display musi zostać ponownie utworzony po zapisaniu, aby Windows ponownie odczytał EDID. Zła wersja może uniemożliwić HDR lub niektóre rozdzielczości.",
    "cursor": "To jest to, co sterownik zgłasza systemowi Windows. Zła wartość może spowodować zniknięcie lub migotanie kursora; zadziała przy następnym utworzeniu Foundation Virtual Display."
  },
  "qualityTitle": "Jakość obrazu",
  "driverTitle": "Sterownik i diagnostyka",
  "tier3": "Ekspertowe",
  "edidProfile": "Wbudowana wersja EDID",
  "edidProfileText": "Wbudowany EDID zgłaszany systemowi Windows przez wirtualny wyświetlacz. Automatycznie wybiera według systemu: zgodny na Windows 10 22H2, nowoczesny na Windows 11 i nowszych.",
  "edidProfileIgnored": "Niestandardowy EDID jest włączony, więc wersja wbudowana nie ma efektu.",
  "edidProfiles": {
    "auto": {
      "title": "Automatycznie",
      "text": "Według systemu hosta"
    },
    "legacy": {
      "title": "Zgodny",
      "text": "EDID 1.3, najszersza zgodność"
    },
    "modern": {
      "title": "Nowoczesny",
      "text": "EDID 1.4, 10 bitów, BT.2020, pełny HDR"
    }
  },
  "preventSpoof": "Zachowaj producenta bez zmian",
  "preventSpoofText": "Przy niestandardowym EDID sterownik nie nadpisuje producenta. Włącz tylko w razie potrzeby.",
  "ceaOverride": "Dodaj blok rozszerzenia CEA",
  "ceaOverrideText": "Nadpisuje lub dodaje wbudowany blok rozszerzenia CEA niestandardowego EDID, aby mógł deklarować HDR.",
  "cursorTitle": "Kursor",
  "cursorHint": "Wartości domyślne odpowiadają wszystkim; starsze procesory Intel mogą obsługiwać tylko 64×64. Kursor jest zawsze eksportowany przez sterownik; host decyduje, czy rysować go w obrazie, czy zostawić klientowi.",
  "cursorMax": "Największy kursor",
  "alphaCursor": "32-bitowy kursor z kanałem alfa",
  "alphaCursorText": "Większość kursorów jest w tym formacie.",
  "xorCursor": "Obsługa kursora XOR",
  "xorCursorText": "Nie ruszaj tego, jeśli nie wiesz, co robi.",
  "xorLevels": {
    "0": "Niezainicjowany",
    "1": "Brak",
    "2": "Pełna",
    "3": "Emulacja"
  }
}
