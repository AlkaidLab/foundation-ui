export default {
  "close": "關閉",
  "title": "遠端訪問",
  "mode": "連線方式",
  "modes": {
    "lan": "僅區域網",
    "public": "公網",
    "mesh": "組網"
  },
  "modeText": {
    "lan": "客戶端和這臺電腦在同一個網路裡。什麼都不用設定，也不會向網際網路開放任何埠。",
    "public": "從任何地方直接連到這臺電腦。需要路由器的 UPnP 或埠轉發，並且會向網際網路開放埠。",
    "mesh": "兩端加入同一個私有網路，通過它互相通訊。不用改路由器，也不開放埠。"
  },
  "lanDone": "無需操作。可以跳過這一步，以後在幫助或“主機設定 › 網路”裡再看。",
  "upnpTitle": "先試試 UPnP",
  "upnpLead": "開啟 UPnP 後，這臺電腦會自己請路由器開啟所需埠。",
  "upnpState": {
    "unknown": "主機沒有報告 UPnP 的狀態。",
    "on": "UPnP 已開啟",
    "off": "UPnP 已關閉",
    "pending": "已儲存為開啟，重啟主機後生效。",
    "pendingOff": "已儲存為關閉，重啟主機後停止。"
  },
  "upnpTurnOn": "開啟 UPnP",
  "upnpTurnOff": "關閉 UPnP",
  "restart": "重啟主機以生效",
  "restarting": "正在重啟…",
  "restartNote": "主機重啟期間，正在進行的串流會中斷。",
  "confirmTitle": "用 UPnP 開啟埠？",
  "confirmText": "UPnP 會讓這臺電腦請路由器把串流埠開放給網際網路，知道你地址的人就能連到這些埠。請只在可信的網路裡開啟，並設定強密碼。",
  "confirmYes": "開啟",
  "check": "檢測",
  "checking": "檢測中…",
  "checkTitle": "檢測本機一側",
  "checkRows": {
    "port": "這臺電腦正在監聽埠 {n}",
    "upnpOn": "UPnP 正在執行",
    "upnpOff": "UPnP 沒有執行",
    "failed": "沒能向主機查詢。",
    "none": "沒有報告地址。"
  },
  "outside": "然後從外面測試",
  "outsideText": "把手機切到行動數據（不要用 Wi-Fi），開啟客戶端，用你的公網 IP 地址新增這臺電腦。能連上就完成了；連不上，就手動轉發埠。",
  "manualTitle": "UPnP 不可用？手動轉發埠",
  "manualLead": "登入路由器，把下面這些埠轉發到這臺電腦。按你配置的基礎埠計算：{base}。",
  "optional": "可選",
  "managementNote": "管理頁埠。串流不需要，請保持關閉。",
  "routerSteps": [
    "開啟路由器的管理頁（常見為 192.168.1.1 或 192.168.0.1）並登入。",
    "找到“埠轉發”“虛擬伺服器”或“NAT”。",
    "每個埠加一條規則：協議、埠，目標填這臺電腦的區域網地址。",
    "儲存，然後點“檢測”，再從外面測試。"
  ],
  "target": "目標",
  "targetUnknown": "這臺電腦的區域網地址",
  "routerArt": {
    "pc": "這臺電腦",
    "net": "網際網路",
    "rule": "埠 → 電腦"
  },
  "risks": [
    "開放埠就是讓這臺電腦暴露在網際網路上。請設定強密碼，並保持主機為最新版本。",
    "不要轉發管理頁的埠。",
    "如果運營商讓很多戶共用一個公網地址，這種方式行不通，請改用組網。"
  ],
  "flow": {
    "steps": {
      "result": "UPnP 的結果",
      "test": "測試公網地址",
      "manual": "手動轉發埠"
    },
    "upnp": {
      "off": "UPnP 已關閉",
      "on": "UPnP 正在執行",
      "pending": "已儲存為開啟，主機重啟後才會執行。",
      "pendingOff": "已儲存為關閉，主機重啟後停止。",
      "unknown": "主機沒有報告 UPnP 的狀態。"
    },
    "restartAsk": {
      "title": "重啟主機來應用 UPnP",
      "text": "重啟期間正在進行的串流會中斷，大約要半分鐘。",
      "now": "現在重啟",
      "later": "稍後"
    },
    "restarting": {
      "title": "正在重啟",
      "away": "主機已下線，等它回來。",
      "wait": "等主機下線，再等它回來。"
    },
    "restarted": {
      "title": "已重啟",
      "proofs": {
        "start-time": "主機程序重新啟動了（{time}）。",
        "went-away": "主機下線後又回來了。"
      }
    },
    "timeout": {
      "title": "{s} 秒內主機沒有回來",
      "not-back": "它下線後一直沒有再應答，可能還在啟動。",
      "same-process": "它一直在應答，程序啟動時間沒變：沒有重啟。",
      "never-left": "沒有看到它下線，這臺主機也不報告啟動時間，所以無法確認它重啟過。",
      "next": {
        "not-back": "稍等一會兒再檢查；一直不回來，請到這臺電腦上啟動 Sunshine。",
        "same-process": "再重啟一次，或到這臺電腦上重啟 Sunshine 服務。",
        "never-left": "再檢查一次，或到這臺電腦上重啟 Sunshine 服務。"
      },
      "again": "再檢查一次",
      "retry": "重新重啟"
    },
    "checkingRouter": "正在問路由器它做了什麼…",
    "outcome": {
      "mapped": {
        "text": "路由器已把 {ports} 轉發到這臺電腦。"
      },
      "partial": {
        "title": "UPnP 只轉發了一部分埠",
        "text": "已轉發：{mapped}。缺少：{missing}。",
        "next": "缺的埠請在下面手動轉發。"
      },
      "none": {
        "title": "路由器回應了，但沒有保留埠轉發",
        "text": "不少路由器要開啟“允許 UPnP 修改設定”，UPnP 才能真正新增轉發。",
        "next": "到路由器裡開啟它後重新檢測，或在下面手動轉發埠。"
      },
      "no-answer": {
        "title": "UPnP 沒有成功：路由器沒有回應",
        "text": "路由器沒開 UPnP，或不支援。",
        "next": "到路由器裡開啟 UPnP 後重新檢測，或在下面手動轉發埠。"
      },
      "unknown": {
        "title": "路由器沒有報告埠轉發",
        "text": "再檢測一次。"
      },
      "cgnat": "路由器的外網地址 {wan} 是運營商共用的：埠轉發到不了網際網路。請改用組網。",
      "private": "路由器的外網地址 {wan} 是內網地址：前面還有一層路由器。那一層也要轉發，或改用組網。",
      "recheck": "重新檢測",
      "toManual": "手動轉發",
      "toMesh": "改用組網"
    },
    "test": {
      "lead": "輸入你的公網 IP 或域名。這臺電腦會向它發起一次 HTTPS 連線，看應答的是不是這臺主機。",
      "label": "公網 IP 或域名",
      "run": "測試",
      "running": "測試中…",
      "useWan": "路由器的外網地址 {wan}",
      "useSaved": "已儲存：{value}",
      "saveUse": "設為客戶端地址",
      "saved": "已儲存為客戶端地址",
      "notSupported": "這臺主機還不能測試沒儲存的地址。儲存之後再測。",
      "saveTest": "儲存並測試",
      "how": "測試方式：從這臺電腦向 {addr} 的 HTTPS 埠 {port} 做一次 TLS 握手，用時 {ms} 毫秒。",
      "reached": {
        "title": "{addr} 可以連通",
        "proves": "這證明：這個地址指向你的路由器，路由器把 {port} 埠轉發給了這臺電腦。",
        "limit": "無法以此方式驗證 UDP 埠（視訊、音訊、控制）。請再用手機行動數據連線一次。"
      },
      "reached-inside": {
        "title": "有應答，但走的是{scope}地址",
        "proves": "這個名字或地址指向你的內網，所以結果說明不了網際網路能不能連上。"
      },
      "failed": {
        "title": "{addr} 連不上：{word}"
      },
      "howFailed": "測試方式：從這臺電腦向 {addr} 的 HTTPS 埠 {port} 做一次 TLS 握手。",
      "next": {
        "refused": "路由器有回應，但 {port} 埠沒有到達這臺電腦，或被防火牆拒絕。請檢查轉發和防火牆。",
        "timeout": "沒有應答：埠沒有轉發，或防火牆丟棄了資料包。",
        "unreachable": "沒有到這個地址的路由。",
        "tls_failed": "那個埠上的程式不是 TLS 服務。",
        "failed": "握手失敗。"
      },
      "hairpin": "限制：許多路由器不支援“迴環”（hairpin NAT），在區域網裡訪問自己的公網地址會失敗，哪怕從外面是通的。設定沒錯的話，請用手機行動數據再試一次。",
      "unresolved": {
        "title": "{addr} 解析不出來",
        "next": "到你的 DNS 或 DDNS 服務商那裡檢查這個域名的記錄。"
      },
      "other-device": {
        "title": "{addr} 上應答的是另一臺裝置",
        "next": "這個地址指向了別的電腦：檢查路由器把埠轉發給了誰。"
      },
      "scopes": {
        "lan": "區域網",
        "loopback": "本機",
        "mesh": "組網"
      },
      "table": {
        "port": "埠",
        "router": "路由器轉發",
        "host": "這臺電腦",
        "test": "經地址測試",
        "yes": "已轉發",
        "no": "未轉發",
        "silent": "路由器未回報",
        "listening": "監聽中",
        "onDemand": "串流時開啟",
        "closed": "沒有監聽",
        "untested": "此處無法測試"
      },
      "tableNote": "只測試 HTTPS 埠。UDP 埠無法從這臺電腦測試；「已轉發」表示路由器自己報告存在這條轉發。"
    },
    "done": {
      "title": "遠端訪問可用",
      "text": "在客戶端裡用這個地址新增這臺電腦：",
      "hostSaid": "主機已驗證：有客戶端從公網連上過，或這臺電腦經公網地址連到了自己。"
    },
    "manual": {
      "whenOk": "UPnP 不可用？手動轉發埠"
    }
  },
  "meshTitle": "組網",
  "serverCopy": "複製",
  "copied": "已複製",
  "toolText": {
    "tailscale": "兩臺裝置登入同一個賬號。",
    "zerotier": "在 ZeroTier Central 建立一個網路，兩臺裝置都加入，並在那裡授權它們。",
    "easytier": "兩臺裝置使用相同的網路名和金鑰，並通過公共節點互聯。"
  },
  "join": "加入網路",
  "address": "檢視地址",
  "installOn": "兩端都要安裝",
  "thenAdd": "然後在客戶端裡，用組網地址新增這臺電腦。",
  "steps": {
    "install": "在這臺電腦和客戶端裝置上都安裝它。",
    "join": "兩端加入同一個網路。",
    "add": "在客戶端裡，用組網給這臺電腦的地址新增它。"
  },
  "originHint": "在“主機設定 › 網路”裡調整“誰能開啟 WebUI 面板”。",
  "open": "開啟教程",
  "openText": "遠端訪問教程"
}
