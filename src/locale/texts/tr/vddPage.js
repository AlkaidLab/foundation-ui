export default {
  "source": "Kaynak",
  "prepTitle": "Yayın sırasında ekranlar",
  "prepLabel": "Yayın için ekran birleşimi",
  "preps": {
    "no_operation": {
      "title": "İşlem yok",
      "text": "Ekranları olduğu gibi bırakır; hazır olmalarını siz sağlarsınız"
    },
    "ensure_active": {
      "title": "Seçilen ekranı etkinleştir"
    },
    "ensure_primary": {
      "title": "Ana ekrandan yayın",
      "text": "Seçilen ekranı açar ve ana ekran yapar"
    },
    "ensure_only_display": {
      "title": "Yalnızca seçilen ekran"
    },
    "ensure_secondary": {
      "title": "İkincil ekran (Foundation Virtual Display)"
    }
  },
  "options": "Seçenekler",
  "reuse": "Tüm istemciler için tek Foundation Virtual Display",
  "reuseText": "Önerilmez: istemci geçişi daha hızlıdır ama her istemci artık kendi ekran ölçeklemesini korumaz.",
  "headless": "Ana bilgisayarda ekran yokken bir tane oluştur",
  "displayRules": "Çözünürlük ve yenileme hızı",
  "rulesFooter": "Bunun çalışması için Moonlight istemcisinde \"Oyun ayarlarını optimize et\" açık olmalıdır.",
  "follow": "Yayın sırasında ana bilgisayar çözünürlük değişikliklerini izle",
  "advanced": "Gelişmiş",
  "vsync": "Foundation Virtual Display yayını sırasında zorunlu NVIDIA vsync",
  "vsyncText": "Bazı DLSS Frame Generation oyunlarını Foundation Virtual Display'de tam hızda yakalamaya yardımcı olmak için NVIDIA'nın genel dikey eşzamanlamasını geçici olarak açar.",
  "vulkan": "Foundation Virtual Display için Vulkan HDR uyumluluğu",
  "vulkanText": "Vulkan oyunlarının Foundation Virtual Display'de HDR'yi algılamasına yardımcı olur. Yalnızca HDR yayınında etkindir; başarısız bir test yayını kesmez.",
  "vulkanStatus": {
    "disabled": "Kapalı",
    "loading": "Uyumluluk denetleniyor…",
    "unavailable": "Uyumluluk bileşenleri kurulu değil",
    "waiting": "Hazır: HDR Foundation Virtual Display bekleniyor",
    "idle": "Vulkan HDR için hazır",
    "validating": "Vulkan HDR sunumu test ediliyor…",
    "enabled": "Geçerli HDR yayını için etkin",
    "error": "Test başarısız; yayın etkilenmez"
  },
  "vulkanValidate": "Geçerli ekranı test et",
  "vulkanValidating": "Test ediliyor…",
  "vulkanHint": "Test etmeyi etkinleştirmek için bir HDR Foundation Virtual Display başlatın.",
  "confirmTitle": "\"{name}\" değiştirilsin mi?",
  "confirmChange": "Değiştir",
  "cancel": "İptal",
  "saveFailed": "Kaydedilemedi: {error}",
  "risk": {
    "vsync": "NVIDIA'nın genel dikey eşzamanlamasını geçici olarak değiştirir ve yayın sırasında başlatılan diğer oyunları etkileyebilir; son oturum bitince geri yüklenir. Oyunu başlatmadan önce kaydedin.",
    "vulkan": "Yalnızca HDR yayını sırasında geçerlidir; başarısız bir test yayını kesmez.",
    "dolby": "Bunun geçerli olması için Foundation Virtual Display'ın kayıttan sonra yeniden oluşturulması gerekir.",
    "customEdid": "Özel EDID en riskli seçenektir: yanlış bir dosya Foundation Virtual Display'in oluşturulmasını engelleyebilir. Olursa özel dosyayı silin ve yerleşik moda dönün.",
    "reload": "Sürücü yeniden yüklenirken Foundation Virtual Display bir an kaybolur ve devam eden yayın kesilir.",
    "edidProfile": "Windows EDID'yi yeniden okusun diye Foundation Virtual Display'ın kayıttan sonra yeniden oluşturulması gerekir. Yanlış sürüm, HDR'yi veya bazı çözünürlükleri kullanılamaz kılabilir.",
    "cursor": "Sürücünün Windows'a bildirdiği şey budur. Yanlış bir değer imlecin kaybolmasına veya titremesine yol açabilir; Foundation Virtual Display bir dahaki oluşturulduğunda geçerli olur."
  },
  "qualityTitle": "Görüntü kalitesi",
  "driverTitle": "Sürücü ve tanılama",
  "tier3": "Uzman",
  "edidProfile": "Yerleşik EDID sürümü",
  "edidProfileText": "Sanal ekranın Windows'a bildirdiği yerleşik EDID. Otomatik, sistem seçer: Windows 10 22H2'de uyumlu olanı, Windows 11 ve sonrakinlerde modern olanı.",
  "edidProfileIgnored": "Özel bir EDID açık olduğundan yerleşik sürümün etkisi yoktur.",
  "edidProfiles": {
    "auto": {
      "title": "Otomatik",
      "text": "Ana bilgisayar sistemine göre"
    },
    "legacy": {
      "title": "Uyumlu",
      "text": "EDID 1.3, en geniş uyumluluk"
    },
    "modern": {
      "title": "Modern",
      "text": "EDID 1.4, 10 bit, BT.2020, tam HDR"
    }
  },
  "preventSpoof": "Üreticiyi olduğu gibi bırak",
  "preventSpoofText": "Özel bir EDID'de sürücü üreticiyi yeniden yazmaz. Yalnızca gerekiyorsa açın.",
  "ceaOverride": "CEA uzantı bloğunu ekle",
  "ceaOverrideText": "HDR bildirebilmesi için özel bir EDID'in yerleşik CEA uzantı bloğunu geçersiz kılar veya ekler.",
  "cursorTitle": "İmleç",
  "cursorHint": "Varsayılanlar herkese uyar; daha eski Intel işlemciler yalnızca 64×64 destekleyebilir. İmleci her zaman sürücü dışa aktarır; görüntüye çizilip çizilmeyeceğine ana bilgisayar karar verir.",
  "cursorMax": "En büyük imleç",
  "alphaCursor": "Alfa kanallı 32 bit imleç",
  "alphaCursorText": "İmleçlerin çoğu bu biçimdedir.",
  "xorCursor": "XOR imleç desteği",
  "xorCursorText": "Ne yaptığını bilmiyorsanız dokunmayın.",
  "xorLevels": {
    "0": "Başlatılmamış",
    "1": "Yok",
    "2": "Tam",
    "3": "Öykünme"
  }
}
