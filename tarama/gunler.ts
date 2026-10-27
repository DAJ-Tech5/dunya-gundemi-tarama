// Önemli günler: ulusal günler, resmî tatiller, dinî günler ve uluslararası günler. Günde bir kez çalışır
// (.github/workflows/gunler.yml) ve bugünden itibaren 120 günü siteye gönderir.
//
//   node tarama/gunler.ts          → topla ve siteye gönder
//   node tarama/gunler.ts --kuru   → yalnızca topla ve ekrana yaz
//
// Kaynaklar:
//  - Resmî tatiller: Nager.Date (ücretsiz, https://date.nager.at) — 100'ü aşkın ülke; İngilizce adlar sitede Türkçeye çevrilir.
//  - Nager.Date'in kapsamadığı öncelikli ülkeler: elle derlenen liste (veri/sabit-gunler.ts).
//  - Dinî günler ve İran/İsrail'in hareketli milli günleri: Hicri (Ümmü'l-Kura), İbrani, Çin ve İran takvimlerinden hesaplanır.
//  - Uluslararası günler: BM gözlem günleri listesi (veri/sabit-gunler.ts).

import iso2Veri from "./veri/iso2.json" with { type: "json" };
import { SABIT_ULKE_GUNLERI, ULUSLARARASI_GUNLER } from "./veri/sabit-gunler.ts";
import { kimlikUret } from "./secimler.ts";

export type OnemliGun = {
  kimlik: string;
  tarih: string; // YYYY-MM-DD
  ulke_kod: string | null; // dinî ve uluslararası günlerde null (bütün dünya)
  ad_en: string | null; // çevrilecek İngilizce ad (Nager.Date)
  ad_tr: string | null; // Türkçe ad (elle derlenen ve hesaplanan günlerde)
  tur: "ulusal" | "resmi" | "dini" | "uluslararasi";
  not_tr: string | null; // ör. "Ülkeye göre bir gün kayabilir"
  kaynak: string;
  kaynak_adres: string;
};

const ISO2 = iso2Veri as Record<string, string>;
const GUN_MS = 86_400_000;

function isoTarih(t: Date): string {
  return t.toISOString().slice(0, 10);
}

function gunler(baslangic: Date, gunSayisi: number): Date[] {
  const b = Date.UTC(baslangic.getUTCFullYear(), baslangic.getUTCMonth(), baslangic.getUTCDate());
  return Array.from({ length: gunSayisi }, (_, i) => new Date(b + i * GUN_MS));
}

// --------------------------------------------------------------------------- milli gün mü?
/** Bağımsızlık, cumhuriyet, ulusal gün gibi "milli gün" adları; diğer resmî tatiller "resmi" sayılır. */
export function milliGunMu(adEn: string): boolean {
  return /\b(?:independence|independent|national day|republic|constitution|victory|revolution|unification|unity|liberation|statehood|sovereignty|freedom day|foundation|founding|flag day|armed forces|ohi|ochi|king's|queen's|emperor)\b/i.test(
    adEn,
  );
}

// --------------------------------------------------------------------------- takvim hesapları
type TakvimParcasi = { ay: string; gun: number };
const bicimleyiciler = new Map<string, Intl.DateTimeFormat>();
function takvimde(t: Date, takvim: string): TakvimParcasi {
  let f = bicimleyiciler.get(takvim);
  if (!f) {
    f = new Intl.DateTimeFormat(`en-u-ca-${takvim}`, { month: takvim === "hebrew" ? "long" : "numeric", day: "numeric", timeZone: "UTC" });
    bicimleyiciler.set(takvim, f);
  }
  const p = f.formatToParts(t);
  return { ay: p.find((x) => x.type === "month")!.value, gun: Number(p.find((x) => x.type === "day")!.value) };
}

/** Verilen takvimde (ay, gün) karşılığı olan miladi günleri bulur. */
function takvimGunleri(aralik: Date[], takvim: string, ay: string | string[], gun: number): string[] {
  const aylar = Array.isArray(ay) ? ay : [ay];
  return aralik.filter((t) => {
    const p = takvimde(t, takvim);
    return p.gun === gun && aylar.includes(p.ay);
  }).map(isoTarih);
}

