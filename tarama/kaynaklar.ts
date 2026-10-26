// Haber kaynakları. Hepsi ücretsiz ve herkese açıktır.
// Bir kaynak çalışmazsa tarama durmaz; hata yalnızca tarama kaydına yazılır.
// Akış adresleri 24 Ekim 2026'da denendi; büyük uluslararası kaynaklar 26 Ekim 2026'da eklendi.

export type RssKaynagi = {
  tur: "rss";
  ad: string; // ekranda gösterilen kaynak adı
  adres: string;
  /** Yalnızca bu ülkeyle ilgili haber verir (ülke adı geçmese de o ülkeye bağlanır). */
  ulke?: string;
  /** Kaynağın internet alan adları: GDELT'te bu sitelerden gelen haber de bu kaynak sayılır (iki kez sayılmaz). */
  alanlar?: string[];
  /** Başlığın sonundan atılacak ek (Google Haberler başlığa " - Reuters" gibi kaynak adı ekler). */
  sonEk?: string;
  /** Haber metni özet için açılamaz (abonelikli site ya da Google Haberler yönlendirmesi): özet önce başka kaynağı dener. */
  metinKapali?: boolean;
};

/**
 * Herkese açık akışı olmayan ya da isteği engelleyen büyük kaynaklar için Google Haberler'in ücretsiz akışı:
 * yalnızca o sitenin son 24 saatteki haberleri. Bağlantılar Google üzerinden siteye yönlendirir.
 */
function googleHaberler(ad: string, alan: string, sonEk = ad): RssKaynagi {
  return {
    tur: "rss",
    ad,
    adres: `https://news.google.com/rss/search?q=site:${alan}+when:1d&hl=en-US&gl=US&ceid=US:en`,
    alanlar: [alan],
    sonEk: ` - ${sonEk}`,
    metinKapali: true,
  };
}


