// Güvenilir kaynaklar. Dünya basını taramasından (GDELT) YALNIZCA bu listedeki yayın kuruluşlarının haberleri alınır;
// doğrudan okunan akışların (kaynaklar.ts → alanlar) alan adları da otomatik olarak güvenilir sayılır.
// Liste elle düzenlenir: yeni bir kaynak eklemek için alan adını uygun bölüme yazmak yeterlidir.

import { RSS_KAYNAKLARI } from "../kaynaklar.ts";

const LISTE = [
  // Uluslararası ajanslar ve büyük yayın kuruluşları
  "reuters.com", "apnews.com", "afp.com", "bbc.com", "bbc.co.uk", "cnn.com", "nytimes.com", "washingtonpost.com", "wsj.com",
  "ft.com", "bloomberg.com", "economist.com", "theguardian.com", "independent.co.uk", "telegraph.co.uk", "thetimes.co.uk",
  "news.sky.com", "npr.org", "pbs.org", "abcnews.go.com", "cbsnews.com", "nbcnews.com", "latimes.com", "usatoday.com",
  "politico.com", "politico.eu", "axios.com", "thehill.com", "time.com", "foreignpolicy.com", "foreignaffairs.com",
  "csmonitor.com", "voanews.com", "rferl.org", "aljazeera.com", "aljazeera.net", "dw.com", "france24.com", "rfi.fr",
  "euronews.com", "lemonde.fr", "spiegel.de", "cbc.ca", "abc.net.au", "news.un.org", "un.org", "reliefweb.int",
  // Asya-Pasifik
  "scmp.com", "japantimes.co.jp", "asia.nikkei.com", "straitstimes.com", "channelnewsasia.com", "koreaherald.com",
  "koreatimes.co.kr", "yna.co.kr", "english.news.cn", "thehindu.com", "hindustantimes.com", "indianexpress.com",
  "ndtv.com", "timesofindia.indiatimes.com", "dawn.com",
  // Orta Doğu
  "arabnews.com", "thenationalnews.com", "khaleejtimes.com", "gulfnews.com", "timesofisrael.com", "haaretz.com", "jpost.com",
  "tehrantimes.com", "irna.ir",
  // Türkiye
  "aa.com.tr", "dailysabah.com", "hurriyetdailynews.com", "trtworld.com", "trthaber.com", "haberler.com",
  // Rusya, Ukrayna ve Doğu Avrupa
  "kyivindependent.com", "kyivpost.com", "ukrinform.net", "pravda.com.ua", "tass.com", "interfax.com", "themoscowtimes.com",
  "meduza.io",
  // Kafkasya ve Orta Asya (öncelikli ülkeler)
  "civil.ge", "agenda.ge", "interpressnews.ge", "trend.az", "apa.az", "report.az", "azertag.az", "armenpress.am", "news.am",
  "azatutyun.am", "tert.am", "akipress.com", "24.kg", "kabar.kg", "kun.uz", "uza.uz", "gazeta.uz", "astanatimes.com",
  "inform.kz", "tengrinews.kz", "montsame.mn", "jam-news.net", "eurasianet.org", "turkmenportal.com",
];

const ALANLAR = new Set([...LISTE, ...RSS_KAYNAKLARI.flatMap((k) => k.alanlar ?? [])]);
const AJANS_ADLARI = new Set(RSS_KAYNAKLARI.map((k) => k.ad));

/** Alan adı (ya da alt alanı) güvenilir listede mi? ("edition.cnn.com" → "cnn.com") */
export function guvenilirAlanMi(alan: string): boolean {
  let a = alan.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
  for (; a.includes("."); a = a.slice(a.indexOf(".") + 1)) if (ALANLAR.has(a)) return true;
  return false;
}

/** Bir haber kaynağı gösterilebilir mi: doğrudan okunan akış ya da güvenilir alan adı. */
export function guvenilirKaynakMi(kaynak: string, adres = ""): boolean {
  if (AJANS_ADLARI.has(kaynak)) return true;
  if (guvenilirAlanMi(kaynak)) return true;
  try {
    return guvenilirAlanMi(new URL(adres).hostname);
  } catch {
    return false;
  }
}

/** Görüş yazısı, köşe yazısı, okur mektubu, başyazı: haber değildir, alınmaz. */
export function gorusYazisiMi(baslik: string, adres = ""): boolean {
  if (/\/(?:opinion|opinions|op-ed|oped|editorial|editorials|letters|commentary|columnists?|column|blogs?)\//i.test(adres)) return true;
  return /^(?:opinion|op-?ed|editorial|letters?(?: to the editor)?|commentary|column|analysis|görüş|köşe yazısı)\s*[|:–—-]/i.test(baslik.trim()) ||
    /\|\s*opinion\b/i.test(baslik) ||
    /:\s*letters?$/i.test(baslik.trim());
}
