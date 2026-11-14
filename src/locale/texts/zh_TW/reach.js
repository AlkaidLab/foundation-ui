export default {
  "title": "遠端訪問",
  "recheck": "重新檢測",
  "checking": "檢測中…",
  "checkedAt": "{time} 檢測",
  "notChecked": "還沒有檢測",
  "unavailable": "這臺主機還不能檢測可達性。",
  "unavailableText": "它沒有這個檢測介面（應答 {code}）：是較舊的主機，更新主機後就有。照下面的教程設定好，遠端訪問仍然可用。",
  "failed": "沒能執行檢測。",
  "failure": {
    "why": {
      "offline": "主機沒有應答：它可能正在重啟，或已經退出。",
      "server": "主機在檢測時出錯了（HTTP {code}）。",
      "auth": "主機拒絕了這次請求（HTTP {code}），請重新登入後再試。",
      "bad-answer": "主機的回答不是檢測結果。",
      "other": "主機返回了 HTTP 狀態碼 {code}。"
    },
    "next": "點“重新檢測”再試一次；一直失敗，請重啟主機。"
  },
  "paths": {
    "public": "公網",
    "mesh": "組網"
  },
  "verdicts": {
    "verified": "已驗證",
    "likely": "很可能可連",
    "unknown": "無法確定",
    "unreachable": "連不上",
    "none": "沒有組網"
  },
  "headline": {
    "public": {
      "verified": "有客戶端從公網連上過，或這臺電腦經公網地址連到了自己。可用。",
      "likely": "設定看起來沒問題，但還沒有從外面連上過，所以不算已驗證。",
      "unknown": "這臺電腦無法判斷公網能否連到它。",
      "unreachable": "公網連不到這臺電腦。"
    },
    "mesh": {
      "verified": "有客戶端通過組網連上過。可用。",
      "likely": "組網已連通，這臺電腦也在組網上監聽，但還沒有通過組網連上過，所以不算已驗證。",
      "unknown": "這臺電腦無法判斷組網是否可用。",
      "none": "沒有發現組網網絡卡（Tailscale、ZeroTier、EasyTier、WireGuard）。"
    }
  },
  "evidence": {
    "client-connected-from-public": "最近一次從公網連線成功",
    "client-connected-from-mesh": "最近一次通過組網連線成功",
    "hairpin": "本機經公網地址連到了自己的證書（迴環測試通過）"
  },
  "reasons": {
    "cgnat": "運營商讓很多戶共用一個公網地址（CGNAT），網際網路無法直接連到你。",
    "private_wan": "路由器的外網地址是內網地址：前面還有一層路由器或運營商 NAT。",
    "no_wan_ip": "路由器沒有報告外網地址。",
    "not_listening_on_mesh": "組網地址上沒有程式在監聽 {proto} {port}。",
    "mesh_adapter_down": "裝了組網，但它沒有連線。",
    "no_mesh_adapter": "這臺電腦上沒有安裝組網。",
    "session_evidence": "最近有客戶端從這類地址連上過。",
    "hairpin_verified": "這臺電腦經公網地址連到了自己的證書。",
    "host_public_ip": "這臺電腦自己就持有一個公網地址。",
    "mappings_complete": "路由器已轉發所有需要的埠。",
    "mesh_adapter_up": "組網已連線，埠也在組網上監聽。",
    "hairpin_not_tried": "沒有可用來測試的公網地址。",
    "firewall_unknown": "這個系統無法判斷防火牆有沒有放行埠。",
    "address_mismatch": "你填的公網地址不是路由器的外網地址，用它的客戶端會連到別處。",
    "address_private": "你填的公網地址是內網地址，網際網路連不到。",
    "dns_failed": "你填的域名解析不出來，請檢查 DDNS 記錄。",
    "unset": "沒有設定公網地址：客戶端使用主機自己發現的地址。",
    "no_igd": "路由器沒有回應 UPnP（沒開啟，或不支援）。",
    "mapping_missing": "路由器上缺少 {proto} {port} 的埠對映。",
    "firewall_blocked": "防火牆擋住了 {proto} {port}。",
    "not_listening": "沒有程式在監聽 {proto} {port}。",
    "hairpin_unsupported": "路由器不支援迴環，這臺電腦無法自行測試。請改用手機流量從外部測試一次。",
    "origin_blocks_mesh": "Web 管理頁只對區域網開放，而組網地址（100.64.0.0/10）被算作外網，所以通過組網打不開管理頁。"
  },
  "actions": {
    "upnp": "開啟 UPnP",
    "forward": "手動轉發埠",
    "firewall": "新增防火牆規則",
    "restart": "重啟主機",
    "origin": "調整 Web UI 訪問來源",
    "mesh": "改用組網",
    "address": "設定公網地址",
    "use-wan": "改用路由器的外網地址",
    "outside": "怎麼從外面測試"
  },
  "addressPublic": "在客戶端裡填寫的地址",
  "addressMesh": "在客戶端裡填寫的組網地址",
  "copy": "複製",
  "copied": "已複製",
  "noAddress": "還不知道地址。",
  "adapters": "組網網絡卡",
  "up": "已連線",
  "down": "未連線",
  "ports": "埠表",
  "portsHint": "基礎埠 {base}",
  "colProto": "協議",
  "colPort": "埠",
  "colListen": "監聽",
  "colFirewall": "防火牆",
  "firewall": {
    "blocked": "已攔截"
  },
  "fixFirewall": "用管理員身份執行下面的命令，放行被攔截的埠：",
  "fixFirewallLinux": "執行下面的命令，放行被攔截的埠：",
  "fixOutside": "把手機切到行動數據（不要用 Wi-Fi），開啟客戶端，用上面的地址新增這臺電腦。",
  "address": {
    "title": "公網地址",
    "add": "新增地址",
    "remove": "刪除",
    "save": "儲存",
    "check": "檢測",
    "saving": "正在儲存…",
    "saved": "已儲存",
    "resolved": "解析為",
    "matches": "路由器的外網地址",
    "differs": "不是路由器的外網地址",
    "errors": {
      "scheme": "去掉 http:// 字首。",
      "format": "只填 主機 或 主機:埠。",
      "port": "埠範圍 6 到 65535。",
      "private": "內網地址，網際網路連不到。"
    },
    "failed": "沒能儲存。"
  },
  "roles": {
    "http": {
      "note": "客戶端地址"
    },
    "https": {
      "note": "配對"
    },
    "video": {
      "name": "視訊"
    },
    "audio": {
      "name": "音訊"
    },
    "microphone": {
      "name": "麥克風"
    }
  },
  "portState": {
    "listening": "監聽中",
    "on-session": "串流時開啟",
    "closed": "未監聽"
  },
  "colInternal": "本機埠",
  "endpoint": {
    "reached": "已連通",
    "errors": {
      "dns_failed": "域名無法解析",
      "refused": "埠拒絕連線",
      "timeout": "無應答",
      "unreachable": "沒有路由",
      "tls_failed": "不是 TLS 服務",
      "identity_mismatch": "另一臺裝置應答",
      "not_tried": "未檢測",
      "failed": "失敗"
    },
    "scopes": {
      "public": "公網",
      "lan": "區域網",
      "mesh": "組網",
      "loopback": "本機"
    },
    "none": "未設定地址"
  },
  "addressKinds": {
    "empty": "未設定"
  },
  "lan": {
    "title": "區域網",
    "verdicts": {
      "listening": "在監聽",
      "pending": "重啟後生效",
      "unknown": "無法確定",
      "loading": "讀取中…"
    },
    "port": "埠 {port}",
    "mdnsOn": "區域網發現 開",
    "mdnsOff": "區域網發現 關",
    "allAddresses": "所有網絡卡",
    "failed": "沒能讀取監聽地址。",
    "pending": "儲存的監聽設定和正在用的不同，重啟主機後生效。",
    "address": "在區域網內填寫的地址"
  },
  "overview": {
    "label": "連線方式",
    "copyLabel": "複製 {address}",
    "details": "埠與防火牆"
  },
  "sheet": {
    "add": "新增公網地址",
    "edit": "編輯公網地址",
    "checking": "檢測中…",
    "unchecked": "還沒有檢測",
    "full": "最多 {max} 個地址。"
  },
  "tutorial": "遠端訪問教程",
  "tile": "遠端訪問",
  "tileEmpty": "尚未檢測"
}
