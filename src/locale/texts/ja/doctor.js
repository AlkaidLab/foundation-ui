export default
{
  "title": "健康診断",
  "start": "健康診断を開始",
  "again": "もう一度確認",
  "progress": "確認中 {done}/{total}",
  "done": "{s} 秒かかりました",
  "groups": {
    "service": "Sunshine サービス",
    "install": "インストール",
    "process": "プロセスとポート",
    "drivers": "ドライバー",
    "gpu": "グラフィックとドライバー",
    "encoder": "エンコーダー",
    "capture": "画面キャプチャ",
    "audio": "オーディオ",
    "input": "入力とゲームパッド",
    "network": "ネットワーク",
    "system": "システム",
    "host": "ホストの状態"
  },
  "sources": {
    "local": "この PC"
  },
  "sourceTip": {
    "local": "コントロールパネルが確認します。Sunshine は動いていなくて構いません",
    "host": "Sunshine が確認します。動いている必要があります"
  },
  "states": {
    "idle": "未開始",
    "queued": "待機中",
    "running": "確認しています…",
    "offline": "Sunshine が応答しなかったので、このグループは確認していません"
  },
  "offlineTitle": "Sunshine が応答しません: {n} グループ未確認",
  "offlineNext": "まず Sunshine を起動してください（サービスと「プロセスとポート」に理由があります）。その後もう一度確認します。",
  "hostOffline": "Sunshine は動いていません。この PC の確認だけ結果があります",
  "sections": {
    "local": "この PC の確認",
    "host": "Sunshine の確認"
  },
  "plan": {
    "title": "{n} グループ",
    "text": "{local} グループはコントロールパネル自身が確認し、Sunshine が止まっていても動きます。残りの {host} は Sunshine が確認します。",
    "textOffline": "Sunshine は動いていません。この PC の {local} グループだけ確認できます。"
  },
  "what": {
    "service": "状態、開始の種類、最後の終了コード",
    "install": "インストール先、バージョン、ビルド",
    "process": "使用中のポート、ログ末尾のエラー",
    "drivers": "Foundation Virtual Display、ViGEmBus、仮想マウス、USB/IP",
    "gpu": "グラフィックカード、ドライバーの版、どのカードが符号化するか",
    "capture": "テストフレーム 1 枚",
    "vdd": "ドライバー、HDR、リフレッシュレート",
    "audio": "出力デバイス、仮想サウンドカード、マイク",
    "input": "ViGEmBus、DualSense、USB 転送",
    "network": "ポート、ファイアウォール、UPnP、インターネット、メッシュ",
    "system": "ディスク容量、時刻同期、アカウント、再起動待ち",
    "host": "バージョン、稼働時間、クラッシュ、設定エラー"
  },
  "last": {
    "title": "前回の確認 {ago}",
    "empty": "前回の確認は結果がありませんでした",
    "ago": {
      "now": "たった今",
      "min": "{n} 分前",
      "hour": "{n} 時間前",
      "day": "{n} 日前"
    }
  },
  "checkedAt": "確認 {at}（{ago}）",
  "none": {
    "title": "結果のある確認がありません",
    "text": "{n} グループのどれも応答しなかったので、この PC が正常か故障かはまだ言えません。",
    "reason": "最初の理由: {why}"
  },
  "failure": {
    "why": "なぜ",
    "next": "対処",
    "detail": "返ってきた内容",
    "http": "状態 {status}",
    "hit": "{n} グループ: {names}"
  },
  "status": {
    "warn": "警告",
    "fail": "問題",
    "skip": "未確認"
  },
  "counts": {
    "fail": "問題 {n}",
    "warn": "警告 {n}",
    "skip": "未確認 {n}",
    "pass": "正常 {n}",
    "silent": "結果のないグループ {n}"
  },
  "allGood": "すべて正常",
  "errors": {
    "unsupported": {
      "why": "このバージョンにその確認はありません",
      "next": "Sunshine（またはコントロールパネル）を更新して、もう一度確認してください。"
    },
    "auth": {
      "why": "サインアウト: Sunshine が要求を拒否しました",
      "next": "もう一度サインインしてから確認してください。"
    },
    "invalid": {
      "why": "回答は健康診断の結果ではありません。応答した相手は Sunshine ホストではないかもしれません",
      "next": "もう一度確認し、同じなら報告を書き出して、返ってきた内容を添えてフィードバックを送ってください。"
    },
    "failed": {
      "why": "確認は失敗し、結果がありません",
      "next": "もう一度確認し、また失敗するなら報告を書き出して、返ってきた内容を添えてください。"
    }
  },
  "stream": {
    "live": "配信中です。{n} 件は確認できず、正常でも問題でもありません",
    "label": {
      "skipped": "配信中は未確認",
      "disturbed": "配信中は信頼できません",
      "routed": "配信中は信頼できません"
    },
    "why": {
      "skipped": "配信中で、調査は GPU を占有して映像を乱すため、これは確認していません。配信が終わってからもう一度確認してください。",
      "disturbed": "これは配信中に測った値で、配信の影響かもしれません。正常でも問題でもありません。配信が終わってからもう一度確認してください。",
      "routed": "配信中は Sunshine が音声出力を引き受けます。今読んだデバイスは待機中の PC のものではないので判断できません。配信が終わってからもう一度確認してください。"
    },
    "read": "読み取り: {detail}"
  },
  "rerunGroup": "このグループをもう一度確認",
  "export": "報告を書き出す",
  "ai": "Mita AI に聞く",
  "fix": {
    "setting": "設定を開く",
    "page": "{page} を開く",
    "rerun": "もう一度確認",
    "restart": "Sunshine を再起動",
    "link": "手順を見る",
    "repair": "修復",
    "start": "Sunshine を開始"
  },
  "pages": {
    "network": "ネットワーク",
    "audio": "オーディオ",
    "display": "ディスプレイ",
    "components": "コンポーネント",
    "logs": "ログと診断",
    "config": "設定ファイル",
    "update": "情報と更新"
  },
  "confirm": {
    "title": "{label}？",
    "titleOf": "{label} {item}？",
    "will": "すること",
    "admin": "管理者権限が必要です。Windows が確認を求めます。",
    "live": "配信中です。これを実行すると配信は終わります。その配信でこの PC を操作していると接続が切れ、この PC の前に戻る必要があるかもしれません。",
    "run": "実行",
    "cancel": "キャンセル"
  },
  "fixAt": "{group} の {item} で修復してください。一度直すとここも直ります。",
  "repairFailed": "未完了: {error}",
  "repairDone": "完了。もう一度確認しています",
  "aiPrompt": "これは Foundation Sunshine ホストの健康診断です（この PC と Sunshine の確認）。原因を見つけ、直し方を順番に出してください。",
  "aiOffline": "応答なし"
}
