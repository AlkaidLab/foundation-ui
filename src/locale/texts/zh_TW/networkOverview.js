export default {
  "title": "網路概覽",
  "label": "網路概覽",
  "recheck": "重新檢測",
  "checking": "檢測中…",
  "checkedAt": "{time} 檢測",
  "notChecked": "還沒有檢測",
  "unavailable": "這臺主機還不能顯示網路概覽。",
  "unavailableText": "需要更新的主機版本。",
  "failed": "沒能執行檢測。",
  "copy": "複製 {address}",
  "copied": "已複製",
  "noAddress": "沒有地址",
  "actions": {
    "family": "改為同時監聽 IPv4 和 IPv6"
  },
  "stunTable": "STUN 伺服器",
  "colFamily": "協議",
  "colServer": "伺服器",
  "colResult": "結果",
  "colRtt": "耗時",
  "errors": {
    "resolve_failed": "域名無法解析",
    "other_family": "不是這個協議",
    "no_route": "沒有路由",
    "timeout": "無應答",
    "send_failed": "傳送失敗",
    "error_response": "返回錯誤"
  },
  "answered": "已回應",
  "rows": {
    "interfaces": "網絡卡",
    "ipv4": "公網 IPv4",
    "ipv6": "公網 IPv6",
    "nat": "NAT 型別",
    "cgnat": "運營商 NAT（CGNAT）",
    "firewall": "防火牆"
  },
  "verdicts": {
    "likely": "可能可達",
    "unreachable": "不可達"
  },
  "reach": {
    "likely": "還沒有從外面連上過，無法確認。",
    "likelySession": "7 天內有客戶端從公網連上過；之後沒有再測。",
    "likelyHairpin": "本機經公網地址連到了自己的證書（迴環測試），沒有從外網實測。",
    "unreachable": "這個網路以外的客戶端連不上。",
    "unknown": "這臺電腦無法判斷公網能否連到它。"
  },
  "reasons": {
    "upstream_nat": "STUN 伺服器看到的是 {seen}，不是路由器的外網地址 {wan}：路由器上面還有一層 NAT、VPN 或代理，它的轉發這裡看不到。",
    "stun_on_interface": "STUN 伺服器看到的地址就在這臺電腦上：前面沒有 NAT。",
    "ipv6_no_global": "連外網的網絡卡上沒有公網 IPv6 地址。",
    "ipv6_stable_global": "使用的是穩定 IPv6 地址；臨時地址不會提供給客戶端。",
    "ipv6_only_temporary": "只有臨時 IPv6 地址（大約每天更換），客戶端填了也會失效。",
    "ipv6_not_listening": "主機只在 IPv4 上監聽，IPv6 客戶端會被拒絕。",
    "ipv6_translated": "STUN 伺服器看到的 IPv6 地址和本機不同：網路改寫了 IPv6 地址。",
    "ipv6_stun_no_answer": "沒有 STUN 伺服器通過 IPv6 回應。",
    "ipv6_inbound_filter_unknown": "多數家用路由器預設攔截從外面進來的 IPv6 連線，除非有放行規則；這臺電腦看不到這項設定。"
  },
  "source": {
    "interface": "網絡卡 {name} 上的地址；沒有 STUN 伺服器回應"
  },
  "consistent": "不同伺服器看到的地址不一樣：{list}。可能有代理或 VPN 分流了一部分。",
  "fakeIp": "域名解析被代理改寫：看到的是代理的地址，或者沒有結果。",
  "fakeIpDetail": "解析結果在 198.18.0.0/15，這是代理 DNS 的 fake-IP 地址段。",
  "translatedDetail": "網路對 IPv6 地址做了轉換（NPTv6 或 NAT66）。",
  "privacy": "本次檢測向第三方 STUN 伺服器詢問了這臺電腦的公網地址：{servers}。結果保留 {minutes} 分鐘；把 stun_servers 設為 none 可關閉。",
  "details": "詳細資訊",
  "stunOff": "STUN 已關閉（stun_servers = none）。",
  "nat": {
    "words": {
      "none": "無 NAT",
      "endpoint-independent": "與目標無關",
      "dependent": "隨目標變化"
    },
    "facts": {
      "none": "公網地址就在這臺電腦上。",
      "endpoint-independent": "對任何目標都用同一個公網地址和埠：P2P 直連通常可行。",
      "dependent": "每個目標換一個公網埠：P2P 直連多半要靠中繼。",
      "unknown": "沒能測出對映行為。"
    },
    "kinds": {
      "address-dependent": "埠隨目標地址變化（RFC 4787：地址相關對映）。",
      "address-and-port-dependent": "埠隨目標地址和埠變化（RFC 4787：地址和埠相關對映）。",
      "endpoint-dependent": "埠隨目標變化；只換目標埠時是否也變，沒有測。"
    },
    "method": {
      "rfc5780": "按 RFC 5780 測試 {target}：{tests}。",
      "two-servers": "用兩個伺服器比較（{tests}）；RFC 5780 的測法需要帶第二個地址的伺服器。",
      "none": "只有一個伺服器回應。"
    },
    "test": "測試 {name} {mapped}",
    "noAnswer": "無應答",
    "varies": "測試之間連公網 IP 本身都變了。",
    "filtering": "過濾行為（哪些外部發送方能回包）沒有測：公共伺服器不回應 RFC 5780 的變更請求。",
    "reasons": {
      "no_answer": "沒有 STUN 伺服器回應。",
      "single_server": "只有一個伺服器回應，無法比較對映。",
      "test2_no_answer": "伺服器的第二個地址沒有回應。",
      "test3_no_answer": "伺服器的備用埠沒有回應。",
      "port_translated": "地址是本機的，但埠在路上被改了。"
    }
  },
  "cgnat": {
    "facts": {
      "yes": "運營商讓很多戶共用一個公網地址：埠轉發不起作用。",
      "no": "公網地址不是運營商共用的。",
      "unknown": "不知道路由器的外網地址。"
    },
    "reasons": {
      "stun_matches_wan": "STUN 伺服器看到的就是路由器的外網地址 {wan}。",
      "wan_public": "路由器報告的外網地址 {wan} 是公網地址。",
      "stun_on_interface": "公網地址就在這臺電腦上。",
      "stun_differs_from_wan": "路由器報告 {wan}，STUN 伺服器看到 {seen}。",
      "wan_private": "路由器的外網地址 {wan} 是內網地址：前面還有一層路由器或運營商。",
      "no_igd": "路由器沒有回應 UPnP，所以不知道它的外網地址。",
      "no_wan_ip": "路由器沒有報告外網地址。"
    },
    "double": "路由器上面還有一層 NAT：只在這臺路由器上轉發埠不夠。",
    "sharedRange": "路由器的外網地址 {wan} 在 100.64.0.0/10，即 RFC 6598 的運營商共用地址段。",
    "unknownFacts": {
      "stun_differs_from_wan": "路由器上面還有一層 NAT，從這裡看不出是不是運營商的。",
      "wan_private": "路由器的外網地址是內網地址，前面那層是不是運營商 NAT 從這裡看不出來。",
      "no_igd": "不知道路由器的外網地址。",
      "no_wan_ip": "不知道路由器的外網地址。"
    }
  },
  "upnp": {
    "words": {
      "on": "有回應",
      "off": "無回應"
    },
    "wan": "外網地址 {wan} · {class}",
    "classes": {
      "public": "公網",
      "private": "內網",
      "cgnat": "運營商共用（CGNAT）"
    },
    "mapped": "已對映 {n}/{total} 個埠",
    "none": "路由器沒有回應 UPnP（沒開啟，或不支援）。",
    "hairpin": {
      "ok": "經公網地址的迴環測試通過。",
      "failed": "經公網地址的迴環測試沒有通過。"
    }
  },
  "firewall": {
    "words": {
      "blocked": "有攔截"
    },
    "facts": {
      "allowed": "本機防火牆放行了 Sunshine 的埠。",
      "blocked": "被攔截：{ports}。",
      "unknown": "這個系統無法判斷防火牆有沒有放行埠。"
    }
  },
  "interfaces": {
    "word": "{n} 塊在用",
    "none": "沒有在用的網絡卡。",
    "lifetimes": {
      "stable": "穩定",
      "temporary": "臨時，不提供給客戶端"
    },
    "scopes": {
      "global": "公網",
      "private": "區域網",
      "link-local": "鏈路本地",
      "loopback": "迴環"
    },
    "deprecated": "已棄用",
    "egress": "連外網",
    "mesh": "組網",
    "down": "未連線",
    "hidden": "另有 {n} 個容器或虛擬機器網橋，未列出。"
  }
}
