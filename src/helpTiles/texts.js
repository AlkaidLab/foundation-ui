import { canonicalLocale } from '../locale/texts/resolve.js'
// The words of the four tiles at the top of 帮助与关于. Short on purpose: a tile has 116 px of text at the least. English is the base; a language that has no entry reads English
// for that key (the per-key fallback of every text table of the kit). en_GB and en_US read English.
//   update: 软件更新 (upToDate, available, checking, failed, notChecked: the state line; actCheck, actUpdate, actRetry: the action)
//   doctor: 主机体检 (doctorOk, doctorNone: the value; toFix: the unit after the number of items that need a look; actStart, actRerun)
//   feedback: 反馈问题 (repliesUnit: after the number of unread replies; submitted: after the number of reports; stProcessing, stReplied, stFixed: the state of the newest one)
//   downloads: 客户端下载

const EN = {
  update: 'Software update', upToDate: 'Up to date', available: 'Update available', checking: 'Checking…', failed: 'Check failed', notChecked: 'Not checked', actCheck: 'Check', actUpdate: 'Update', actRetry: 'Retry',
  doctor: 'Host check', doctorOk: 'All good', doctorNone: 'Not run', toFix: 'to fix', actStart: 'Start', actRerun: 'Run again',
  feedback: 'Report a problem', repliesUnit: 'new replies', submitted: 'sent', stProcessing: 'In progress', stReplied: 'Replied', stFixed: 'Fixed', actWrite: 'Write', actReplies: 'View',
  downloads: 'Client downloads', actDownload: 'Download',
  group: 'Help and updates',
}

const ZH = {
  update: '软件更新', upToDate: '已是最新', available: '有新版本', checking: '正在检查…', failed: '检查失败', notChecked: '尚未检查', actCheck: '检查更新', actUpdate: '更新', actRetry: '重试',
  doctor: '主机体检', doctorOk: '正常', doctorNone: '未体检', toFix: '项待处理', actStart: '开始体检', actRerun: '重新体检',
  feedback: '反馈问题', repliesUnit: '条新回复', submitted: '条已提交', stProcessing: '处理中', stReplied: '已回复', stFixed: '已修复', actWrite: '写反馈', actReplies: '查看回复',
  downloads: '客户端下载', actDownload: '下载',
  group: '帮助与更新',
}

const ZH_TW = {
  update: '軟體更新', upToDate: '已是最新', available: '有新版本', checking: '正在檢查…', failed: '檢查失敗', notChecked: '尚未檢查', actCheck: '檢查更新', actUpdate: '更新', actRetry: '重試',
  doctor: '主機體檢', doctorOk: '正常', doctorNone: '未體檢', toFix: '項待處理', actStart: '開始體檢', actRerun: '重新體檢',
  feedback: '回報問題', repliesUnit: '則新回覆', submitted: '則已提交', stProcessing: '處理中', stReplied: '已回覆', stFixed: '已修復', actWrite: '寫回報', actReplies: '查看回覆',
  downloads: '用戶端下載', actDownload: '下載',
  group: '說明與更新',
}

