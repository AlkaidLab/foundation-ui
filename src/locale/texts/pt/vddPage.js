export default {
  "source": "Fonte",
  "prepTitle": "Ecrãs durante uma transmissão",
  "prepLabel": "Combinação de ecrãs para transmitir",
  "preps": {
    "no_operation": {
      "title": "Sem operação",
      "text": "Deixa os ecrãs como estão; você garante que estão prontos"
    },
    "ensure_active": {
      "title": "Ativar o ecrã escolhido"
    },
    "ensure_primary": {
      "title": "Transmissão do ecrã principal",
      "text": "Liga o ecrã escolhido e torna-o o principal"
    },
    "ensure_only_display": {
      "title": "Apenas o ecrã escolhido"
    },
    "ensure_secondary": {
      "title": "Ecrã secundário (Foundation Virtual Display)"
    }
  },
  "options": "Opções",
  "reuse": "Um Foundation Virtual Display para todos os clientes",
  "reuseText": "Não recomendado: mudar de cliente é mais rápido, mas cada cliente deixa de manter a sua própria escala do ecrã.",
  "headless": "Criar um quando o host não tem ecrã",
  "displayRules": "Resolução e taxa de atualização",
  "rulesFooter": "Para isto funcionar, «Otimizar definições do jogo» tem de estar ativado no cliente Moonlight.",
  "follow": "Seguir as mudanças de resolução do host durante a transmissão",
  "advanced": "Avançado",
  "vsync": "Vsync NVIDIA forçado durante a transmissão para o Foundation Virtual Display",
  "vsyncText": "Liga temporariamente a sincronização vertical global da NVIDIA para ajudar a capturar alguns jogos com DLSS Frame Generation à cadência completa no Foundation Virtual Display.",
  "vulkan": "Compatibilidade Vulkan HDR para o Foundation Virtual Display",
  "vulkanText": "Ajuda os jogos Vulkan a detetar HDR no Foundation Virtual Display. Ativa só numa transmissão HDR; um teste falhado não interrompe a transmissão.",
  "vulkanStatus": {
    "disabled": "Desligado",
    "loading": "A verificar compatibilidade…",
    "unavailable": "Os componentes de compatibilidade não estão instalados",
    "waiting": "Pronto: à espera de um Foundation Virtual Display com HDR",
    "idle": "Pronto para Vulkan HDR",
    "validating": "A testar a apresentação Vulkan HDR…",
    "enabled": "Ativa para a transmissão HDR atual",
    "error": "O teste falhou; a transmissão não é afetada"
  },
  "vulkanValidate": "Testar o ecrã atual",
  "vulkanValidating": "A testar…",
  "vulkanHint": "Inicie um Foundation Virtual Display com HDR para permitir o teste.",
  "confirmTitle": "Mudar «{name}»?",
  "confirmChange": "Mudar",
  "cancel": "Cancelar",
  "saveFailed": "Não foi possível guardar: {error}",
  "risk": {
    "vsync": "Muda temporariamente a sincronização vertical global da NVIDIA e pode afetar outros jogos iniciados durante uma transmissão; é restaurada quando a última sessão termina. Guarde antes de iniciar o jogo.",
    "vulkan": "Aplica-se apenas durante uma transmissão HDR; um teste falhado não interrompe a transmissão.",
    "dolby": "O Foundation Virtual Display tem de ser criado de novo depois de guardar para isto ter efeito.",
    "customEdid": "O EDID personalizado é a opção mais arriscada: um ficheiro errado pode impedir a criação do Foundation Virtual Display. Se isso acontecer, apague o ficheiro personalizado e volte ao modo incorporado.",
    "reload": "O Foundation Virtual Display desaparece por um momento enquanto o controlador recarrega, e uma transmissão em curso é interrompida.",
    "edidProfile": "O Foundation Virtual Display tem de ser criado de novo depois de guardar para o Windows ler novamente o EDID. Uma versão errada pode tornar HDR ou algumas resoluções indisponíveis.",
    "cursor": "Isto é o que o controlador declara ao Windows. Um valor errado pode fazer o cursor desaparecer ou piscar; aplica-se da próxima vez que o Foundation Virtual Display for criado."
  },
  "qualityTitle": "Qualidade da imagem",
  "driverTitle": "Controlador e diagnóstico",
  "tier3": "Especialista",
  "edidProfile": "Versão EDID incorporada",
  "edidProfileText": "O EDID incorporado que o ecrã virtual comunica ao Windows. O automático escolhe segundo o sistema: o compatível no Windows 10 22H2, o moderno no Windows 11 e posteriores.",
  "edidProfileIgnored": "Está um EDID personalizado ativo, por isso a versão incorporada não tem efeito.",
  "edidProfiles": {
    "auto": {
      "title": "Automático",
      "text": "Segundo o sistema do host"
    },
    "legacy": {
      "title": "Compatível",
      "text": "EDID 1.3, a maior compatibilidade"
    },
    "modern": {
      "title": "Moderno",
      "text": "EDID 1.4, 10 bits, BT.2020, HDR completo"
    }
  },
  "preventSpoof": "Manter o fabricante como está",
  "preventSpoofText": "Com um EDID personalizado, o controlador não reescreve o fabricante. Ligue-o só se precisar.",
  "ceaOverride": "Adicionar o bloco de extensão CEA",
  "ceaOverrideText": "Substitui ou adiciona o bloco de extensão CEA incorporado de um EDID personalizado para que possa declarar HDR.",
  "cursorTitle": "Cursor",
  "cursorHint": "As predefinições servem todos; processadores Intel mais antigos podem suportar só 64×64. O cursor é sempre exportado pelo controlador; o host decide se é desenhado na imagem ou deixado ao cliente.",
  "cursorMax": "Maior cursor",
  "alphaCursor": "Cursor de 32 bits com alfa",
  "alphaCursorText": "A maioria dos cursores usa este formato.",
  "xorCursor": "Suporte a cursor XOR",
  "xorCursorText": "Não mexa se não souber o que faz.",
  "xorLevels": {
    "0": "Não inicializado",
    "1": "Nenhum",
    "2": "Completo",
    "3": "Emulação"
  }
}
