# i18n glossary (2026-11-09)

Shared by the control panel, the Web UI and the shared UI package.
Both language passes append terms here. A term that already has a translation in the Web locale files stays that word.

## Fallback (per key, never per file)

- `zh_TW` uses the Traditional Chinese string, else the Simplified Chinese string, else English.
- `zh` uses Simplified Chinese, else English.
- Every other language uses its own string, else English. It does not fall through to Chinese.
- A missing key, an empty string or null is not a translation. The reader must never see a raw key or a blank stand-in when English (or Chinese, for zh_TW) has a real string.
- Placeholders ({name}, {n}, {port}), HTML tags, keyboard keys (Win + R) and units (fps, Hz, Mbps, ms) stay exactly as in English.
- German and Russian may grow. Keep a single-line string within 1.4 times the English length where the row is one line.

## Names left untranslated except in zh and zh_TW

- Foundation Sunshine, Moonlight, Moonlight V+
- Panel names as written in the English panel table (en.js)
- ZakoDisplay. In zh and zh_TW the name already in those tables is 杂鱼虚拟显示器 (Traditional uses the form already in zh_TW). The team may rename it later.
- DualSense, DS4, Xbox, usbip-win2, USB/IP, VB-CABLE, NVENC, AMF, QSV, HDR
- Mirror酱 is MirrorChyan outside Chinese. 米塔 AI is Mita AI. 薇薇 is Weiwei.
- Latin product and protocol names stay in Latin: Steam, Epic, GOG, ZeroTier, Tailscale, EasyTier, GitHub, WebUI, PIN, QR, HWiNFO, App Store, AppGallery.

## The 20 codes, each in its own name

The first choice of a picker is 跟随系统 / Follow system (system), then these codes:

- `en` — English
- `zh` — 简体中文
- `zh_TW` — 繁體中文
- `en_GB` — English (UK)
- `en_US` — English (US)
- `de` — Deutsch
- `fr` — Français
- `es` — Español
- `it` — Italiano
- `ja` — 日本語
- `ko` — 한국어
- `ru` — Русский
- `pt_BR` — Português (Brasil)
- `pt` — Português
- `bg` — Български
- `cs` — Čeština
- `pl` — Polski
- `sv` — Svenska
- `tr` — Türkçe
- `uk` — Українська

## House terms already used by the Web locale files

Take the existing translation. Do not invent a second word for the same English string.