export const RSS_KAYNAKLARI: RssKaynagi[] = [
  // Uluslararası ajanslar ve yayın kuruluşları
  { tur: "rss", ad: "Anadolu Ajansı", adres: "https://www.aa.com.tr/en/rss/default?cat=world", alanlar: ["aa.com.tr"] },
  // Türkçe kaynaklar
  { tur: "rss", ad: "AA (Türkçe)", adres: "https://www.aa.com.tr/tr/rss/default?cat=dunya" },
  { tur: "rss", ad: "Haberler.com", adres: "https://rss.haberler.com/RssNew.aspx?kategori=dunya" },
  { tur: "rss", ad: "BBC", adres: "https://feeds.bbci.co.uk/news/world/rss.xml", alanlar: ["bbc.co.uk", "bbc.com"] },
  { tur: "rss", ad: "Al Jazeera", adres: "https://www.aljazeera.com/xml/rss/all.xml", alanlar: ["aljazeera.com", "aljazeera.net"] },
  { tur: "rss", ad: "DW", adres: "https://rss.dw.com/rdf/rss-en-world", alanlar: ["dw.com"] },
  { tur: "rss", ad: "France 24", adres: "https://www.france24.com/en/rss", alanlar: ["france24.com"] },
  { tur: "rss", ad: "Euronews", adres: "https://www.euronews.com/rss?level=theme&name=news", alanlar: ["euronews.com"] },
  { tur: "rss", ad: "Daily Sabah", adres: "https://www.dailysabah.com/rss/world", alanlar: ["dailysabah.com"] },
  // Büyük uluslararası kaynaklar (26 Ekim 2026). Reuters, AP, CNN, Arab News, Washington Post ve WSJ'nin
  // herkese açık güncel akışı yok ya da isteği engelliyor: Google Haberler üzerinden okunur.
  googleHaberler("Reuters", "reuters.com"),
  googleHaberler("AP", "apnews.com", "AP News"),
  googleHaberler("CNN", "cnn.com"),
  googleHaberler("Arab News", "arabnews.com"),
  googleHaberler("Washington Post", "washingtonpost.com", "The Washington Post"),
  googleHaberler("WSJ", "wsj.com"),
  { tur: "rss", ad: "New York Times", adres: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", alanlar: ["nytimes.com"], metinKapali: true },
  { tur: "rss", ad: "Financial Times", adres: "https://www.ft.com/world?format=rss", alanlar: ["ft.com"], metinKapali: true },
  { tur: "rss", ad: "Bloomberg", adres: "https://feeds.bloomberg.com/politics/news.rss", alanlar: ["bloomberg.com"], metinKapali: true },
  { tur: "rss", ad: "The Guardian", adres: "https://www.theguardian.com/world/rss", alanlar: ["theguardian.com"] },
  { tur: "rss", ad: "The Independent", adres: "https://www.independent.co.uk/news/world/rss", alanlar: ["independent.co.uk"] },
  { tur: "rss", ad: "Sky News", adres: "https://feeds.skynews.com/feeds/rss/world.xml", alanlar: ["news.sky.com", "sky.com"] },
  { tur: "rss", ad: "Le Monde", adres: "https://www.lemonde.fr/en/international/rss_full.xml", alanlar: ["lemonde.fr"] },
  { tur: "rss", ad: "Politico Europe", adres: "https://www.politico.eu/feed/", alanlar: ["politico.eu"] },
  { tur: "rss", ad: "SCMP", adres: "https://www.scmp.com/rss/91/feed", alanlar: ["scmp.com"] },
  { tur: "rss", ad: "Yonhap", adres: "https://en.yna.co.kr/RSS/news.xml", alanlar: ["yna.co.kr"] },
  // BM insani yardım (afetler)
  { tur: "rss", ad: "ReliefWeb (BM)", adres: "https://reliefweb.int/disasters/rss.xml" },
  // Öncelikli ülkeler için bölge kaynakları
  { tur: "rss", ad: "TASS", adres: "https://tass.com/rss/v2.xml", ulke: "RUS" },
  { tur: "rss", ad: "Trend", adres: "https://en.trend.az/feeds/index.rss", ulke: "AZE" },
  { tur: "rss", ad: "Civil.ge", adres: "https://civil.ge/feed", ulke: "GEO" },
  { tur: "rss", ad: "AKIpress", adres: "https://akipress.com/rss/news_en.rss", ulke: "KGZ" },
  { tur: "rss", ad: "Tehran Times", adres: "https://www.tehrantimes.com/rss", ulke: "IRN" },
  { tur: "rss", ad: "The Hindu", adres: "https://www.thehindu.com/news/international/feeder/default.rss" },
  { tur: "rss", ad: "Ukrinform", adres: "https://www.ukrinform.net/rss/block-lastnews", ulke: "UKR" },
  { tur: "rss", ad: "24.kg", adres: "https://24.kg/english/rss/", ulke: "KGZ" },
  { tur: "rss", ad: "Report.az", adres: "https://report.az/en/rss/", ulke: "AZE" },
  { tur: "rss", ad: "UzA", adres: "https://uza.uz/en/rss", ulke: "UZB" },
  { tur: "rss", ad: "JAMnews", adres: "https://jam-news.net/feed/" },
];

// GDELT: dünya basınını tarayan ücretsiz servis. Ham dosyaları (her 15 dakikada bir) okunur: tarama/gdelt.ts.
// Akışı kapalı ülkeler (Ermenistan, Kazakistan, Moğolistan, Özbekistan, Türkmenistan) bu yolla da izlenir.

const ALAN_KAYNAGI = new Map(RSS_KAYNAKLARI.flatMap((k) => (k.alanlar ?? []).map((a) => [a, k.ad] as const)));

/** GDELT'teki site adını (ör. "www.reuters.com") bilinen kaynağın adına çevirir; bilinmiyorsa olduğu gibi döner. */
export function alanKaynagi(alan: string): string {
  const temiz = alan.toLowerCase().replace(/^www\./, "");
  for (let a = temiz; a.includes("."); a = a.slice(a.indexOf(".") + 1)) {
    const ad = ALAN_KAYNAGI.get(a);
    if (ad) return ad;
  }
  return alan;
}

const METNI_KAPALI = new Set(RSS_KAYNAKLARI.filter((k) => k.metinKapali).map((k) => k.ad));

/** Bu kaynağın haber metni özet için açılabilir mi (abonelikli siteler ve Google Haberler bağlantıları açılamaz). */
export function metniAcikMi(kaynak: string, adres = ""): boolean {
  return !METNI_KAPALI.has(kaynak) && !/^https?:\/\/news\.google\.com\//i.test(adres);
}
