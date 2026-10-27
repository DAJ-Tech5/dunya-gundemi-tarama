// Seçim takvimi: Vikipedi'nin ulusal ve yerel seçim takvimi sayfalarını okur, seçimleri ayrıştırır ve siteye gönderir.
// Günde bir kez çalışır (.github/workflows/secimler.yml). Ek paket gerekmez (Node 24).
//
//   node tarama/secimler.ts          → oku, ayrıştır, siteye gönder
//   node tarama/secimler.ts --kuru   → yalnızca oku ve ekrana yaz
//
// Kaynak: https://en.wikipedia.org/wiki/2026_national_electoral_calendar (ve yerel takvim, bu yıl ile gelecek yıl).
// Tek bir meclis bölgesi için yapılan ara seçimler ("special election", "by-election") alınmaz: brifing için gürültüdür.

import ulkeVerisi from "./veri/ulkeler.json" with { type: "json" };

export type Secim = {
  kimlik: string;
  tarih: string | null; // YYYY-MM-DD (tarih kesinleşmediyse null)
  ay: string; // YYYY-MM (tarih kesin olmasa da ay bellidir)
  tarih_metni: string | null; // kesin olmayan tarihin özgün yazımı (ör. "March"), yalnızca bilgi için
  ulke_kod: string;
  bolge_en: string | null; // eyalet, bölge, şehir (yerel seçimlerde)
  tur_en: string; // ör. "President (2nd round)", "Governor", "municipal elections"
  kapsam: "ulusal" | "yerel";
  kaynak_adres: string;
};

const AYLAR = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// --------------------------------------------------------------------------- ülke adları
type UlkeKaydi = { kod: string; en: string; adlar: string[] };
const ULKE_ADI = new Map<string, string>();
for (const u of ulkeVerisi as UlkeKaydi[]) for (const ad of [u.en, ...u.adlar]) ULKE_ADI.set(ad.toLowerCase(), u.kod);
// Vikipedi'deki yazımlar
for (const [ad, kod] of Object.entries({ "united states": "USA", "the gambia": "GMB", gambia: "GMB", "northern cyprus": "CYN", palestine: "PSX", kosovo: "KOS", "czech republic": "CZE", "ivory coast": "CIV", "côte d'ivoire": "CIV", "democratic republic of the congo": "COD", "republic of the congo": "COG", "east timor": "TLS", "north macedonia": "MKD", "the bahamas": "BHS", "federated states of micronesia": "FSM", micronesia: "FSM", "united kingdom": "GBR", russia: "RUS", "south korea": "KOR", "north korea": "PRK", turkey: "TUR", türkiye: "TUR", vietnam: "VNM", laos: "LAO", syria: "SYR", iran: "IRN", bolivia: "BOL", venezuela: "VEN", tanzania: "TZA", moldova: "MDA", "são tomé and príncipe": "STP", eswatini: "SWZ", "cape verde": "CPV" })) {
  if (!ULKE_ADI.has(ad)) ULKE_ADI.set(ad, kod);
}

export function ulkeKodu(ad: string): string | undefined {
  const a = ad.trim().toLowerCase().replace(/^the\s+/, "");
  return ULKE_ADI.get(a) ?? ULKE_ADI.get(`the ${a}`);
}

// --------------------------------------------------------------------------- vikimetin yardımcıları

/** Kaynak etiketlerini, şablonları ve italik işaretlerini temizler. */
function temizle(satir: string): string {
  return satir
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<ref[^>]*>[\s\S]*$/g, "") // satır sonuna taşan kaynak
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

type Parca = { etiket: string; hedef: string | null };

/** "[[hedef|etiket]], düz metin, [[hedef]]" → parçalar (virgül ve "and" ile ayrılmış). */
function parcalar(metin: string): Parca[] {
  const sonuc: Parca[] = [];
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|([^[\],]+)/g;
  for (const m of metin.matchAll(re)) {
    if (m[1]) sonuc.push({ hedef: m[1].trim(), etiket: (m[2] ?? m[1]).trim() });
    else {
      const d = m[3].replace(/^\s*(?:and|&)\s+/i, "").trim();
      if (d && !/^(?:and|&|:)$/i.test(d)) sonuc.push({ hedef: null, etiket: d });
    }
  }
  return sonuc.filter((p) => p.etiket);
}

/** Bağlantı hedefinden ülke: "Elections in Bulgaria" → BGR. */
function hedeftenUlke(hedef: string | null): string | undefined {
  if (!hedef) return undefined;
  const m = /^(?:Elections in|Politics of)\s+(.+?)(?:\s*\(.*\))?$/i.exec(hedef);
  return m ? ulkeKodu(m[1]) : undefined;
}

function secimParcasiMi(p: Parca): boolean {
  return /election|referend|ballot|measure|primar|recall|plebiscit|vote|assembly|parliament|congress|senate|council|governor|mayor|president|cortes|landtag|duma|chamber|house of/i.test(
    `${p.hedef ?? ""} ${p.etiket}`,
  );
}

