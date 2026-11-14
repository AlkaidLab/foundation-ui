export default {
  "resolutionTitle": "基地虛擬顯示器支援的解析度",
  "rateTitle": "基地虛擬顯示器支援的重新整理率",
  "dialogTitle": "支援的解析度與重新整理率",
  "edit": "編輯",
  "save": "儲存",
  "none": "未設定",
  "count": "{n} 項",
  "resolution": {
    "add": "新增解析度",
    "section": "解析度",
    "hint": "最多 25 項，按清單順序寫入驅動",
    "editItem": "修改解析度",
    "ok": "確定",
    "errors": {
      "invalid": "格式應為「寬x高」，例如 1920x1080",
      "range": "寬和高均須在 {min} 至 {max} 之間",
      "exists": "清單中已有該解析度",
      "minOne": "至少保留一個解析度",
      "full": "清單最多 {count} 項"
    }
  },
  "rate": {
    "add": "新增重新整理率",
    "section": "重新整理率",
    "hint": "最多 5 項，對所有解析度生效",
    "editItem": "修改重新整理率",
    "ok": "確定",
    "errors": {
      "invalid": "請輸入數值，最多三位小數，例如 60 或 59.94",
      "range": "重新整理率須在 {min} 至 {max} Hz 之間",
      "exists": "清單中已有該重新整理率",
      "minOne": "至少保留一個重新整理率",
      "full": "清單最多 {count} 項"
    }
  },
  "noteShort": "驅動重新載入後套用新清單。",
  "note": "驅動重新載入後套用新清單：正在執行的基地虛擬顯示器需重新建立（重新連線串流）後才會生效。若無變化，請在基地虛擬顯示器的驅動工具中選擇「重新載入驅動」，或重新啟動介面卡或 Windows。",
  "picker": {
    "resolution": {
      "name": "支援的解析度",
      "limit": "最多 {max} 項",
      "groups": { "16:9": "16:9", "16:10": "16:10", "21:9": "21:9", "32:9": "32:9", "custom": "自訂" },
      "custom": "自訂尺寸",
      "width": "寬",
      "height": "高"
    },
    "rate": {
      "name": "支援的重新整理率",
      "limit": "最多 {max} 項",
      "groups": { "common": "常用", "custom": "自訂" },
      "custom": "自訂重新整理率",
      "value": "重新整理率",
      "placeholder": "如 59.94"
    },
    "add": "新增",
    "offered": "用戶端可選",
    "sort": "依大小排序",
    "earlier": "前移",
    "later": "後移",
    "remove": "移除"
  }
}