/** Batı (Gregoryen) ve Ortodoks (Jülyen) Paskalya tarihi. */
export function paskalya(yil: number, ortodoks = false): string {
  if (ortodoks) {
    const a = yil % 4, b = yil % 7, c = yil % 19;
    const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    const ay = Math.floor((d + e + 114) / 31), gun = ((d + e + 114) % 31) + 1;
    const julyen = Date.UTC(yil, ay - 1, gun);
    return isoTarih(new Date(julyen + 13 * GUN_MS)); // 1900–2099 arası Jülyen → Gregoryen farkı 13 gün
  }
  const a = yil % 19, b = Math.floor(yil / 100), c = yil % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const ay = Math.floor((h + l - 7 * m + 114) / 31), gun = ((h + l - 7 * m + 114) % 31) + 1;
  return isoTarih(new Date(Date.UTC(yil, ay - 1, gun)));
}

const ISLAMI_NOT = "Ümmü'l-Kura takvimine göre; ülkeye göre bir gün kayabilir.";
const YAHUDI_NOT = "Bir önceki akşam başlar.";

/** Bütün dünya için dinî günler (ülkeye bağlı değil). */
export function diniGunler(aralik: Date[]): OnemliGun[] {
  const sonuc: OnemliGun[] = [];
  const ekle = (tarihler: string[], ad: string, not: string | null, kaynak: string) => {
    for (const tarih of tarihler) {
      sonuc.push({ kimlik: kimlikUret("dini", tarih, ad), tarih, ulke_kod: null, ad_en: null, ad_tr: ad, tur: "dini", not_tr: not, kaynak, kaynak_adres: "" });
    }
  };
  const hicri = "islamic-umalqura";
  ekle(takvimGunleri(aralik, hicri, "1", 1), "Hicri Yılbaşı", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "1", 10), "Aşure Günü", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "3", 12), "Mevlid-i Nebi (Mevlid Kandili bir önceki gece)", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "7", 27), "Miraç Kandili (bir önceki gece)", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "8", 15), "Berat Kandili (bir önceki gece)", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "9", 1), "Ramazan ayının başlangıcı", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "9", 27), "Kadir Gecesi (bir önceki gece)", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "10", 1), "Ramazan Bayramı", ISLAMI_NOT, "Hicri takvim");
  ekle(takvimGunleri(aralik, hicri, "12", 10), "Kurban Bayramı", ISLAMI_NOT, "Hicri takvim");

  ekle(takvimGunleri(aralik, "hebrew", "Tishri", 1), "Roş Aşana (Yahudi Yeni Yılı)", YAHUDI_NOT, "İbrani takvim");
  ekle(takvimGunleri(aralik, "hebrew", "Tishri", 10), "Yom Kipur", YAHUDI_NOT, "İbrani takvim");
  ekle(takvimGunleri(aralik, "hebrew", "Nisan", 15), "Hamursuz Bayramı (Pesah)", YAHUDI_NOT, "İbrani takvim");
  ekle(takvimGunleri(aralik, "hebrew", "Kislev", 25), "Hanuka", YAHUDI_NOT, "İbrani takvim");

  ekle(takvimGunleri(aralik, "chinese", "1", 1), "Çin Yeni Yılı (Bahar Bayramı)", null, "Çin takvimi");

  const ilk = isoTarih(aralik[0]);
  const son = isoTarih(aralik[aralik.length - 1]);
  const yillar = [...new Set(aralik.map((t) => t.getUTCFullYear()))];
  const icinde = (t: string) => t >= ilk && t <= son;
  for (const y of yillar) {
    ekle([paskalya(y)].filter(icinde), "Paskalya", null, "Kilise takvimi");
    ekle([paskalya(y, true)].filter(icinde), "Ortodoks Paskalyası", null, "Kilise takvimi");
    ekle([`${y}-12-25`].filter(icinde), "Noel", null, "Kilise takvimi");
    ekle([`${y}-01-07`].filter(icinde), "Ortodoks Noeli", null, "Kilise takvimi");
  }
  return sonuc;
}

