export default
{
  "resolutionTitle": "Foundation Virtual Display の解像度",
  "rateTitle": "Foundation Virtual Display のリフレッシュレート",
  "dialogTitle": "対応する解像度とリフレッシュレート",
  "edit": "編集",
  "save": "保存",
  "cancel": "キャンセル",
  "none": "未設定",
  "count": "{n} 件",
  "resolution": {
    "add": "解像度を追加",
    "placeholder": "例: 1920x1080",
    "section": "解像度",
    "hint": "最大 25 件。設定した順にドライバーへ書き込みます",
    "editItem": "解像度を編集",
    "cancelEdit": "キャンセル",
    "up": "上へ",
    "down": "下へ",
    "remove": "削除",
    "sort": "大きさで並べ替え",
    "errors": {
      "invalid": "「幅 x 高さ」で入力します。例: 1920x1080",
      "range": "幅と高さはそれぞれ {min} から {max} の間です",
      "exists": "この解像度は既に一覧にあります",
      "minOne": "解像度は少なくとも 1 つ残してください",
      "full": "一覧は最大 {count} 件です"
    }
  },
  "rate": {
    "add": "リフレッシュレートを追加",
    "placeholder": "例: 120 または 59.94",
    "section": "リフレッシュレート",
    "hint": "最大 5 件。すべての解像度に適用します",
    "editItem": "リフレッシュレートを編集",
    "cancelEdit": "キャンセル",
    "up": "上へ",
    "down": "下へ",
    "remove": "削除",
    "sort": "大きさで並べ替え",
    "errors": {
      "invalid": "小数点以下 3 桁までの数値です。例: 60 または 59.94",
      "range": "リフレッシュレートは {min} から {max} Hz です",
      "exists": "このリフレッシュレートは既に一覧にあります",
      "minOne": "リフレッシュレートは少なくとも 1 つ残してください",
      "full": "一覧は最大 {count} 件です"
    }
  },
  "noteShort": "ドライバーは再読み込み後に新しい一覧を適用します。",
  "note": "ドライバーは再読み込み後に新しい一覧を適用します。既に動いている Foundation Virtual Display は作り直す（配信を接続し直す）まで反映されません。変わらなければ Foundation Virtual Display のドライバーツールで「Reload Driver」を使うか、アダプターまたは Windows を再起動してください。",
  "picker": {
      "resolution": {
        "name": "対応する解像度",
        "limit": "最大 {max} 件",
        "groups": {
          "16:9": "16:9",
          "16:10": "16:10",
          "21:9": "21:9",
          "32:9": "32:9",
          "custom": "カスタム"
        },
        "custom": "カスタムサイズ",
        "width": "幅",
        "height": "高さ"
      },
      "rate": {
        "name": "対応するリフレッシュレート",
        "limit": "最大 {max} 件",
        "groups": {
          "common": "一般",
          "custom": "カスタム"
        },
        "custom": "カスタムレート",
        "value": "リフレッシュレート",
        "placeholder": "例: 59.94"
      },
      "add": "追加",
      "offered": "クライアントに提供",
      "sort": "大きさで並べ替え",
      "earlier": "前へ",
      "later": "後ろへ",
      "remove": "削除"
    },
}
