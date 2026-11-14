export default {
  "source": "來源",
  "prepTitle": "顯示器設定",
  "prepLabel": "串流時的顯示器設定",
  "preps": {
    "no_operation": {
      "title": "不變更",
      "text": "不修改顯示器設定，需自行確保顯示器狀態"
    },
    "ensure_active": {
      "title": "啟用此顯示器",
      "text": "若顯示器未啟用，則啟用它"
    },
    "ensure_primary": {
      "title": "設為主要顯示器",
      "text": "啟用該顯示器並設為主要顯示器"
    },
    "ensure_only_display": {
      "title": "僅使用此顯示器",
      "text": "中斷其他顯示器的連線"
    },
    "ensure_secondary": {
      "title": "延伸顯示器",
      "text": "在基地虛擬顯示器上延伸桌面"
    }
  },
  "options": "選項",
  "reuse": "所有客戶端複用同一基地虛擬顯示器",
  "reuseText": "不建議開啟：切換客戶端更快，但無法記住各客戶端的螢幕縮放。",
  "headless": "主機沒有顯示器時自動建立",
  "displayRules": "解析度與重新整理率",
  "rulesFooter": "“最佳化遊戲設定”需要在 Moonlight 客戶端中開啟才會生效。",
  "follow": "串流中跟隨主機解析度變化",
  "advanced": "高階",
  "vsync": "虛擬屏串流時強制 NVIDIA 垂直同步",
  "vsyncText": "臨時把 NVIDIA 全域性垂直同步設為“開”，改善部分 DLSS 插幀遊戲在虛擬屏上的捕獲幀率。",
  "vulkan": "基地虛擬顯示器 Vulkan HDR 相容",
  "vulkanText": "幫助 Vulkan 遊戲在基地虛擬顯示器上識別 HDR。僅在 HDR 串流期間啟用，驗證失敗也不會中斷串流。",
  "vulkanStatus": {
    "disabled": "已關閉",
    "loading": "正在檢查相容元件…",
    "unavailable": "未安裝相容元件",
    "waiting": "已就緒，正在等待 HDR 基地虛擬顯示器",
    "idle": "Vulkan HDR 已就緒",
    "validating": "正在檢測 Vulkan HDR 輸出…",
    "enabled": "已為當前 HDR 串流啟用",
    "error": "檢測失敗，不影響正常串流"
  },
  "vulkanValidate": "檢測當前顯示器",
  "vulkanValidating": "正在檢測…",
  "vulkanHint": "啟動一個 HDR 基地虛擬顯示器後即可檢測。",
  "confirmTitle": "要修改“{name}”嗎？",
  "confirmChange": "確認修改",
  "saveFailed": "沒有儲存成功：{error}",
  "risk": {
    "vsync": "它會臨時改變 NVIDIA 全域性垂直同步，可能影響串流期間啟動的其他遊戲；最後一個相關會話結束後恢復。請在啟動遊戲前儲存。",
    "vulkan": "只在 HDR 串流期間生效；檢測失敗不會中斷串流。",
    "dolby": "儲存後需要重新建立基地虛擬顯示器才會生效。",
    "customEdid": "自定義 EDID 風險最高：檔案不對可能讓基地虛擬顯示器無法建立。出問題時請先刪除自定義檔案並切回內建模式。",
    "reload": "重新載入驅動時基地虛擬顯示器會短暫消失，正在進行的串流會中斷。",
    "edidProfile": "儲存後需要重新建立基地虛擬顯示器，Windows 才會重新讀取 EDID。選錯版本可能讓 HDR 或某些解析度不可用。",
    "cursor": "這是驅動向 Windows 宣告的能力。改錯可能讓游標消失或閃爍；改動在下次建立基地虛擬顯示器時生效。"
  },
  "qualityTitle": "畫質",
  "driverTitle": "驅動與診斷",
  "tier3": "專家",
  "edidProfile": "內建 EDID 版本",
  "edidProfileText": "基地虛擬顯示器向 Windows 報告的內建 EDID。自動會按主機系統選擇：Win10 22H2 用相容版，Win11 及以上用現代版。",
  "edidProfileIgnored": "已啟用自定義 EDID，內建版本不起作用。",
  "edidProfiles": {
    "auto": {
      "title": "自動",
      "text": "按主機系統選擇"
    },
    "legacy": {
      "title": "相容",
      "text": "EDID 1.3，相容面最廣"
    },
    "modern": {
      "title": "現代"
    }
  },
  "preventSpoof": "不偽裝廠商資訊",
  "preventSpoofText": "使用自定義 EDID 時，不讓驅動改寫其中的廠商。只在確有需要時開啟。",
  "ceaOverride": "補入 CEA 擴充套件塊",
  "ceaOverrideText": "為自定義 EDID 覆蓋或加入內建的 CEA 擴充套件塊，使它能宣告 HDR。",
  "cursorTitle": "游標",
  "cursorHint": "預設值適合所有人；較舊的 Intel 處理器可能只支援 64×64。游標始終由驅動匯出，由主機決定畫進畫面還是交給客戶端。",
  "cursorMax": "游標最大尺寸",
  "alphaCursor": "32 位透明游標",
  "alphaCursorText": "絕大多數游標都是這種格式。",
  "xorCursor": "異或游標支援",
  "xorCursorText": "不瞭解就不要改。",
  "xorLevels": {
    "1": "不支援",
    "2": "完整支援",
    "3": "軟體模擬"
  }
}
