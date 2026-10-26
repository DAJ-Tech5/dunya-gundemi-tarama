// Kural tabanlı (ücretsiz) sınıflandırma: haber türü, ülke ve önem puanı.
// 3. aşamada Claude puanı ve Türkçe özet bunun üzerine eklenecek; bu kurallar yine yedek olarak kalır.

import { ONCELIKLI_ULKELER } from "./veri/oncelikli.ts";
import { TUR_ADLARI } from "./veri/turler.ts";
import ulkeVerisi from "./veri/ulkeler.json" with { type: "json" };

export { ONCELIKLI_ULKELER };

export type Ulke = { kod: string; ad: string; en: string; adlar: string[]; x: number; y: number; sehirler: string[] };
export const ULKELER = ulkeVerisi as Ulke[];


// ------------------------------------------------------------ haber türleri

export type Kategori = { id: string; ad: string; taban: number; desen: RegExp };

const k = (id: string, _ad: string, taban: number, kelimeler: string[]): Kategori => ({
  id,
  ad: TUR_ADLARI[id] ?? id,
  taban,
  // Kelime başı: Türkçe harflerle başlayan kelimeler için \b yerine Unicode farkında kontrol
  desen: new RegExp(`(?<![\\p{L}\\d])(?:${kelimeler.join("|")})`, "iu"),
});

/** Sıra önemlidir: bir haber birden çok türe uyarsa en yüksek tabanlı tür seçilir. */
export const KATEGORILER: Kategori[] = [
  k("darbe", "Darbe", 9, ["coup", "military takeover", "junta seize", "seized power", "darbe", "yönetime el koy", "cunta"]),
  k("savas", "Savaş / çatışma", 8, [
    "war\\b", "airstrikes?", "air strikes?", "missile (?:strike|attack)s?", "drone (?:strike|attack)s?", "invasion",
    "invade[sd]?", "military offensive", "counteroffensive", "launch(?:es|ed)? (?:an )?offensive", "shelling", "clashes", "ceasefire", "troops? (?:enter|cross)", "bombard",
    "martial law", "mobiliz", "hostilities",
    "savaş", "hava saldırı", "füze saldırı", "füzeyle", "İHA saldırı", "çatışma", "ateşkes", "bombaladı",
    "bombardıman", "işgal", "seferberlik", "sıkıyönetim",
  ]),
  k("teror", "Terör saldırısı", 8, [
    "terror(?:ist)? attack", "suicide bomb", "car bomb", "bombing", "gunmen", "mass shooting", "hostages?", "terör", "intihar saldırı", "bombalı saldırı", "silahlı saldırı", "rehin",
  ]),
  k("afet", "Doğal afet", 7, [
    "earthquake", "quake", "tsunami", "floods?\\b", "flooding", "cyclone", "hurricane", "typhoon", "wildfires?",
    "volcan", "landslide", "drought", "epidemic", "outbreak", "cholera", "deprem", "tayfun", "kasırga", "orman yangın", "yanardağ", "heyelan", "kuraklık", "salgın", "sel felaketi", "selde", "sel\\b",
  ]),
  k("hukumet", "Hükümet değişikliği", 7, [
    "government (?:collapse|falls|resign)", "prime minister resign", "president resign", "resigns?\\b",
    "no-confidence", "no confidence", "impeach", "new government", "sworn in", "cabinet reshuffle", "dissolve[sd]? parliament",
    "istifa", "güven oylaması", "yeni hükümet", "kabine değişikliği", "görevden al",
  ]),
  k("kriz", "Ekonomik kriz", 6, [
    "default(?:s|ed)? on", "debt crisis", "currency (?:plunge|crash|collapse)", "recession", "bailout", "hyperinflation",
    "bank run", "imf (?:deal|loan|bailout)", "ekonomik kriz", "borç krizi", "temerrüt", "resesyon", "devalüasyon",
  ]),
  k("secim", "Seçim", 6, ["elections?", "referendum", "runoff", "polls? (?:open|close)", "voters", "ballot", "seçim", "sandık", "halk oylaması", "referandum"]),
  k("ziyaret", "Resmî ziyaret / görüşme", 5, [
    "state visit", "official visit", "visits?\\b", "visited", "summit", "held talks", "holds talks", "talks with",
    "meets?\\b", "met with", "bilateral", "phone call with", "hosted", "receives?\\b", "ziyaret", "görüş",
    "bir araya geldi", "kabul etti", "telefonda", "zirve", "toplantı", "temas", "mevkidaşı",
    "müzakere", "buluş", "barış görüşme", "barış planı", "negotiat", "peace talks", "peace plan", "talks\\b",
  ]),
  k("anlasma", "Anlaşma", 5, [
    "agreements?", "accord", "treaty", "memorandum", "\\bmou\\b", "signs?\\b", "signed", "deal\\b", "pact", "anlaşma", "mutabakat", "imzaladı", "imzalandı", "protokol", "antlaşma",
  ]),
  k("dis_politika", "Dış politika", 5, [
    "sanctions?", "ambassador", "embassy", "expel", "diplomat", "foreign minist", "foreign polic", "recogni[sz]e",
    "yaptırım", "büyükelçi", "sınır dışı", "dışişleri", "dış politika", "tanıdı",
  ]),
  k("toplu_olum", "Toplu ölüm", 8, ["(?:[2-9]\\d|\\d{3,}|dozens|hundreds|scores) (?:of people )?(?:killed|dead|die)", "(?:[2-9]\\d|\\d{3,}|onlarca|yüzlerce) (?:kişi )?(?:öldü|hayatını kaybetti|can verdi)"]),
  k("ic_politika", "İç politika", 4, [
    "protests?", "parliament", "opposition", "crackdown", "arrested", "detained", "constitution", "unrest",
    "protesto", "gösteri", "muhalefet", "gözaltı", "tutuklandı", "anayasa",
  ]),
  k("aciklama", "Üst düzey açıklama", 4, [
    "president \\w+ (?:says|said|warns|vows|calls)", "prime minister \\w+ (?:says|said|warns)", "says\\b", "warns?\\b",
    "condemn", "vows?\\b", "statement", "açıklama", "açıkladı", "belirtti", "vurguladı", "uyardı", "kınadı",
  ]),
];