/** İran (Hicri-şemsi takvim) ve İsrail (İbrani takvim) için hareketli milli günler. */
export function hesaplananUlkeGunleri(aralik: Date[]): OnemliGun[] {
  const sonuc: OnemliGun[] = [];
  const ekle = (ulke: string, tarihler: string[], ad: string, tur: "ulusal" | "resmi", not: string | null, adres: string) => {
    for (const tarih of tarihler) {
      sonuc.push({ kimlik: kimlikUret(ulke, tarih, ad), tarih, ulke_kod: ulke, ad_en: null, ad_tr: ad, tur, not_tr: not, kaynak: "Vikipedi", kaynak_adres: adres });
    }
  };
  const iran = "https://en.wikipedia.org/wiki/Public_holidays_in_Iran";
  ekle("IRN", takvimGunleri(aralik, "persian", "1", 1), "Nevruz Bayramı", "resmi", null, iran);
  ekle("IRN", takvimGunleri(aralik, "persian", "1", 12), "İslam Cumhuriyeti Günü", "ulusal", null, iran);
  ekle("IRN", takvimGunleri(aralik, "persian", "3", 14), "İmam Humeyni'yi Anma Günü", "ulusal", null, iran);
  ekle("IRN", takvimGunleri(aralik, "persian", "11", 22), "İslam Devrimi'nin Zafer Yıl Dönümü", "ulusal", null, iran);
  ekle(
    "ISR",
    takvimGunleri(aralik, "hebrew", "Iyar", 5),
    "Bağımsızlık Günü",
    "ulusal",
    "İbrani takvime göre; hafta sonuna denk gelirse bir iki gün kaydırılabilir.",
    "https://en.wikipedia.org/wiki/Public_holidays_in_Israel",
  );
  return sonuc;
}

/** Elle derlenen sabit ülke günleri ve uluslararası günler. */
export function sabitGunler(aralik: Date[]): OnemliGun[] {
  const sonuc: OnemliGun[] = [];
  const ilk = isoTarih(aralik[0]);
  const son = isoTarih(aralik[aralik.length - 1]);
  const yillar = [...new Set(aralik.map((t) => t.getUTCFullYear()))];
  for (const y of yillar) {
    for (const [ulke, { kaynak, gunler: liste }] of Object.entries(SABIT_ULKE_GUNLERI)) {
      for (const g of liste) {
        const tarih = `${y}-${g.ay_gun}`;
        if (tarih < ilk || tarih > son) continue;
        sonuc.push({ kimlik: kimlikUret(ulke, tarih, g.ad), tarih, ulke_kod: ulke, ad_en: null, ad_tr: g.ad, tur: g.tur, not_tr: null, kaynak: "Vikipedi", kaynak_adres: kaynak });
      }
    }
    for (const g of ULUSLARARASI_GUNLER) {
      const tarih = `${y}-${g.ay_gun}`;
      if (tarih < ilk || tarih > son) continue;
      sonuc.push({
        kimlik: kimlikUret("bm", tarih, g.ad), tarih, ulke_kod: null, ad_en: null, ad_tr: g.ad, tur: "uluslararasi", not_tr: null,
        kaynak: "Birleşmiş Milletler", kaynak_adres: "https://www.un.org/en/observances/list-days-weeks",
      });
    }
  }
  return sonuc;
}

// --------------------------------------------------------------------------- Nager.Date
type NagerGun = { date: string; name: string; localName: string; countryCode: string; global: boolean; types: string[] };

/** Nager.Date kayıtlarını önemli günlere çevirir: yalnızca ülke genelinde geçerli resmî tatiller. */
export function nagerCevir(liste: NagerGun[], ilk: string, son: string): OnemliGun[] {
  const sonuc: OnemliGun[] = [];
  for (const g of liste) {
    const ulke = ISO2[g.countryCode];
    if (!ulke || !g.global || !g.types?.includes("Public") || g.date < ilk || g.date > son) continue;
    if (SABIT_ULKE_GUNLERI[ulke]) continue; // elle derlenen ülke: kendi listesi kullanılır
    sonuc.push({
      kimlik: kimlikUret(ulke, g.date, g.name),
      tarih: g.date,
      ulke_kod: ulke,
      // Türkiye ve KKTC: servisin verdiği özgün Türkçe ad kullanılır (ör. "Cumhuriyet Bayramı"); diğerleri sitede çevrilir
      ad_en: ulke === "TUR" || ulke === "CYN" ? null : g.name.slice(0, 200),
      ad_tr: ulke === "TUR" || ulke === "CYN" ? g.localName.slice(0, 200) : null,
      tur: milliGunMu(g.name) ? "ulusal" : "resmi",
      not_tr: null,
      kaynak: "Nager.Date",
      kaynak_adres: `https://date.nager.at/PublicHoliday/Country/${g.countryCode}`,
    });
  }
  return sonuc;
}

