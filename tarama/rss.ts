// RSS / Atom / RDF akışlarını okuyan küçük ayrıştırıcı (ek paket yok).

export type Haber = {
  baslik: string;
  adres: string;
  kaynak: string;
  yayin: string; // ISO tarih
  ozet: string; // kısa açıklama (en fazla 300 karakter, yalnızca sınıflandırma için)
  ulke?: string; // kaynak tek ülkeye aitse
  gdelt?: boolean; // GDELT'ten gelen (çoğu küçük site) haber
};

const VARLIKLAR: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function varlikCoz(metin: string): string {
  return metin.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tam, v: string) => {
    if (v[0] === "#") {
      const n = v[1] === "x" || v[1] === "X" ? parseInt(v.slice(2), 16) : parseInt(v.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return VARLIKLAR[v.toLowerCase()] ?? tam;
  });
}

/** CDATA ve etiketleri temizler, varlıkları çözer, boşlukları sadeleştirir. */
export function duzMetin(ham: string): string {
  const cdata = ham.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Bazı akışlar HTML'i kaçışlı yazar (&lt;p&gt;); önce çöz, sonra etiketleri at
  const cozulmus = /&lt;\/?[a-z]/i.test(cdata) ? varlikCoz(cdata) : cdata;
  return varlikCoz(cozulmus.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function etiket(blok: string, adlar: string[]): string | undefined {
  for (const ad of adlar) {
    const m = new RegExp(`<${ad}(?:\\s[^>]*)?>([\\s\\S]*?)</${ad}>`, "i").exec(blok);
    if (m) return m[1];
  }
  return undefined;
}

function tarihCoz(ham: string | undefined): string | undefined {
  if (!ham) return undefined;
  const t = new Date(duzMetin(ham));
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
}

export function akisCoz(xml: string, kaynak: string, ulke?: string, simdi = new Date()): Haber[] {
  const bloklar = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const sonuc: Haber[] = [];
  for (const blok of bloklar) {
    const baslik = duzMetin(etiket(blok, ["title"]) ?? "");
    let adres = duzMetin(etiket(blok, ["link"]) ?? "");
    if (!adres) {
      // Atom: <link href="..."/>
      adres = /<link[^>]*href="([^"]+)"/i.exec(blok)?.[1] ?? "";
      adres = varlikCoz(adres);
    }
    if (!adres) adres = duzMetin(etiket(blok, ["guid", "id"]) ?? "");
    if (!baslik || !/^https?:\/\//i.test(adres)) continue;
    const yayin = tarihCoz(etiket(blok, ["pubDate", "dc:date", "published", "updated"]));
    // Gelecekteki veya tarihsiz haberlerde şimdiki zaman kullanılır
    const zaman = yayin && new Date(yayin) <= simdi ? yayin : simdi.toISOString();
    const ozet = duzMetin(etiket(blok, ["description", "summary", "content:encoded", "content"]) ?? "").slice(0, 300);
    sonuc.push({ baslik: baslik.slice(0, 300), adres: adres.trim(), kaynak, yayin: zaman, ozet, ulke });
  }
  return sonuc;
}