const LIDER =
  /(?<![\p{L}])(?:president|prime minister|premier|foreign minister|chancellor|king|emir|crown prince|leader|minister|cumhurbaşkanı|başbakan|bakan|devlet başkanı|dışişleri|kral|veliaht|sözcü|lider)/iu;
// Türkiye ilgisi: Türkiye, İstanbul ve Türk Devletleri Teşkilatı
const TURKIYE =
  /(?<![\p{L}])(?:turkey|türkiye|turkiye|turkish|ankara|istanbul|İstanbul|erdo[gğ]an|fidan|tdt|türk devletleri|organization of turkic states|turkic states|türk dünyası)(?![\p{L}])/iu;

// Savaş kelimesinin mecaz kullanımları
const MECAZ_SAVAS =
  /\b(?:trade|price|tariff|culture|bidding|turf|talent|streaming) wars?\b|\bwar of words\b|\bworld war\b|\bwar on (?:drugs|poverty|terror)\b/i;

// Adı geçtiğinde "üst düzey yetkili" sayılan liderler ve kurumlar
const LIDER_ADLARI =
  /(?<![\p{L}])(?:Trump|Putin|Zelensk|Erdo[gğ]an|Aliyev|Pa[sş]inyan|Pashinyan|Tokayev|Caparov|Japarov|Mirziyoyev|Berdimuhamedov|Netanyahu|Modi|Macron|Merz|Starmer|Xi Jinping|Şi Cinping|Pezeşkiyan|Pezeshkian|Lavrov|Rubio|Witkoff|Fidan|Peskov|Sybiha|Kremlin|Beyaz Saray|White House)/iu;