const TARAYICI = "Mozilla/5.0 (compatible; DunyaGundemi/1.0; onemli gunler)";

async function nagerTopla(yillar: number[]): Promise<{ gunler: NagerGun[]; ulke: number; hata: number }> {
  const ulkeler = (await (await fetch("https://date.nager.at/api/v3/AvailableCountries", { headers: { "user-agent": TARAYICI } })).json()) as { countryCode: string }[];
  const gunlerListesi: NagerGun[] = [];
  let hata = 0;
  for (const { countryCode } of ulkeler) {
    for (const y of yillar) {
      try {
        const yanit = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${countryCode}`, { headers: { "user-agent": TARAYICI }, signal: AbortSignal.timeout(20_000) });
        if (yanit.status === 200) gunlerListesi.push(...((await yanit.json()) as NagerGun[]));
      } catch {
        hata++;
      }
    }
  }
  return { gunler: gunlerListesi, ulke: ulkeler.length, hata };
}

export async function tumGunler(simdi = new Date()): Promise<{ gunler: OnemliGun[]; bilgi: string }> {
  // 120 gün: liste her gün yenilenir; sitenin kısa işlem süresi sınırını zorlamamak için yetecek kadar
  const aralik = gunler(simdi, 120);
  const ilk = isoTarih(aralik[0]);
  const son = isoTarih(aralik[aralik.length - 1]);
  const yillar = [...new Set(aralik.map((t) => t.getUTCFullYear()))];
  const nager = await nagerTopla(yillar);
  const hepsi = [...nagerCevir(nager.gunler, ilk, son), ...sabitGunler(aralik), ...hesaplananUlkeGunleri(aralik), ...diniGunler(aralik)];
  const tekil = [...new Map(hepsi.map((g) => [g.kimlik, g])).values()].sort((a, b) => a.tarih.localeCompare(b.tarih));
  return { gunler: tekil, bilgi: `Nager.Date: ${nager.ulke} ülke (${nager.hata} hata) · ${ilk} – ${son}` };
}

async function main() {
  const kuru = process.argv.includes("--kuru");
  const { gunler: liste, bilgi } = await tumGunler();
  console.log(bilgi);
  const say = (t: string) => liste.filter((g) => g.tur === t).length;
  console.log(`Toplam ${liste.length} gün: ulusal ${say("ulusal")}, resmî ${say("resmi")}, dinî ${say("dini")}, uluslararası ${say("uluslararasi")}`);
  if (kuru) {
    for (const g of liste.slice(0, 30)) console.log(`  ${g.tarih} ${g.ulke_kod ?? "dünya"} [${g.tur}] ${g.ad_tr ?? g.ad_en}`);
    return;
  }
  const adres = (process.env.TARAMA_ADRESI ?? "").replace(/\/+$/, "");
  const anahtar = (process.env.TARAMA_ANAHTARI ?? "").trim();
  if (!adres || !anahtar) throw new Error("TARAMA_ADRESI ve TARAMA_ANAHTARI gerekli.");
  if (liste.length < 100) throw new Error("Çok az gün bulundu; kaynaklar değişmiş olabilir. Gönderilmedi.");
  const y = await fetch(`${adres}/api/gunler`, {
    method: "POST",
    headers: { authorization: `Bearer ${anahtar}`, "content-type": "application/json" },
    body: JSON.stringify({ gunler: liste }),
    signal: AbortSignal.timeout(280_000),
  });
  const govde = await y.text();
  if (!y.ok) throw new Error(`Site kabul etmedi: HTTP ${y.status} ${govde.slice(0, 300)}`);
  console.log(`Gönderildi: ${govde.slice(0, 300)}`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("Önemli günler alınamadı:", (e as Error).message);
    process.exit(1);
  });
}
