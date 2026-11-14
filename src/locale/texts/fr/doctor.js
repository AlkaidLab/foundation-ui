export default
{
  "title": "Contrôle de santé",
  "start": "Lancer le contrôle",
  "again": "Vérifier encore",
  "progress": "Vérification {done}/{total}",
  "done": "A pris {s} s",
  "groups": {
    "service": "Service Sunshine",
    "process": "Processus et ports",
    "drivers": "Pilotes",
    "gpu": "Graphiques et pilote",
    "encoder": "Encodeurs",
    "capture": "Capture d'écran",
    "input": "Entrée et manettes",
    "network": "Réseau",
    "system": "Système",
    "host": "État de l'hôte"
  },
  "sources": {
    "local": "Ce PC"
  },
  "sourceTip": {
    "local": "Vérifié par le panneau ; Sunshine n'a pas besoin de tourner",
    "host": "Vérifié par Sunshine ; il doit tourner"
  },
  "states": {
    "idle": "Pas commencé",
    "queued": "En file",
    "running": "Vérification…",
    "offline": "Sunshine n'a pas répondu, ce groupe n'a pas été vérifié"
  },
  "offlineTitle": "Sunshine n'a pas répondu : {n} groupes non vérifiés",
  "offlineNext": "Lancez d'abord Sunshine (le service et Processus et ports disent pourquoi), puis vérifiez encore.",
  "hostOffline": "Sunshine ne tourne pas : seuls les contrôles de ce PC ont des résultats",
  "sections": {
    "local": "Contrôles de ce PC",
    "host": "Contrôles par Sunshine"
  },
  "plan": {
    "title": "{n} groupes",
    "text": "{local} groupes sont vérifiés par le panneau lui-même, même si Sunshine est arrêté ; les {host} autres le sont par Sunshine.",
    "textOffline": "Sunshine ne tourne pas : seuls les {local} groupes de ce PC peuvent être vérifiés."
  },
  "what": {
    "service": "État, type de démarrage, dernier code de sortie",
    "install": "Dossier d'installation, version et build",
    "process": "Ports utilisés, erreurs à la fin du journal",
    "drivers": "Foundation Virtual Display, ViGEmBus, souris virtuelle, USB/IP",
    "gpu": "Cartes graphiques, versions de pilote, quelle carte encode",
    "capture": "Une image de test",
    "vdd": "Pilote, HDR, taux de rafraîchissement",
    "audio": "Périphérique de sortie, carte son virtuelle, microphone",
    "input": "ViGEmBus, DualSense, transfert USB",
    "network": "Ports, pare-feu, UPnP, internet, mesh",
    "system": "Espace disque, synchro de l'heure, compte, redémarrage en attente",
    "host": "Version, durée de fonctionnement, plantages, erreurs de configuration"
  },
  "last": {
    "title": "Dernier contrôle {ago}",
    "empty": "Le dernier contrôle n'a donné aucun résultat",
    "ago": {
      "now": "à l'instant",
      "min": "il y a {n} min",
      "hour": "il y a {n} h",
      "day": "il y a {n} j"
    }
  },
  "checkedAt": "Vérifié {at} ({ago})",
  "none": {
    "title": "Aucun contrôle n'a donné de résultat",
    "text": "Aucun des {n} groupes n'a répondu, ce PC ne peut donc pas encore être dit en bon état ou en panne.",
    "reason": "Première raison : {why}"
  },
  "failure": {
    "why": "Pourquoi",
    "next": "Que faire",
    "detail": "Ce qui est revenu",
    "http": "état {status}",
    "hit": "{n} groupes : {names}"
  },
  "status": {
    "warn": "Avertissement",
    "fail": "Problème",
    "skip": "Non vérifié"
  },
  "counts": {
    "fail": "{n} problèmes",
    "warn": "{n} avertissements",
    "skip": "{n} non vérifiés",
    "silent": "{n} groupes sans résultat"
  },
  "allGood": "Tout va bien",
  "errors": {
    "unsupported": {
      "why": "Cette version n'a pas ce contrôle",
      "next": "Mettez à jour Sunshine (ou le panneau), puis vérifiez encore."
    },
    "auth": {
      "why": "Déconnecté : Sunshine a refusé la demande",
      "next": "Reconnectez-vous, puis vérifiez encore."
    },
    "invalid": {
      "why": "La réponse n'est pas un résultat de contrôle ; ce qui a répondu n'est peut-être pas un hôte Sunshine",
      "next": "Vérifiez encore ; si cela reste ainsi, exportez le rapport et envoyez un retour avec ce qui est revenu."
    },
    "failed": {
      "why": "Le contrôle a échoué et n'a donné aucun résultat",
      "next": "Vérifiez encore ; si cela échoue encore, exportez le rapport et envoyez un retour avec ce qui est revenu."
    }
  },
  "stream": {
    "live": "Un flux est en cours : {n} contrôles sont impossibles et ne comptent ni comme OK ni comme un problème",
    "label": {
      "skipped": "Non vérifié pendant la diffusion",
      "disturbed": "Peu fiable pendant la diffusion",
      "routed": "Peu fiable pendant la diffusion"
    },
    "why": {
      "skipped": "Un flux est en cours et une sonde prendrait le GPU et gênerait l'image, ceci n'a donc pas été vérifié. Vérifiez encore quand le flux est terminé.",
      "disturbed": "Ceci a été mesuré pendant un flux et peut être la réponse du flux, donc cela ne compte ni comme OK ni comme un problème. Vérifiez encore quand le flux est terminé.",
      "routed": "Pendant la diffusion Sunshine prend lui-même la sortie audio, l'appareil lu maintenant n'est donc pas celui d'un PC au repos et ne peut pas être jugé. Vérifiez encore quand le flux est terminé."
    },
    "read": "Lu : {detail}"
  },
  "rerunGroup": "Vérifier encore ce groupe",
  "export": "Exporter le rapport",
  "ai": "Demander à Mita AI",
  "fix": {
    "setting": "Ouvrir le réglage",
    "page": "Ouvrir {page}",
    "rerun": "Vérifier encore",
    "restart": "Redémarrer Sunshine",
    "link": "Voir comment",
    "repair": "Réparer",
    "start": "Démarrer Sunshine"
  },
  "pages": {
    "network": "Réseau",
    "display": "Écran",
    "components": "Composants",
    "logs": "Journaux et diagnostic",
    "config": "Fichiers de configuration",
    "update": "À propos et mises à jour"
  },
  "confirm": {
    "title": "{label} ?",
    "titleOf": "{label} {item} ?",
    "will": "Ce que cela fait",
    "admin": "Droits d'administrateur requis : Windows demande de confirmer.",
    "live": "Un flux est en cours : il s'arrête quand ceci s'exécute. Si vous contrôlez ce PC par ce flux, vous perdez la connexion et devrez peut-être revenir devant ce PC.",
    "run": "Exécuter",
    "cancel": "Annuler"
  },
  "fixAt": "Réparez-le sous {group} › {item} ; une réparation le corrige aussi ici.",
  "repairFailed": "Pas fait : {error}",
  "repairDone": "Fait ; nouvelle vérification",
  "aiPrompt": "Voici le contrôle d'un hôte Foundation Sunshine (les contrôles de ce PC et de Sunshine). Trouvez les causes et donnez les corrections dans l'ordre.",
  "aiOffline": "ne répond pas"
}