export function kategoriBul(metin: string): Kategori | undefined {
  let secilen: Kategori | undefined;
  for (const kat of KATEGORILER) {
    if (!kat.desen.test(metin)) continue;
    // Açıklama, görüşme, anlaşma ve istifa yalnızca üst düzey yetkili / hükümet geçiyorsa sayılır
    const resmi =
      LIDER.test(metin) ||
      LIDER_ADLARI.test(metin) ||
      /(?<![\p{L}])(?:government|cabinet|parliament|state visit|official visit|summit|hükümet|kabine|meclis|resmi ziyaret|resmî ziyaret|zirve)/iu.test(metin);
    // Ülkeler arası anlaşma ("X ile Y arasında", "between X and Y") yetkili adı geçmese de sayılır
    const ulkelerArasi = kat.id === "anlasma" && /(?<![\p{L}])(?:arasında|between)(?![\p{L}])/iu.test(metin);
    if (["aciklama", "ziyaret", "anlasma", "hukumet"].includes(kat.id) && !resmi && !ulkelerArasi) continue;
    if (kat.id === "savas" && MECAZ_SAVAS.test(metin) && !/\b(?:airstrike|missile|troops|shelling|invasion)/i.test(metin)) {
      continue;
    }
    if (!secilen || kat.taban > secilen.taban) secilen = kat;
  }
  return secilen;
}

export function turkiyeIlgili(metin: string): boolean {
  return TURKIYE.test(metin);
}

// ------------------------------------------------------------ ülke bulma

// Sık geçen ek adlar, sıfatlar ve kurum adları (Natural Earth'te olmayanlar)
const EK_ADLAR: Record<string, string[]> = {
  USA: ["U\\.S\\.", "US", "USA", "America", "American", "Washington", "White House", "Pentagon", "Vaşington", "Beyaz Saray", "ABD", "Trump"],
  GBR: ["UK", "Britain", "British", "Downing Street", "London", "Londra", "İngiltere"],
  RUS: ["Russian", "Kremlin", "Moscow", "Putin", "Moskova", "Rusya"],
  UKR: ["Ukrainian", "Kyiv", "Kiev", "Zelensky", "Zelenskyy", "Zelenskiy", "Ukrayna"],
  CHN: ["China", "Chinese", "Beijing", "Xi Jinping", "Pekin", "Şi Cinping"],
  TUR: ["Turkish", "Türkiye", "Turkiye", "Erdogan", "Erdoğan"],
  IRN: ["Iranian", "Tehran", "Tahran", "Pezeşkiyan", "Arakçi", "Erakçi"],
  IRQ: ["Iraqi"],
  ISR: ["Israeli", "Netanyahu", "IDF", "Tel Aviv"],
  PSX: ["Palestinian", "Gaza", "West Bank", "Hamas", "Ramallah", "Gazze", "Batı Şeria"],
  SYR: ["Syrian", "Damascus", "Şam"],
  LBN: ["Lebanese", "Hezbollah", "Beirut", "Beyrut", "Hizbullah"],
  AZE: ["Azerbaijani", "Azeri", "Aliyev", "Baku", "Bakü"],
  ARM: ["Armenian", "Pashinyan", "Yerevan", "Erivan", "Paşinyan"],
  GEO: ["Georgian", "Tbilisi", "Tiflis", "Kobahidze"],
  KAZ: ["Kazakh", "Tokayev", "Astana", "Almaty", "Almatı"],
  KGZ: ["Kyrgyz", "Japarov", "Bishkek", "Bişkek", "Caparov", "Kırgız"],
  UZB: ["Uzbek", "Mirziyoyev", "Tashkent", "Taşkent"],
  TKM: ["Turkmen", "Ashgabat", "Berdimuhamedov", "Aşkabat"],
  MNG: ["Mongolian", "Ulaanbaatar", "Ulan Bator"],
  IND: ["Modi", "New Delhi", "Yeni Delhi"],
  PAK: ["Pakistani", "Islamabad", "İslamabad"],
  AFG: ["Afghan", "Taliban", "Kabul", "Kabil"],
  DEU: ["German", "Berlin"],
  FRA: ["French", "Paris", "Elysee", "Macron"],
  JPN: ["Japanese", "Tokyo"],
  PRK: ["North Korean", "Pyongyang", "Kim Jong"],
  KOR: ["South Korean", "Seoul"],
  SAU: ["Saudi", "Riyadh", "Riyad", "Suudi"],
  EGY: ["Egyptian", "Cairo", "Kahire"],
  GRC: ["Greek", "Athens", "Atina"],
  CYP: ["Cypriot", "Nicosia"],
  CYN: ["Northern Cyprus", "KKTC", "TRNC"],
  VEN: ["Venezuelan", "Caracas"],
  SDN: ["Sudanese", "Khartoum", "RSF"],
  YEM: ["Yemeni", "Houthi", "Houthis"],
  TWN: ["Taiwan", "Tayvan", "Taipei"],
  BEL: ["Brüksel"],
};