/** "11 January", "3–8 March", "March", "16 March, 18 June, and 16 October" → tarihler. */
function tarihleriCoz(metin: string, yil: number): { tarih: string | null; ay: string; tarih_metni: string | null }[] {
  const sonuc: { tarih: string | null; ay: string; tarih_metni: string | null }[] = [];
  const re = /(?:(\d{1,2})(?:\s*[–-]\s*\d{1,2})?\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)/gi;
  for (const m of metin.matchAll(re)) {
    const ayNo = AYLAR.indexOf(m[2].toLowerCase()) + 1;
    const ay = `${yil}-${String(ayNo).padStart(2, "0")}`;
    sonuc.push(m[1] ? { tarih: `${ay}-${m[1].padStart(2, "0")}`, ay, tarih_metni: null } : { tarih: null, ay, tarih_metni: m[0] });
  }
  return sonuc;
}

export function kimlikUret(...parcalar: (string | null)[]): string {
  // Basit, kararlı özet (FNV-1a 64): aynı seçim her gün aynı kimliği alır
  let h = 0xcbf29ce484222325n;
  for (const c of parcalar.join("|")) {
    h ^= BigInt(c.codePointAt(0)!);
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

// --------------------------------------------------------------------------- ayrıştırıcı

/**
 * Bir takvim sayfasının vikimetnini seçimlere çevirir. Ay başlıkları (== March ==) altındaki "*" listeleri okunur;
 * "**", "***" alt satırları üst satırın tarihini, ülkesini ve bölgesini devralır. Yalnızca en alttaki (yaprak) satırlar
 * seçim sayılır. "Unknown date" gibi bölümler ay bilgisi olmadığından atlanır.
 */
export function secimleriCoz(vikimetin: string, yil: number, kapsam: "ulusal" | "yerel", kaynakAdres: string): Secim[] {
  const satirlar = vikimetin.split("\n");
  let bolumAy: string | null = null;
  let dolayli = false;
  const sonuc: Secim[] = [];
  type Baglam = { tarihler: ReturnType<typeof tarihleriCoz>; ulke?: string; bolgeler: string[]; turler: string[] };
  const yigin: Baglam[] = [];

  const yapraklar: { derinlik: number; baglam: Baglam }[] = [];
  for (let i = 0; i < satirlar.length; i++) {
    const ham = satirlar[i];
    const baslik = /^==\s*([^=]+?)\s*==\s*$/.exec(ham);
    if (baslik) {
      const ad = baslik[1].toLowerCase();
      const ayNo = AYLAR.indexOf(ad) + 1;
      dolayli = /indirect/.test(ad);
      bolumAy = ayNo ? `${yil}-${String(ayNo).padStart(2, "0")}` : dolayli ? "dolayli" : null;
      yigin.length = 0;
      continue;
    }
    const liste = /^(\*+)\s*(.*)$/.exec(ham);
    if (!liste || !bolumAy) continue;
    const derinlik = liste[1].length;
    let govde = temizle(liste[2]);

    yigin.length = derinlik - 1;
    const ust = yigin[derinlik - 2];
    const baglam: Baglam = { tarihler: ust?.tarihler ?? [], ulke: ust?.ulke, bolgeler: [...(ust?.bolgeler ?? [])], turler: [] };

    // Tarih (yalnızca en üst seviyede): "11 January:", "March:", "6 December ''[[..." (iki nokta olmadan)
    if (derinlik === 1) {
      const t = /^((?:[^[\]:']*?)(?:January|February|March|April|May|June|July|August|September|October|November|December)[^[\]:']*?)\s*:?\s*(?=\[\[|''|$)/i.exec(govde);
      if (t) {
        baglam.tarihler = tarihleriCoz(t[1], yil);
        govde = govde.slice(t[0].length).trim();
      } else if (bolumAy !== "dolayli") {
        baglam.tarihler = [{ tarih: null, ay: bolumAy, tarih_metni: null }];
      }
      if (!baglam.tarihler.length) continue;
    }

    for (const p of parcalar(govde)) {
      const ulke = hedeftenUlke(p.hedef) ?? (!baglam.ulke ? ulkeKodu(p.etiket) : undefined);
      if (ulke && !baglam.ulke) baglam.ulke = ulke;
      else if (ulke && ulke === baglam.ulke) continue; // ülke adının tekrarı
      // "Elections in Alabama" gibi ülke olmayan bölge (eyalet, il) bağlantısı → bölge
      else if (/^(?:Elections in|Politics of)\s/i.test(p.hedef ?? "")) baglam.bolgeler.push(p.etiket);
      else if (secimParcasiMi(p)) baglam.turler.push(p.etiket);
      else if (/^\(.*\)$/.test(p.etiket) && baglam.turler.length) baglam.turler[baglam.turler.length - 1] += ` ${p.etiket}`;
      else baglam.bolgeler.push(p.etiket);
    }
    // "(2nd round)" gibi bağlantı dışında kalan tur bilgisi
    const tur = /\((\d)(?:st|nd|rd|th) (?:round|phase)\)/i.exec(govde);
    if (tur && baglam.turler.length && !baglam.turler.at(-1)!.includes("(")) baglam.turler[baglam.turler.length - 1] += ` ${tur[0]}`;

    yigin[derinlik - 1] = baglam;
    const sonraki = satirlar[i + 1] ?? "";
    const altVar = new RegExp(`^\\*{${derinlik + 1},}`).test(sonraki);
    if (!altVar) yapraklar.push({ derinlik, baglam });
  }

  for (const { baglam } of yapraklar) {
    if (!baglam.ulke || !baglam.turler.length) continue;
    const turEn = baglam.turler.join(", ").replace(/\s+/g, " ").trim();
    if (/special election|by-election|by election/i.test(turEn)) continue; // tek bölgelik ara seçim: alınmaz
    const bolge = baglam.bolgeler.join(", ").replace(/\s+/g, " ").trim() || null;
    for (const t of baglam.tarihler) {
      sonuc.push({
        kimlik: kimlikUret(kapsam, t.tarih ?? t.ay, baglam.ulke, bolge, turEn),
        tarih: t.tarih,
        ay: t.ay,
        tarih_metni: t.tarih_metni,
        ulke_kod: baglam.ulke,
        bolge_en: kapsam === "yerel" ? bolge : null,
        tur_en: turEn.slice(0, 200),
        kapsam,
        kaynak_adres: kaynakAdres,
      });
    }
  }
  // Aynı kimlik bir kez
  return [...new Map(sonuc.map((s) => [s.kimlik, s])).values()];
}

// --------------------------------------------------------------------------- çalıştırma

const TARAYICI = "Mozilla/5.0 (compatible; DunyaGundemi/1.0; secim takvimi)";

async function vikimetinGetir(sayfa: string): Promise<string | null> {
  const adres = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(sayfa)}&prop=wikitext&format=json&formatversion=2`;
  const y = await fetch(adres, { headers: { "user-agent": TARAYICI }, signal: AbortSignal.timeout(30_000) });
  if (!y.ok) return null;
  const j = (await y.json()) as { parse?: { wikitext?: string } };
  return j.parse?.wikitext ?? null;
}

export async function tumSecimler(simdi = new Date()): Promise<{ secimler: Secim[]; sayfalar: { sayfa: string; secim: number }[] }> {
  const yil = simdi.getUTCFullYear();
  const secimler: Secim[] = [];
  const sayfalar: { sayfa: string; secim: number }[] = [];
  for (const y of [yil, yil + 1]) {
    for (const kapsam of ["ulusal", "yerel"] as const) {
      const sayfa = `${y}_${kapsam === "ulusal" ? "national" : "local"}_electoral_calendar`;
      const metin = await vikimetinGetir(sayfa).catch(() => null);
      const bulunan = metin ? secimleriCoz(metin, y, kapsam, `https://en.wikipedia.org/wiki/${sayfa}`) : [];
      secimler.push(...bulunan);
      sayfalar.push({ sayfa, secim: bulunan.length });
    }
  }
  return { secimler, sayfalar };
}

async function main() {
  const kuru = process.argv.includes("--kuru");
  const { secimler, sayfalar } = await tumSecimler();
  for (const s of sayfalar) console.log(`${s.sayfa}: ${s.secim} seçim`);
  const bugun = new Date().toISOString().slice(0, 10);
  const yaklasan = secimler.filter((s) => (s.tarih ?? `${s.ay}-31`) >= bugun);
  console.log(`Toplam ${secimler.length} seçim, bugünden sonra ${yaklasan.length}.`);
  if (kuru) {
    for (const s of yaklasan.slice(0, 25)) console.log(`  ${s.tarih ?? s.ay} ${s.ulke_kod} ${s.bolge_en ? s.bolge_en + " · " : ""}${s.tur_en}`);
    return;
  }
  const adres = (process.env.TARAMA_ADRESI ?? "").replace(/\/+$/, "");
  const anahtar = (process.env.TARAMA_ANAHTARI ?? "").trim();
  if (!adres || !anahtar) throw new Error("TARAMA_ADRESI ve TARAMA_ANAHTARI gerekli.");
  if (!yaklasan.length) throw new Error("Hiç seçim bulunamadı; sayfa biçimi değişmiş olabilir. Gönderilmedi.");
  const y = await fetch(`${adres}/api/secimler`, {
    method: "POST",
    headers: { authorization: `Bearer ${anahtar}`, "content-type": "application/json" },
    body: JSON.stringify({ secimler: yaklasan }),
    signal: AbortSignal.timeout(180_000),
  });
  const govde = await y.text();
  if (!y.ok) throw new Error(`Site kabul etmedi: HTTP ${y.status} ${govde.slice(0, 300)}`);
  console.log(`Gönderildi: ${govde.slice(0, 300)}`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("Seçim takvimi alınamadı:", (e as Error).message);
    process.exit(1);
  });
}
