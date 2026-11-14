export default
{
  "title": "Gesundheitscheck",
  "start": "Gesundheitscheck starten",
  "again": "Erneut prüfen",
  "progress": "Prüfe {done}/{total}",
  "done": "Dauerte {s} s",
  "groups": {
    "service": "Sunshine-Dienst",
    "process": "Prozesse und Ports",
    "drivers": "Treiber",
    "gpu": "Grafik und Treiber",
    "encoder": "Encoder",
    "capture": "Bildaufnahme",
    "input": "Eingabe und Gamepads",
    "network": "Netzwerk",
    "host": "Host-Status"
  },
  "sources": {
    "local": "Dieser PC"
  },
  "sourceTip": {
    "local": "Vom Kontrollpanel geprüft; Sunshine muss nicht laufen",
    "host": "Von Sunshine geprüft; es muss laufen"
  },
  "states": {
    "idle": "Nicht gestartet",
    "queued": "In der Warteschlange",
    "running": "Prüfen…",
    "offline": "Sunshine hat nicht geantwortet, diese Gruppe wurde nicht geprüft"
  },
  "offlineTitle": "Sunshine hat nicht geantwortet: {n} Gruppen nicht geprüft",
  "offlineNext": "Starten Sie zuerst Sunshine (Sunshine-Dienst sowie Prozesse und Ports sagen, warum nicht), dann erneut prüfen.",
  "hostOffline": "Sunshine läuft nicht: nur die Prüfungen dieses PCs haben Ergebnisse",
  "sections": {
    "local": "Prüfungen dieses PCs",
    "host": "Prüfungen von Sunshine"
  },
  "plan": {
    "title": "{n} Gruppen",
    "text": "{local} Gruppen prüft das Kontrollpanel selbst, auch wenn Sunshine steht; die anderen {host} prüft Sunshine.",
    "textOffline": "Sunshine läuft nicht: nur die {local} Gruppen dieses PCs können geprüft werden."
  },
  "what": {
    "service": "Zustand, Startart, letzter Exitcode",
    "install": "Installationsordner, Version und Build",
    "process": "Belegte Ports, Fehler am Ende des Protokolls",
    "drivers": "Foundation Virtual Display, ViGEmBus, virtuelle Maus, USB/IP",
    "gpu": "Grafikkarten, Treiberversionen, welche Karte codiert",
    "capture": "Ein Testbild",
    "vdd": "Treiber, HDR, Bildwiederholrate",
    "audio": "Ausgabegerät, virtuelle Soundkarte, Mikrofon",
    "input": "ViGEmBus, DualSense, USB-Weiterleitung",
    "network": "Ports, Firewall, UPnP, Internet, Mesh",
    "system": "Speicherplatz, Zeitabgleich, Konto, ausstehender Neustart",
    "host": "Version, Laufzeit, Abstürze, Konfigurationsfehler"
  },
  "last": {
    "title": "Letzte Prüfung {ago}",
    "empty": "Die letzte Prüfung hat gar kein Ergebnis gebracht",
    "ago": {
      "now": "gerade eben",
      "min": "vor {n} Min.",
      "hour": "vor {n} Std.",
      "day": "vor {n} Tagen"
    }
  },
  "checkedAt": "Geprüft {at} ({ago})",
  "none": {
    "title": "Keine Prüfung hat ein Ergebnis gebracht",
    "text": "Keine der {n} Gruppen hat geantwortet, daher kann dieser PC noch nicht als in Ordnung oder kaputt gelten.",
    "reason": "Erster Grund: {why}"
  },
  "failure": {
    "why": "Warum",
    "next": "Was tun",
    "detail": "Was zurückkam",
    "http": "Status {status}",
    "hit": "{n} Gruppen: {names}"
  },
  "status": {
    "warn": "Warnung",
    "skip": "Nicht geprüft"
  },
  "counts": {
    "fail": "{n} Probleme",
    "warn": "{n} Warnungen",
    "skip": "{n} nicht geprüft",
    "pass": "{n} in Ordnung",
    "silent": "{n} Gruppen ohne Ergebnis"
  },
  "allGood": "Alles in Ordnung",
  "errors": {
    "unsupported": {
      "why": "Diese Version hat diese Prüfung nicht",
      "next": "Aktualisieren Sie Sunshine (oder das Kontrollpanel) und prüfen Sie erneut."
    },
    "auth": {
      "why": "Abgemeldet: Sunshine hat die Anfrage abgelehnt",
      "next": "Melden Sie sich erneut an und prüfen Sie noch einmal."
    },
    "invalid": {
      "why": "Die Antwort ist kein Ergebnis des Gesundheitschecks; was geantwortet hat, ist vielleicht kein Sunshine-Host",
      "next": "Prüfen Sie erneut; bleibt es so, exportieren Sie den Bericht und senden Sie Feedback mit dem, was zurückkam."
    },
    "failed": {
      "why": "Die Prüfung ist fehlgeschlagen und hat kein Ergebnis gebracht",
      "next": "Prüfen Sie erneut; schlägt es wieder fehl, exportieren Sie den Bericht und senden Sie Feedback mit dem, was zurückkam."
    }
  },
  "stream": {
    "live": "Ein Stream läuft: {n} Prüfungen sind nicht möglich und gelten weder als in Ordnung noch als Problem",
    "label": {
      "skipped": "Während des Streams nicht geprüft",
      "disturbed": "Während des Streams unzuverlässig",
      "routed": "Während des Streams unzuverlässig"
    },
    "why": {
      "skipped": "Ein Stream läuft, und eine Prüfung würde die GPU belegen und das Bild stören, daher wurde das nicht geprüft. Prüfen Sie erneut, wenn der Stream zu Ende ist.",
      "disturbed": "Das wurde während eines Streams gemessen und kann die Antwort des Streams sein, daher gilt es weder als in Ordnung noch als Problem. Prüfen Sie erneut, wenn der Stream zu Ende ist.",
      "routed": "Während des Streams übernimmt Sunshine die Tonausgabe selbst, daher ist das jetzt gelesene Gerät nicht das eines ruhenden PCs und kann nicht beurteilt werden. Prüfen Sie erneut, wenn der Stream zu Ende ist."
    },
    "read": "Gelesen: {detail}"
  },
  "rerunGroup": "Diese Gruppe erneut prüfen",
  "export": "Bericht exportieren",
  "ai": "Mita AI fragen",
  "fix": {
    "setting": "Einstellung öffnen",
    "page": "{page} öffnen",
    "rerun": "Erneut prüfen",
    "restart": "Sunshine neu starten",
    "link": "So geht es",
    "repair": "Reparieren",
    "start": "Sunshine starten"
  },
  "pages": {
    "network": "Netzwerk",
    "display": "Anzeige",
    "components": "Komponenten",
    "logs": "Protokolle und Diagnose",
    "config": "Konfigurationsdateien",
    "update": "Info und Updates"
  },
  "confirm": {
    "will": "Was es tut",
    "admin": "Braucht Administratorrechte: Windows fragt nach einer Bestätigung.",
    "live": "Ein Stream läuft: er endet, wenn das ausgeführt wird. Steuern Sie diesen PC über diesen Stream, verlieren Sie die Verbindung und müssen vielleicht zu diesem PC zurück.",
    "run": "Ausführen",
    "cancel": "Abbrechen"
  },
  "fixAt": "Reparieren Sie es unter {group} › {item}; eine Reparatur behebt es auch hier.",
  "repairFailed": "Nicht erledigt: {error}",
  "repairDone": "Erledigt; es wird erneut geprüft",
  "aiPrompt": "Hier ist der Gesundheitscheck eines Foundation-Sunshine-Hosts (die Prüfungen dieses PCs und von Sunshine). Finden Sie die Ursachen und geben Sie die Schritte der Reihe nach.",
  "aiOffline": "antwortet nicht"
}
