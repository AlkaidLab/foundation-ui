export default
{
  "title": "Controllo",
  "start": "Avvia il controllo",
  "again": "Controlla di nuovo",
  "progress": "Controllo {done}/{total}",
  "done": "Ha richiesto {s} s",
  "groups": {
    "service": "Servizio Sunshine",
    "install": "Installazione",
    "process": "Processi e porte",
    "drivers": "Driver",
    "gpu": "Grafica e driver",
    "encoder": "Encoder",
    "capture": "Cattura dello schermo",
    "input": "Input e gamepad",
    "network": "Rete",
    "system": "Sistema",
    "host": "Stato dell'host"
  },
  "sources": {
    "local": "Questo PC"
  },
  "sourceTip": {
    "local": "Controllato dal pannello; Sunshine non deve essere in esecuzione",
    "host": "Controllato da Sunshine; deve essere in esecuzione"
  },
  "states": {
    "idle": "Non avviato",
    "queued": "In coda",
    "running": "Verifica…",
    "offline": "Sunshine non ha risposto, quindi questo gruppo non è stato controllato"
  },
  "offlineTitle": "Sunshine non ha risposto: {n} gruppi non controllati",
  "offlineNext": "Avvia prima Sunshine (il servizio e Processi e porte dicono perché no), poi controlla di nuovo.",
  "hostOffline": "Sunshine non è in esecuzione: solo i controlli di questo PC hanno risultati",
  "sections": {
    "local": "Controlli di questo PC",
    "host": "Controlli di Sunshine"
  },
  "plan": {
    "title": "{n} gruppi",
    "text": "{local} gruppi li controlla il pannello stesso e funzionano con Sunshine fermo; gli altri {host} li controlla Sunshine.",
    "textOffline": "Sunshine non è in esecuzione: si possono controllare solo i {local} gruppi di questo PC."
  },
  "what": {
    "service": "Stato, tipo di avvio, ultimo codice di uscita",
    "install": "Cartella di installazione, versione e build",
    "process": "Porte in uso, errori alla fine del registro",
    "drivers": "Foundation Virtual Display, ViGEmBus, mouse virtuale, USB/IP",
    "gpu": "Schede grafiche, versioni dei driver, quale scheda codifica",
    "capture": "Un fotogramma di prova",
    "vdd": "Driver, HDR, frequenza",
    "audio": "Dispositivo di uscita, scheda audio virtuale, microfono",
    "input": "ViGEmBus, DualSense, inoltro USB",
    "network": "Porte, firewall, UPnP, internet, mesh",
    "system": "Spazio su disco, sincronizzazione ora, account, riavvio in sospeso",
    "host": "Versione, tempo di attività, arresti, errori di configurazione"
  },
  "last": {
    "title": "Ultimo controllo {ago}",
    "empty": "L'ultimo controllo non ha dato alcun risultato",
    "ago": {
      "now": "proprio ora",
      "min": "{n} min fa",
      "hour": "{n} h fa",
      "day": "{n} g fa"
    }
  },
  "checkedAt": "Controllato {at} ({ago})",
  "none": {
    "title": "Nessun controllo ha dato un risultato",
    "text": "Nessuno dei {n} gruppi ha risposto, quindi questo PC non si può ancora dire a posto o guasto.",
    "reason": "Primo motivo: {why}"
  },
  "failure": {
    "why": "Perché",
    "next": "Che cosa fare",
    "detail": "Che cosa è tornato",
    "http": "stato {status}",
    "hit": "{n} gruppi: {names}"
  },
  "status": {
    "warn": "Avviso",
    "fail": "Problema",
    "skip": "Non controllato"
  },
  "counts": {
    "fail": "{n} problemi",
    "warn": "{n} avvisi",
    "skip": "{n} non controllati",
    "pass": "{n} ok",
    "silent": "{n} gruppi senza risultato"
  },
  "allGood": "Tutto ok",
  "errors": {
    "unsupported": {
      "why": "Questa versione non ha questo controllo",
      "next": "Aggiorna Sunshine (o il pannello), poi controlla di nuovo."
    },
    "auth": {
      "why": "Disconnesso: Sunshine ha rifiutato la richiesta",
      "next": "Accedi di nuovo, poi controlla ancora."
    },
    "invalid": {
      "why": "La risposta non è un risultato del controllo; chi ha risposto forse non è un host Sunshine",
      "next": "Controlla di nuovo; se resta così, esporta il rapporto e invia un feedback con ciò che è tornato."
    },
    "failed": {
      "why": "Il controllo è fallito e non ha dato risultato",
      "next": "Controlla di nuovo; se fallisce ancora, esporta il rapporto e invia un feedback con ciò che è tornato."
    }
  },
  "stream": {
    "live": "Uno stream è in corso: {n} controlli non si possono fare e non contano né come ok né come problema",
    "label": {
      "skipped": "Non controllato durante lo streaming",
      "disturbed": "Inaffidabile durante lo streaming",
      "routed": "Inaffidabile durante lo streaming"
    },
    "why": {
      "skipped": "Uno stream è in corso e una sonda userebbe la GPU e disturberebbe l'immagine, quindi questo non è stato controllato. Controlla di nuovo a stream finito.",
      "disturbed": "Questo è stato misurato durante uno stream e può essere la risposta dello stream, quindi non conta né come ok né come problema. Controlla di nuovo a stream finito.",
      "routed": "Mentre trasmette Sunshine prende lui l'uscita audio, quindi il dispositivo letto ora non è quello di un PC fermo e non si può giudicare. Controlla di nuovo a stream finito."
    },
    "read": "Letto: {detail}"
  },
  "rerunGroup": "Controlla di nuovo questo gruppo",
  "export": "Esporta il rapporto",
  "ai": "Chiedi a Mita AI",
  "fix": {
    "setting": "Apri l'impostazione",
    "page": "Apri {page}",
    "rerun": "Controlla di nuovo",
    "restart": "Riavvia Sunshine",
    "link": "Leggi come",
    "repair": "Ripara",
    "start": "Avvia Sunshine"
  },
  "pages": {
    "network": "Rete",
    "display": "Schermo",
    "components": "Componenti",
    "logs": "Registri e diagnostica",
    "config": "File di configurazione",
    "update": "Informazioni e aggiornamenti"
  },
  "confirm": {
    "will": "Che cosa fa",
    "admin": "Servono diritti di amministratore: Windows chiede di confermare.",
    "live": "Uno stream è in corso: finisce quando questo viene eseguito. Se stai controllando questo PC da quello stream, perdi la connessione e potresti dover tornare a questo PC.",
    "run": "Esegui",
    "cancel": "Annulla"
  },
  "fixAt": "Riparalo sotto {group} › {item}; una riparazione lo sistema anche qui.",
  "repairFailed": "Non fatto: {error}",
  "repairDone": "Fatto; controllo di nuovo",
  "aiPrompt": "Ecco il controllo di un host Foundation Sunshine (i controlli di questo PC e di Sunshine). Trova le cause e dai le correzioni in ordine.",
  "aiOffline": "non risponde"
}