// Başka anlamı da olan adlar: yanında bu ifadeler varsa o ülke sayılmaz
const KARISABILIR: Record<string, RegExp> = {
  GEO: /\b(?:atlanta|georgia state|georgia governor|u\.s\.|savannah)\b/i,
  JOR: /\bmichael jordan\b|\bjordan (?:river|peterson)\b/i,
  IND: /\bindian ocean\b/i,
};

function kacis(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type UlkeDeseni = { kod: string; desen: RegExp; uzunluk: number; aktor: boolean };

// Yer değil, bir ülkenin "aktörü" olan adlar: sıfatlar, liderler, kurumlar ve örgütler.
// "Russian missile strike on Lozova" haberi Rusya'da değil, Ukrayna'da olur.
const AKTOR = /(?:an|ian|ish|ese|i|ic)$|^(?:Kremlin|Putin|White House|Pentagon|Downing Street|Elysee|Zelenskyy?|Erdo[gğ]an|Aliyev|Pashinyan|Tokayev|Japarov|Mirziyoyev|Berdimuhamedov|Netanyahu|IDF|Hamas|Hezbollah|Taliban|Houthis?|RSF|Modi|Macron|Xi Jinping|Kim Jong|Trump|Zelenskiy|Pezeşkiyan|Paşinyan|Caparov|Kobahidze|Şi Cinping|Arakçi|Erakçi|Beyaz Saray|Hizbullah)$/;

const DESENLER: UlkeDeseni[] = ULKELER.flatMap((u) => {
  const adlar = [...u.adlar, ...u.sehirler].filter((a) => a.length >= 4 && !/[,()]/.test(a)).map(kacis);
  const ekler = EK_ADLAR[u.kod] ?? [];
  const hepsi = [...new Set([...adlar, ...ekler])];
  return hepsi.map((a) => ({
    kod: u.kod,
    // Kısaltmalar (US, UK) büyük harf duyarlı; diğerleri duyarsız
    desen: /^[A-Z\\.]{2,6}$/.test(a) ? new RegExp(`(?<![\\w.])${a}(?![\\w])`) : new RegExp(`(?<![\\w])${a}(?![\\w])`, "i"),
    uzunluk: a.length,
    aktor: ekler.includes(a) && AKTOR.test(a),
  }));
}).sort((a, b) => b.uzunluk - a.uzunluk); // önce uzun adlar (South Sudan, Sudan'dan önce)

/**
 * Haberin gösterileceği ülkeyi bulur: haberi / açıklamayı / eylemi yapan aktörün ülkesi.
 * Başlıklarda aktör (özne) genellikle önce geçtiği için başlıkta İLK geçen ülke, kişi veya kurum seçilir:
 * "Trump Rusya hakkında açıklama yaptı" → ABD; "Zelenskiy Macaristan'ı ziyaret etti" → Ukrayna.
 * Başlıkta hiçbir ülke yoksa kaynağın ülkesi (tek ülkeye ait ajanslar), o da yoksa açıklama metni kullanılır.
 * Claude değerlendirmesi ayrıca aktörün ülkesini doğrular (yz_ulke_kod).
 */
export function ulkeBul(baslik: string, ozet = "", kaynakUlke?: string): string | undefined {
  const bul = (metin: string) => {
    let enIyi: { kod: string; konum: number; yer: boolean; aktor: boolean } | undefined;
    let kalan = metin;
    for (const d of DESENLER) {
      const m = d.desen.exec(kalan);
      if (!m) continue;
      if (KARISABILIR[d.kod]?.test(metin)) continue;
      // "in Jordan", "near Paris" gibi yer bildiren ifadeler önce gelir
      const sonrasi = kalan.slice(m.index + m[0].length, m.index + m[0].length + 6);
      const yer =
        /\b(?:in|at|near|across|inside|to)\s+(?:the\s+)?$/i.test(kalan.slice(Math.max(0, m.index - 12), m.index)) ||
        /^['’](?:da|de|ta|te|daki|deki|taki|teki)(?![\p{L}])/u.test(sonrasi);
      const dahaIyi = !enIyi || m.index < enIyi.konum;
      if (dahaIyi) enIyi = { kod: d.kod, konum: m.index, yer, aktor: d.aktor };
      // Eşleşen yeri boşlukla değiştir: "South Sudan" bulunduktan sonra "Sudan" ayrıca eşleşmesin
      kalan = kalan.slice(0, m.index) + " ".repeat(m[0].length) + kalan.slice(m.index + m[0].length);
    }
    return enIyi;
  };
  // ReliefWeb başlık biçimi: "Ülke: Sel - Eki 2026"
  const b = bul(baslik);
  return b?.kod ?? kaynakUlke ?? bul(ozet)?.kod;
}

export function ulkeBilgisi(kod: string): Ulke | undefined {
  return ULKELER.find((u) => u.kod === kod);
}

// ------------------------------------------------------------ önem puanı

/**
 * 1–10 arası kural puanı.
 * - Taban: haber türü
 * - +1: 3 veya daha çok bağımsız kaynak; +1 daha: 6 veya daha çok
 * - +1: Türkiye ile ilgili
 * - −1: tek kaynak (doğrulanmadı; ayrıca en fazla 8 alabilir, Kritik olamaz)
 * - −1: yalnızca o ülkenin kendi ajansı anlatıyorsa
 */
export function puanla(taban: number, kaynakSayisi: number, turkiye: boolean, yalnizYerelKaynak = false): number {
  let p = taban;
  if (kaynakSayisi < 2) p -= 1; // doğrulanmamış
  if (yalnizYerelKaynak) p -= 1; // yalnızca o ülkenin kendi ajansı anlatıyor (sürekli akan gündem)
  if (kaynakSayisi >= 3) p += 1;
  if (kaynakSayisi >= 6) p += 1;
  if (turkiye) p += 1;
  if (kaynakSayisi < 2) p = Math.min(p, 8);
  return Math.max(1, Math.min(10, p));
}

/** Gösterim eşiği: genel 5, öncelikli ülkelerde 4. */
export function gosterilirMi(puan: number, ulkeKod: string): boolean {
  return puan >= (ONCELIKLI_ULKELER.includes(ulkeKod) ? 4 : 5);
}

// ------------------------------------------------------------ gruplama için anahtar kelimeler

const DOLGU = new Set(
  "the a an and or of to in on at for from with by as is are was were be been has have had will would could should may might says said say over after before into about amid than that this these those its it his her their they them he she we you not but new news live update updates more up out what who how why when where which while also just two three one first last week day year years video watch photos report reports".split(
    " ",
  ),
);

export function anahtarKelimeler(metin: string): Set<string> {
  const kelimeler = metin
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !DOLGU.has(w))
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w));
  return new Set(kelimeler);
}

export function benzerlik(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let ortak = 0;
  for (const w of a) if (b.has(w)) ortak++;
  return ortak / (a.size + b.size - ortak);
}
