// Tarihte bugün: Türkçe Vikipedi'nin "tarihte bugün" olay listesi (Wikimedia'nın herkese açık akışı).
// Bugün ve sonraki iki gün okunur, siteye gönderilir; site her gün için birkaç olay seçer.
//   node tarama/tarihte-bugun.ts --kuru   → yalnızca ekrana yazar

const TARAYICI = "Mozilla/5.0 (compatible; DunyaGundemi/1.0; tarihte bugun)";
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN_SAYISI = 3;

export type TarihOlayi = { yil: number; metin: string; adres: string | null };
export type TarihGunu = { tarih: string; kaynak_adres: string; olaylar: TarihOlayi[] };

/** Türkiye saatine göre bugünden `ek` gün sonrası (YYYY-MM-DD). */
export function turkiyeTarihi(simdi: Date, ek = 0): string {
  return new Date(simdi.getTime() + 3 * 3_600_000 + ek * 86_400_000).toISOString().slice(0, 10);
}

/** O günün Türkçe Vikipedi sayfası, ör. https://tr.wikipedia.org/wiki/27_Ekim */
export function gunSayfasi(tarih: string): string {
  const [, ay, gun] = tarih.split("-").map(Number);
  return `https://tr.wikipedia.org/wiki/${encodeURIComponent(`${gun}_${AYLAR[ay - 1]}`)}`;
}

type AkisOlayi = { year?: unknown; text?: unknown; pages?: { content_urls?: { desktop?: { page?: unknown } } }[] };

/** Akıştaki olayları sadeleştirir: yılı ve metni olanlar, çok uzun olmayanlar, yıla göre sıralı. */
export function olaylariAyikla(akis: unknown): TarihOlayi[] {
  const liste = ((akis as { events?: AkisOlayi[] })?.events ?? []) as AkisOlayi[];
  const gorulen = new Set<string>();
  const sonuc: TarihOlayi[] = [];
  for (const o of liste) {
    if (typeof o.year !== "number" || typeof o.text !== "string") continue;
    const metin = o.text.replace(/\s+/g, " ").trim();
    if (metin.length < 10 || metin.length > 400 || gorulen.has(metin)) continue;
    gorulen.add(metin);
    const adres = o.pages?.[0]?.content_urls?.desktop?.page;
    sonuc.push({ yil: o.year, metin, adres: typeof adres === "string" && adres.startsWith("https://tr.wikipedia.org/") ? adres : null });
  }
  return sonuc.sort((a, b) => a.yil - b.yil);
}

async function gunuOku(tarih: string): Promise<TarihGunu> {
  const [, ay, gun] = tarih.split("-");
  const y = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/tr/onthisday/events/${ay}/${gun}`, {
    headers: { "user-agent": TARAYICI },
    signal: AbortSignal.timeout(30_000),
  });
  if (!y.ok) throw new Error(`${tarih}: HTTP ${y.status}`);
  return { tarih, kaynak_adres: gunSayfasi(tarih), olaylar: olaylariAyikla(await y.json()) };
}

async function main() {
  const kuru = process.argv.includes("--kuru");
  const simdi = new Date();
  const gunler: TarihGunu[] = [];
  for (let i = 0; i < GUN_SAYISI; i++) {
    const tarih = turkiyeTarihi(simdi, i);
    try {
      const g = await gunuOku(tarih);
      if (g.olaylar.length) gunler.push(g);
      console.log(`${tarih}: ${g.olaylar.length} olay`);
    } catch (e) {
      console.error((e as Error).message);
    }
  }
  if (kuru) {
    for (const o of gunler[0]?.olaylar ?? []) console.log(`  ${o.yil} - ${o.metin}`);
    return;
  }
  if (!gunler.length) throw new Error("Hiç olay alınamadı; gönderilmedi.");
  const adres = (process.env.TARAMA_ADRESI ?? "").replace(/\/+$/, "");
  const anahtar = (process.env.TARAMA_ANAHTARI ?? "").trim();
  if (!adres || !anahtar) throw new Error("TARAMA_ADRESI ve TARAMA_ANAHTARI gerekli.");
  const y = await fetch(`${adres}/api/tarihte-bugun`, {
    method: "POST",
    headers: { authorization: `Bearer ${anahtar}`, "content-type": "application/json" },
    body: JSON.stringify({ gunler }),
    signal: AbortSignal.timeout(280_000),
  });
  const govde = await y.text();
  if (!y.ok) throw new Error(`Site kabul etmedi: HTTP ${y.status} ${govde.slice(0, 300)}`);
  console.log(`Gönderildi: ${govde.slice(0, 300)}`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("Tarihte bugün alınamadı:", (e as Error).message);
    process.exit(1);
  });
}