const BY = {
  de: {
    update: 'Software-Update', upToDate: 'Aktuell', available: 'Update verfügbar', checking: 'Prüfe …', failed: 'Prüfung fehlgeschlagen', notChecked: 'Nicht geprüft', actCheck: 'Prüfen', actUpdate: 'Update', actRetry: 'Erneut',
    doctor: 'Host-Check', doctorOk: 'Alles gut', doctorNone: 'Offen', toFix: 'offen', actStart: 'Starten', actRerun: 'Wiederholen',
    feedback: 'Problem melden', repliesUnit: 'neue Antworten', submitted: 'gesendet', stProcessing: 'In Arbeit', stReplied: 'Beantwortet', stFixed: 'Behoben', actWrite: 'Schreiben', actReplies: 'Ansehen',
    downloads: 'Client-Downloads', actDownload: 'Laden', group: 'Hilfe und Updates',
  },
  fr: {
    update: 'Mise à jour', upToDate: 'À jour', available: 'Mise à jour disponible', checking: 'Vérification…', failed: 'Échec de la vérification', notChecked: 'Non vérifié', actCheck: 'Vérifier', actUpdate: 'Mettre à jour', actRetry: 'Réessayer',
    doctor: 'Bilan de l’hôte', doctorOk: 'Tout bon', doctorNone: 'Non lancé', toFix: 'à traiter', actStart: 'Lancer', actRerun: 'Relancer',
    feedback: 'Signaler un problème', repliesUnit: 'nouvelles réponses', submitted: 'envoyés', stProcessing: 'En cours', stReplied: 'Répondu', stFixed: 'Corrigé', actWrite: 'Écrire', actReplies: 'Voir',
    downloads: 'Clients à télécharger', actDownload: 'Obtenir', group: 'Aide et mises à jour',
  },
  es: {
    update: 'Actualización', upToDate: 'Al día', available: 'Hay una actualización', checking: 'Comprobando…', failed: 'Error al comprobar', notChecked: 'Sin comprobar', actCheck: 'Comprobar', actUpdate: 'Actualizar', actRetry: 'Reintentar',
    doctor: 'Revisión del host', doctorOk: 'Todo bien', doctorNone: 'Sin hacer', toFix: 'por revisar', actStart: 'Iniciar', actRerun: 'Repetir',
    feedback: 'Informar de un problema', repliesUnit: 'respuestas nuevas', submitted: 'enviados', stProcessing: 'En curso', stReplied: 'Respondido', stFixed: 'Corregido', actWrite: 'Escribir', actReplies: 'Ver',
    downloads: 'Descarga de clientes', actDownload: 'Descargar', group: 'Ayuda y actualizaciones',
  },
  it: {
    update: 'Aggiornamento', upToDate: 'Aggiornato', available: 'Aggiornamento disponibile', checking: 'Controllo…', failed: 'Controllo non riuscito', notChecked: 'Non controllato', actCheck: 'Controlla', actUpdate: 'Aggiorna', actRetry: 'Riprova',
    doctor: 'Controllo host', doctorOk: 'Tutto ok', doctorNone: 'Non fatto', toFix: 'da vedere', actStart: 'Avvia', actRerun: 'Ripeti',
    feedback: 'Segnala un problema', repliesUnit: 'nuove risposte', submitted: 'inviati', stProcessing: 'In corso', stReplied: 'Risposto', stFixed: 'Risolto', actWrite: 'Scrivi', actReplies: 'Vedi',
    downloads: 'Download dei client', actDownload: 'Scarica', group: 'Aiuto e aggiornamenti',
  },
  ja: {
    update: 'ソフトウェア更新', upToDate: '最新です', available: '新しいバージョン', checking: '確認中…', failed: '確認に失敗', notChecked: '未確認', actCheck: '更新を確認', actUpdate: '更新', actRetry: '再試行',
    doctor: 'ホスト診断', doctorOk: '正常', doctorNone: '未実行', toFix: '件要確認', actStart: '診断開始', actRerun: '再診断',
    feedback: '問題を報告', repliesUnit: '件の返信', submitted: '件を送信', stProcessing: '対応中', stReplied: '返信あり', stFixed: '修正済み', actWrite: '報告する', actReplies: '返信を見る',
    downloads: 'クライアント', actDownload: '入手', group: 'ヘルプと更新',
  },
  ko: {
    update: '소프트웨어 업데이트', upToDate: '최신 버전', available: '새 버전 있음', checking: '확인 중…', failed: '확인 실패', notChecked: '확인 전', actCheck: '업데이트 확인', actUpdate: '업데이트', actRetry: '다시 시도',
    doctor: '호스트 점검', doctorOk: '정상', doctorNone: '점검 전', toFix: '건 확인 필요', actStart: '점검 시작', actRerun: '다시 점검',
    feedback: '문제 신고', repliesUnit: '개의 새 답장', submitted: '건 전송됨', stProcessing: '처리 중', stReplied: '답변됨', stFixed: '수정됨', actWrite: '작성', actReplies: '답장 보기',
    downloads: '클라이언트', actDownload: '받기', group: '도움말 및 업데이트',
  },
  ru: {
    update: 'Обновление', upToDate: 'Актуально', available: 'Есть обновление', checking: 'Проверка…', failed: 'Сбой проверки', notChecked: 'Не проверялось', actCheck: 'Проверить', actUpdate: 'Обновить', actRetry: 'Повторить',
    doctor: 'Проверка хоста', doctorOk: 'Всё ок', doctorNone: 'Не было', toFix: 'к разбору', actStart: 'Запустить', actRerun: 'Ещё раз',
    feedback: 'Сообщить о проблеме', repliesUnit: 'новых ответа', submitted: 'отправлено', stProcessing: 'В работе', stReplied: 'Есть ответ', stFixed: 'Исправлено', actWrite: 'Написать', actReplies: 'Открыть',
    downloads: 'Клиенты', actDownload: 'Скачать', group: 'Справка и обновления',
  },
  pt_BR: {
    update: 'Atualização', upToDate: 'Em dia', available: 'Atualização disponível', checking: 'Verificando…', failed: 'Falha na verificação', notChecked: 'Não verificado', actCheck: 'Verificar', actUpdate: 'Atualizar', actRetry: 'Tentar de novo',
    doctor: 'Verificação do host', doctorOk: 'Tudo ok', doctorNone: 'Não feita', toFix: 'a revisar', actStart: 'Iniciar', actRerun: 'Repetir',
    feedback: 'Relatar um problema', repliesUnit: 'novas respostas', submitted: 'enviados', stProcessing: 'Em andamento', stReplied: 'Respondido', stFixed: 'Corrigido', actWrite: 'Escrever', actReplies: 'Ver',
    downloads: 'Download dos clientes', actDownload: 'Baixar', group: 'Ajuda e atualizações',
  },
  pt: {
    update: 'Atualização', upToDate: 'Atualizado', available: 'Atualização disponível', checking: 'A verificar…', failed: 'Falha na verificação', notChecked: 'Não verificado', actCheck: 'Verificar', actUpdate: 'Atualizar', actRetry: 'Tentar de novo',
    doctor: 'Verificação do anfitrião', doctorOk: 'Tudo bem', doctorNone: 'Não feita', toFix: 'a rever', actStart: 'Iniciar', actRerun: 'Repetir',
    feedback: 'Comunicar um problema', repliesUnit: 'novas respostas', submitted: 'enviados', stProcessing: 'Em curso', stReplied: 'Respondido', stFixed: 'Corrigido', actWrite: 'Escrever', actReplies: 'Ver',
    downloads: 'Transferir clientes', actDownload: 'Obter', group: 'Ajuda e atualizações',
  },
  bg: {
    update: 'Актуализация', upToDate: 'Актуална', available: 'Има актуализация', checking: 'Проверка…', failed: 'Неуспешна проверка', notChecked: 'Непроверена', actCheck: 'Провери', actUpdate: 'Обнови', actRetry: 'Опитай пак',
    doctor: 'Проверка на хоста', doctorOk: 'Всичко ок', doctorNone: 'Няма', toFix: 'за преглед', actStart: 'Старт', actRerun: 'Пак',
    feedback: 'Съобщи за проблем', repliesUnit: 'нови отговора', submitted: 'изпратени', stProcessing: 'В работа', stReplied: 'Отговорено', stFixed: 'Поправено', actWrite: 'Пиши', actReplies: 'Виж',
    downloads: 'Клиенти', actDownload: 'Изтегли', group: 'Помощ и актуализации',
  },
  cs: {
    update: 'Aktualizace', upToDate: 'Aktuální', available: 'Je nová verze', checking: 'Kontrola…', failed: 'Kontrola selhala', notChecked: 'Nezkontrolováno', actCheck: 'Zkontrolovat', actUpdate: 'Aktualizovat', actRetry: 'Znovu',
    doctor: 'Kontrola hostitele', doctorOk: 'V pořádku', doctorNone: 'Neběželo', toFix: 'k řešení', actStart: 'Spustit', actRerun: 'Znovu',
    feedback: 'Nahlásit problém', repliesUnit: 'nové odpovědi', submitted: 'odesláno', stProcessing: 'Řeší se', stReplied: 'Odpovězeno', stFixed: 'Opraveno', actWrite: 'Napsat', actReplies: 'Zobrazit',
    downloads: 'Stažení klientů', actDownload: 'Stáhnout', group: 'Nápověda a aktualizace',
  },
  pl: {
    update: 'Aktualizacja', upToDate: 'Aktualne', available: 'Jest aktualizacja', checking: 'Sprawdzanie…', failed: 'Błąd sprawdzania', notChecked: 'Niesprawdzone', actCheck: 'Sprawdź', actUpdate: 'Aktualizuj', actRetry: 'Ponów',
    doctor: 'Kontrola hosta', doctorOk: 'Jest OK', doctorNone: 'Nie było', toFix: 'do sprawdzenia', actStart: 'Start', actRerun: 'Jeszcze raz',
    feedback: 'Zgłoś problem', repliesUnit: 'nowe odpowiedzi', submitted: 'wysłane', stProcessing: 'W toku', stReplied: 'Odpowiedziano', stFixed: 'Naprawione', actWrite: 'Napisz', actReplies: 'Zobacz',
    downloads: 'Pobierz klienty', actDownload: 'Pobierz', group: 'Pomoc i aktualizacje',
  },
  sv: {
    update: 'Programuppdatering', upToDate: 'Uppdaterad', available: 'Uppdatering finns', checking: 'Kontrollerar…', failed: 'Kontrollen misslyckades', notChecked: 'Inte kontrollerad', actCheck: 'Kontrollera', actUpdate: 'Uppdatera', actRetry: 'Försök igen',
    doctor: 'Värdkontroll', doctorOk: 'Allt bra', doctorNone: 'Inte körd', toFix: 'att se över', actStart: 'Starta', actRerun: 'Kör igen',
    feedback: 'Rapportera ett problem', repliesUnit: 'nya svar', submitted: 'skickade', stProcessing: 'Pågår', stReplied: 'Besvarad', stFixed: 'Åtgärdad', actWrite: 'Skriv', actReplies: 'Visa',
    downloads: 'Hämta klienter', actDownload: 'Hämta', group: 'Hjälp och uppdateringar',
  },
  tr: {
    update: 'Yazılım güncellemesi', upToDate: 'Güncel', available: 'Güncelleme var', checking: 'Denetleniyor…', failed: 'Denetim başarısız', notChecked: 'Denetlenmedi', actCheck: 'Denetle', actUpdate: 'Güncelle', actRetry: 'Yeniden dene',
    doctor: 'Ana makine kontrolü', doctorOk: 'Sorun yok', doctorNone: 'Yapılmadı', toFix: 'bakılacak', actStart: 'Başlat', actRerun: 'Tekrarla',
    feedback: 'Sorun bildir', repliesUnit: 'yeni yanıt', submitted: 'gönderildi', stProcessing: 'İnceleniyor', stReplied: 'Yanıtlandı', stFixed: 'Düzeltildi', actWrite: 'Yaz', actReplies: 'Gör',
    downloads: 'İstemci indirme', actDownload: 'İndir', group: 'Yardım ve güncellemeler',
  },
  uk: {
    update: 'Оновлення', upToDate: 'Актуально', available: 'Є оновлення', checking: 'Перевірка…', failed: 'Помилка перевірки', notChecked: 'Не перевірено', actCheck: 'Перевірити', actUpdate: 'Оновити', actRetry: 'Ще раз',
    doctor: 'Перевірка хоста', doctorOk: 'Усе ок', doctorNone: 'Не було', toFix: 'до розгляду', actStart: 'Запустити', actRerun: 'Ще раз',
    feedback: 'Повідомити про проблему', repliesUnit: 'нових відповіді', submitted: 'надіслано', stProcessing: 'У роботі', stReplied: 'Є відповідь', stFixed: 'Виправлено', actWrite: 'Написати', actReplies: 'Відкрити',
    downloads: 'Клієнти', actDownload: 'Скачати', group: 'Довідка та оновлення',
  },
}

/** The words of the tiles in a language: zh_TW reads its own, then Chinese, then English; every other language reads itself, then English. */
export const helpTileTexts = (locale = 'en') => {
  const code = canonicalLocale(locale)
  if (code === 'zh') return { ...EN, ...ZH }
  if (code === 'zh_TW') return { ...EN, ...ZH, ...ZH_TW }
  return { ...EN, ...(BY[code] || {}) }
}

export const HELP_TILE_LOCALES = Object.freeze(['en', 'zh', 'zh_TW', ...Object.keys(BY)])
export const HELP_TILE_KEYS = Object.freeze(Object.keys(EN))
