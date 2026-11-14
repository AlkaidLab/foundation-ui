export default
{
  "title": "Revisión",
  "start": "Iniciar la revisión",
  "again": "Comprobar de nuevo",
  "progress": "Comprobando {done}/{total}",
  "done": "Tardó {s} s",
  "groups": {
    "service": "Servicio Sunshine",
    "install": "Instalación",
    "process": "Procesos y puertos",
    "drivers": "Controladores",
    "gpu": "Gráficos y controlador",
    "encoder": "Codificadores",
    "capture": "Captura de pantalla",
    "input": "Entrada y mandos",
    "network": "Red",
    "system": "Sistema",
    "host": "Estado del host"
  },
  "sources": {
    "local": "Este PC"
  },
  "sourceTip": {
    "local": "Lo comprueba el panel; Sunshine no tiene que estar en ejecución",
    "host": "Lo comprueba Sunshine; tiene que estar en ejecución"
  },
  "states": {
    "idle": "No iniciado",
    "queued": "En cola",
    "running": "Comprobando…",
    "offline": "Sunshine no respondió, así que este grupo no se comprobó"
  },
  "offlineTitle": "Sunshine no respondió: {n} grupos sin comprobar",
  "offlineNext": "Ponga Sunshine en marcha primero (el servicio y Procesos y puertos dicen por qué no) y vuelva a comprobar.",
  "hostOffline": "Sunshine no está en ejecución: solo las comprobaciones de este PC tienen resultados",
  "sections": {
    "local": "Comprobaciones de este PC",
    "host": "Comprobaciones de Sunshine"
  },
  "plan": {
    "title": "{n} grupos",
    "text": "{local} grupos los comprueba el propio panel y funcionan con Sunshine detenido; los otros {host} los comprueba Sunshine.",
    "textOffline": "Sunshine no está en ejecución: solo se pueden comprobar los {local} grupos de este PC."
  },
  "what": {
    "service": "Estado, tipo de inicio, último código de salida",
    "install": "Carpeta de instalación, versión y compilación",
    "process": "Puertos en uso, errores al final del registro",
    "drivers": "Foundation Virtual Display, ViGEmBus, ratón virtual, USB/IP",
    "gpu": "Tarjetas gráficas, versiones de controlador, qué tarjeta codifica",
    "capture": "Un fotograma de prueba",
    "vdd": "Controlador, HDR, frecuencia",
    "audio": "Dispositivo de salida, tarjeta de sonido virtual, micrófono",
    "input": "ViGEmBus, DualSense, reenvío USB",
    "network": "Puertos, cortafuegos, UPnP, internet, mesh",
    "system": "Espacio en disco, sincronización de hora, cuenta, reinicio pendiente",
    "host": "Versión, tiempo en marcha, fallos, errores de configuración"
  },
  "last": {
    "title": "Última comprobación {ago}",
    "empty": "La última comprobación no obtuvo ningún resultado",
    "ago": {
      "now": "ahora mismo",
      "min": "hace {n} min",
      "hour": "hace {n} h",
      "day": "hace {n} d"
    }
  },
  "checkedAt": "Comprobado {at} ({ago})",
  "none": {
    "title": "Ninguna comprobación dio un resultado",
    "text": "Ninguno de los {n} grupos respondió, así que este PC aún no puede llamarse bien o averiado.",
    "reason": "Primer motivo: {why}"
  },
  "failure": {
    "why": "Por qué",
    "next": "Qué hacer",
    "detail": "Qué volvió",
    "http": "estado {status}",
    "hit": "{n} grupos: {names}"
  },
  "status": {
    "pass": "Aceptar",
    "warn": "Advertencia",
    "fail": "Problema",
    "skip": "Sin comprobar"
  },
  "counts": {
    "fail": "{n} problemas",
    "warn": "{n} avisos",
    "skip": "{n} sin comprobar",
    "pass": "{n} correctos",
    "silent": "{n} grupos sin resultado"
  },
  "allGood": "Todo correcto",
  "errors": {
    "unsupported": {
      "why": "Esta versión no tiene esta comprobación",
      "next": "Actualice Sunshine (o el panel) y vuelva a comprobar."
    },
    "auth": {
      "why": "Sesión cerrada: Sunshine rechazó la petición",
      "next": "Vuelva a iniciar sesión y compruebe de nuevo."
    },
    "invalid": {
      "why": "La respuesta no es un resultado de revisión; lo que respondió quizá no es un host Sunshine",
      "next": "Compruebe de nuevo; si sigue así, exporte el informe y envíe comentarios con lo que volvió."
    },
    "failed": {
      "why": "La comprobación falló y no dio resultado",
      "next": "Compruebe de nuevo; si vuelve a fallar, exporte el informe y envíe comentarios con lo que volvió."
    }
  },
  "stream": {
    "live": "Hay una transmisión: {n} comprobaciones no se pueden hacer y no cuentan ni como correctas ni como problema",
    "label": {
      "skipped": "No comprobado durante la transmisión",
      "disturbed": "Poco fiable durante la transmisión",
      "routed": "Poco fiable durante la transmisión"
    },
    "why": {
      "skipped": "Hay una transmisión y una sonda usaría la GPU y alteraría la imagen, así que esto no se comprobó. Compruebe de nuevo cuando termine.",
      "disturbed": "Esto se midió durante una transmisión y puede ser la respuesta de la transmisión, así que no cuenta ni como correcto ni como problema. Compruebe de nuevo cuando termine.",
      "routed": "Mientras transmite, Sunshine toma la salida de audio, así que el dispositivo leído ahora no es el de un PC en reposo y no se puede juzgar. Compruebe de nuevo cuando termine."
    },
    "read": "Leído: {detail}"
  },
  "rerunGroup": "Comprobar de nuevo este grupo",
  "export": "Exportar el informe",
  "ai": "Preguntar a Mita AI",
  "fix": {
    "setting": "Abrir el ajuste",
    "page": "Abrir {page}",
    "rerun": "Comprobar de nuevo",
    "restart": "Reiniciar Sunshine",
    "link": "Ver cómo",
    "repair": "Reparar",
    "start": "Iniciar Sunshine"
  },
  "pages": {
    "network": "Red",
    "display": "Pantalla",
    "components": "Componentes",
    "logs": "Registros y diagnóstico",
    "config": "Archivos de configuración",
    "update": "Acerca de y actualizaciones"
  },
  "confirm": {
    "will": "Qué hace",
    "admin": "Necesita derechos de administrador: Windows pide confirmar.",
    "live": "Hay una transmisión: termina cuando esto se ejecuta. Si controla este PC por esa transmisión, pierde la conexión y quizá tenga que volver a este PC.",
    "run": "Ejecutar",
    "cancel": "Cancelar"
  },
  "fixAt": "Repárelo en {group} › {item}; una reparación lo arregla también aquí.",
  "repairFailed": "No hecho: {error}",
  "repairDone": "Hecho; comprobando de nuevo",
  "aiPrompt": "Aquí está la revisión de un host Foundation Sunshine (las comprobaciones de este PC y de Sunshine). Encuentre las causas y dé los arreglos en orden.",
  "aiOffline": "no responde"
}
