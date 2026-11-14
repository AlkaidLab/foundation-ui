export default
{
  "title": "Verificação",
  "start": "Iniciar a verificação",
  "again": "Verificar de novo",
  "progress": "Verificando {done}/{total}",
  "done": "Levou {s} s",
  "groups": {
    "service": "Serviço Sunshine",
    "install": "Instalação",
    "process": "Processos e portas",
    "gpu": "Gráficos e driver",
    "encoder": "Codificadores",
    "capture": "Captura de tela",
    "audio": "Áudio",
    "input": "Entrada e controles",
    "network": "Rede",
    "system": "Sistema",
    "host": "Estado do host"
  },
  "sources": {
    "local": "Este PC"
  },
  "sourceTip": {
    "local": "Verificado pelo painel; o Sunshine não precisa estar em execução",
    "host": "Verificado pelo Sunshine; ele precisa estar em execução"
  },
  "states": {
    "idle": "Não iniciado",
    "queued": "Na fila",
    "running": "Verificando…",
    "offline": "O Sunshine não respondeu, então este grupo não foi verificado"
  },
  "offlineTitle": "O Sunshine não respondeu: {n} grupos não verificados",
  "offlineNext": "Coloque o Sunshine em execução primeiro (o serviço e Processos e portas dizem por quê) e verifique de novo.",
  "hostOffline": "O Sunshine não está em execução: só as verificações deste PC têm resultados",
  "sections": {
    "local": "Verificações deste PC",
    "host": "Verificações do Sunshine"
  },
  "plan": {
    "title": "{n} grupos",
    "text": "{local} grupos são verificados pelo próprio painel e funcionam com o Sunshine parado; os outros {host} são verificados pelo Sunshine.",
    "textOffline": "O Sunshine não está em execução: só os {local} grupos deste PC podem ser verificados."
  },
  "what": {
    "service": "Estado, tipo de início, último código de saída",
    "install": "Pasta de instalação, versão e compilação",
    "process": "Portas em uso, erros no fim do registro",
    "drivers": "Foundation Virtual Display, ViGEmBus, mouse virtual, USB/IP",
    "gpu": "Placas de vídeo, versões do driver, qual placa codifica",
    "capture": "Um quadro de teste",
    "vdd": "Driver, HDR, taxa de atualização",
    "audio": "Dispositivo de saída, placa de som virtual, microfone",
    "input": "ViGEmBus, DualSense, encaminhamento USB",
    "network": "Portas, firewall, UPnP, internet, malha",
    "system": "Espaço em disco, sincronização de hora, conta, reinício pendente",
    "host": "Versão, tempo ativo, falhas, erros de configuração"
  },
  "last": {
    "title": "Última verificação {ago}",
    "empty": "A última verificação não teve resultado nenhum",
    "ago": {
      "now": "agora mesmo",
      "min": "há {n} min",
      "hour": "há {n} h",
      "day": "há {n} d"
    }
  },
  "checkedAt": "Verificado {at} ({ago})",
  "none": {
    "title": "Nenhuma verificação deu resultado",
    "text": "Nenhum dos {n} grupos respondeu, então este PC ainda não pode ser chamado de bom ou com defeito.",
    "reason": "Primeiro motivo: {why}"
  },
  "failure": {
    "why": "Por quê",
    "next": "O que fazer",
    "detail": "O que voltou",
    "http": "estado {status}",
    "hit": "{n} grupos: {names}"
  },
  "status": {
    "warn": "Aviso",
    "fail": "Problema",
    "skip": "Não verificado"
  },
  "counts": {
    "fail": "{n} problemas",
    "warn": "{n} avisos",
    "skip": "{n} não verificados",
    "pass": "{n} ok",
    "silent": "{n} grupos sem resultado"
  },
  "allGood": "Tudo certo",
  "errors": {
    "unsupported": {
      "why": "Esta versão não tem essa verificação",
      "next": "Atualize o Sunshine (ou o painel) e verifique de novo."
    },
    "auth": {
      "why": "Saiu: o Sunshine recusou o pedido",
      "next": "Entre de novo e verifique outra vez."
    },
    "invalid": {
      "why": "A resposta não é um resultado de verificação; quem respondeu pode não ser um host Sunshine",
      "next": "Verifique de novo; se continuar assim, exporte o relatório e envie um feedback com o que voltou."
    },
    "failed": {
      "why": "A verificação falhou e não deu resultado",
      "next": "Verifique de novo; se falhar outra vez, exporte o relatório e envie um feedback com o que voltou."
    }
  },
  "stream": {
    "live": "Há uma transmissão: {n} verificações não podem ser feitas e não contam como ok nem como problema",
    "label": {
      "skipped": "Não verificado durante a transmissão",
      "disturbed": "Pouco confiável durante a transmissão",
      "routed": "Pouco confiável durante a transmissão"
    },
    "why": {
      "skipped": "Há uma transmissão e uma sonda usaria a GPU e atrapalharia a imagem, então isto não foi verificado. Verifique de novo quando a transmissão terminar.",
      "disturbed": "Isto foi medido durante uma transmissão e pode ser a resposta dela, então não conta como ok nem como problema. Verifique de novo quando a transmissão terminar.",
      "routed": "Enquanto transmite, o Sunshine assume a saída de som, então o dispositivo lido agora não é o de um PC ocioso e não pode ser julgado. Verifique de novo quando a transmissão terminar."
    },
    "read": "Lido: {detail}"
  },
  "rerunGroup": "Verificar este grupo de novo",
  "export": "Exportar o relatório",
  "ai": "Perguntar à Mita AI",
  "fix": {
    "setting": "Abrir a configuração",
    "page": "Abrir {page}",
    "rerun": "Verificar de novo",
    "restart": "Reiniciar o Sunshine",
    "link": "Ver como",
    "repair": "Reparar",
    "start": "Iniciar o Sunshine"
  },
  "pages": {
    "network": "Rede",
    "audio": "Áudio",
    "display": "Tela",
    "components": "Componentes",
    "logs": "Registros e diagnóstico",
    "config": "Arquivos de configuração",
    "update": "Sobre e atualizações"
  },
  "confirm": {
    "will": "O que isso faz",
    "admin": "Precisa de direitos de administrador: o Windows pede confirmação.",
    "live": "Há uma transmissão: ela termina quando isto é executado. Se você controla este PC por essa transmissão, perde a conexão e talvez tenha de voltar a este PC.",
    "run": "Executar",
    "cancel": "Cancelar"
  },
  "fixAt": "Repare em {group} › {item}; um reparo corrige aqui também.",
  "repairFailed": "Não feito: {error}",
  "repairDone": "Feito; verificando de novo",
  "aiPrompt": "Aqui está a verificação de um host Foundation Sunshine (as verificações deste PC e do Sunshine). Encontre as causas e dê as correções em ordem.",
  "aiOffline": "não responde"
}