| English | zh | zh_TW | de | fr | es | it | ja | ko | ru | pt_BR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Apply | 应用 | 套用 | Übernehmen | Appliquer | Aplicar | Applica | 適用 | 적용 | Применить | Aplicar |
| Automatic | 自动 | 自動 | Automatisch | Automatique | Automático | Automatico | 自動 | 자동 설정 | Автоматически | Automático |
| Autodetect (recommended) | 自动检测（推荐） | 自動偵測（建議） | AutoDetection (empfohlen) | Détection automatique (recommandé) | Autodetectar (recomendado) | Rilevamento automatico (consigliato) | 自動検出 (推奨) | 자동 감지 (권장) | Автоопределение (рекомендуется) | Autodetecção (recomendado) |
| (beta) | (测试版) | （測試版） | (Beta) | (bêta) |  |  | (ベータ版) | (베타) | (бета) |  |
| Cancel | 取消 | 取消 | Abbrechen | Annuler | Cancelar | Annulla | キャンセル | 취소 | Отмена | Cancelar |
| Close | 关闭 | 關閉 | Schließen | Fermer | Cerrar | Chiudi | 閉じる | 닫기 | Закрыть | Fechar |
| Copied to clipboard | 已复制到剪贴板 | 已複製到剪貼板 | In Zwischenablage kopiert | Copié dans le presse-papiers | Copiado al portapapeles | Copiato negli appunti | クリップボードにコピーしました | 클립보드에 복사됨 | Скопировано в буфер обмена | Copiado para a área de transferência |
| Copy | 复制 | 複製 | Kopieren | Copier | Copiar | Copia | コピー | 복사 | Копировать | Copiar |
| Delete | 删除 | 刪除 | Löschen | Supprimer | Eliminar | Elimina | 削除 | 삭제 | Удалить | Excluir |
| Description | 说明 | 說明 | Beschreibung |  | Descripción | Descrizione | 説明 | 설명 | Описание | Descrição |
| Disabled | 禁用 | 已停用 | Deaktiviert | Désactivé | Deshabilitado | Disattivato | 無効 | 비활성화 | Отключено | Desativado |
| Disabled (default) | 禁用（默认） | 已停用（預設） | Deaktiviert (Standard) | Désactivé (par défaut) | Desactivado (por defecto) | Disabilitato (predefinito) | 無効 (デフォルト) | 사용 안 함(기본값) | Отключено (по умолчанию) | Desativado (padrão) |
| Dismiss | 忽略 | 關閉 | Verwerfen | Ignorer | Descartar | Ignora | 却下する | 무시 | Отклонить | Dispensar |
| Do Command | 打开时执行命令 | 執行指令 | Befehl ausführen | Commande de début | Hacer comando | Esegui Comando | コマンド実行 | 명령 수행 | Выполнить команду | Comando Do |
| Download | 下载 | 下載 | Herunterladen | Télécharger | Descargar | Scarica | ダウンロード | 다운로드 | Скачать | Baixar |
| Edit | 编辑 | 編輯 | Bearbeiten | Modifier | Editar | Modifica | 編集 | 편집 | Изменить | Editar |
| Elevated | 提权运行 | 提高權限 | Erhöhte | Élevée | Elevado | Come Admin | 管理者として実行 | 관리자 권한으로 실행 | Требуются | Elevado |
| Enabled | 启用 | 已啟用 | Aktiviert | Activé | Habilitado | Abilitato | 有効 | 활성화 | Включено | Ativado |
| Enabled (default) | 启用（默认） | 已啟用（預設值） | Aktiviert (Standard) | Activé (par défaut) | Habilitado (por defecto) | Abilitato (predefinito) | 有効 (デフォルト) | 활성화 (기본값) | Включено (по умолчанию) | Ativado (padrão) |
| Error | 错误 | 錯誤 | Fehler! | Erreur ! | ¡Error! | Errore! | エラー！ | 오류! | Ошибка! | Erro! |
| No changes | 没有变化 | 沒有變化 | Keine Änderungen | Aucune modification | No hay cambios | Nessuna modifica | 変更なし | 변경 사항 없음 | Нет изменений | Nenhuma alteração |
| Note: | 注： | 請注意： | Hinweis: | Note : | Nota: | Nota: | メモ: | 참고: | Примечание: | Observação: |
| Opens in a new tab | 在新标签页打开 | 在新分頁開啟 | Wird in einem neuen Tab geöffnet | S’ouvre dans un nouvel onglet | Se abre en una pestaña nueva | Apre in una nuova scheda | 新しいタブで開きます | 새 탭에서 열립니다 | Открывается в новой вкладке | Abre em uma nova aba |
| Password | 密码 | 密碼 | Passwort | Mot de passe | Contraseña |  | パスワード | 비밀번호 | Пароль | Senha |
| Remove | 移除 | 移除 | Entfernen | Supprimer | Eliminar | Rimuovi | 削除 | 제거 | Удалить | Remover |
| Run as Admin | 以管理员身份运行 | 以系統管理員身份執行 | Als Admin ausführen | Exécuter en tant qu'Administrateur | Ejecutar como administrador | Esegui come amministratore | 管理者として実行 | 관리자 권한으로 실행 | Права администратора | Executar como administrador |
| Save | 保存 | 節省 | Speichern | Sauvegarder | Guardar | Salva | 保存 | 저장 | Сохранить | Salvar |
| See More | 查看更多 | 查看更多資訊 | Mehr ansehen | Voir plus | Ver más | Vedi Altro | もっと見る | 자세히 보기 | Подробнее | Veja mais |
| Success! | 成功！ | 成功！ | Erfolgreich! | Succès ! | ¡Éxito! | Operazione riuscita! | 成功！ | 성공! | Успешно! | Sucesso! |
| Undo Command | 退出应用时要执行的命令 | 復原指令 | Befehl rückgängig machen | Commande de fin | Deshacer comando | Comando di Annullamento | 元に戻す | 명령 실행 취소 | Команда закрытия | Comando Desfazer |
| Username | 用户名 | 使用者名稱 | Benutzername | Nom d’utilisateur | Nombre de usuario | Nome utente | ユーザー名 | 사용자명 | Имя пользователя | Nome de usuário |
| Valid | 有效 | 有效 | Gültig | Valide | Válido | Valido | 有効 | 유효함 | Корректно | Válido |
| Warning! | 警告！ | 警告！ | Warnung! | Attention ! | ¡Advertencia! | Attenzione! | 警告！ | 경고! | Предупреждение! | Atenção! |
| Actions | 操作 | 行動 | Aktionen |  | Acciones | Azioni | アクション | 작업 | Действия | Ações |
| Add Commands | 添加命令 | 新增指令 | Befehle hinzufügen | Ajouter des commandes | Añadir comandos | Aggiungi comandi | コマンドを追加 | 명령어 추가 | Добавить команды | Adicionar comandos |
| Add New | 添加新应用 | 新增 | Neu hinzufügen | Ajouter une application | Añadir nuevo | Aggiungi nuovo | 新規追加 | 신규 추가 | Добавить новое | Adicionar novo |
| Advanced Options | 高级选项 | 進階選項 | Erweiterte Optionen | Options avancées | Opciones avanzadas | Opzioni avanzate | 詳細オプション | 고급 옵션 | Дополнительные параметры | Opções avançadas |
| Application Name | 应用名称 | 應用程式名稱 | Anwendungsname | Nom de l'application | Nombre de la aplicación | Nome applicazione | アプリケーション名 | 애플리케이션 이름 | Название приложения | Nome do aplicativo |
| Applications | 应用 | 應用程式一覽 | Anwendungen |  | Aplicaciones | Applicazioni | アプリケーション一覧 | 애플리케이션 | Приложения | Aplicativos |
| Basic Information | 基本信息 | 基本資訊 | Grundinformationen | Informations de base | Información básica | Informazioni di base | 基本情報 | 기본 정보 | Основная информация | Informações básicas |

## Where the strings live

Shared UI package: src/locale/texts/<code>/<module>.js exports a partial object (export default) with the same shape as that module English table.
Modules: announcement, appearance, coach, error, guide, homeCatalogue, homeEdit, remote, webAccess, b3, modeList, networkOverview, reach, vddPage, vdd, offline, source.

Desktop panel: src/renderer/desktop/i18n/<code>.js exports export const <code> = { ... }, the same shape as en.js. A partial object is allowed.

Web UI: src_assets/common/assets/web/public/assets/locale/<code>.json. Fill keys that are missing from the file, and strings that are still identical to English.

