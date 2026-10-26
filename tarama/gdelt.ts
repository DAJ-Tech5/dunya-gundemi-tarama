// GDELT ham veri dosyaları (GKG 2.1). Her 15 dakikada bir yayımlanır, istek sınırı yoktur.
// Arama servisi (DOC API) sık "çok fazla istek" hatası verdiği için onun yerine bu dosyalar okunur.
// Dosya biçimi: http://data.gdeltproject.org/documentation/GDELT-Global_Knowledge_Graph_Codebook-V2.1.pdf

import { inflateRawSync } from "node:zlib";
import { varlikCoz, type Haber } from "./rss.ts";
import { alanKaynagi } from "./kaynaklar.ts";
import { guvenilirAlanMi } from "./veri/guvenilir-alanlar.ts";

export const SON_GUNCELLEME = "https://data.gdeltproject.org/gdeltv2/lastupdate.txt";
const ON_BES_DK = 15 * 60_000;

/** "20261025044500" → Date */
export function damgaCoz(damga: string): Date {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(damga);
  if (!m) throw new Error(`GDELT zaman damgası okunamadı: ${damga}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}

function damgaYaz(t: Date): string {
  return t.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

/**
 * Son güncelleme listesinden en yeni GKG dosyasını ve ondan önceki dosyaları bulur
 * (tarama 30 dakikada bir çalıştığı için varsayılan 2 dosya = son 30 dakika).
 */
export function gkgAdresleri(sonGuncelleme: string, adet = 2): string[] {
  const satir = sonGuncelleme.split(/\r?\n/).find((s) => /\.gkg\.csv\.zip\s*$/i.test(s));
  const damga = satir && /(\d{14})\.gkg\.csv\.zip/i.exec(satir)?.[1];
  if (!damga) throw new Error("GDELT son güncelleme listesinde GKG dosyası yok");
  const son = damgaCoz(damga);
  return Array.from(
    { length: adet },
    (_, i) => `https://data.gdeltproject.org/gdeltv2/${damgaYaz(new Date(son.getTime() - i * ON_BES_DK))}.gkg.csv.zip`,
  );
}

/** Tek dosyalı ZIP arşivini açar (ek paket yok; içindekiler dizininden okunur). */
export function zipAc(zip: Buffer): Buffer {
  // Arşiv sonu kaydı (End of Central Directory)
  let son = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      son = i;
      break;
    }
  }
  if (son < 0) throw new Error("ZIP arşivi okunamadı");
  const dizin = zip.readUInt32LE(son + 16);
  if (zip.readUInt32LE(dizin) !== 0x02014b50) throw new Error("ZIP içindekiler dizini bozuk");
  const yontem = zip.readUInt16LE(dizin + 10);
  const sikistirilmis = zip.readUInt32LE(dizin + 20);
  const yerel = zip.readUInt32LE(dizin + 42);
  if (zip.readUInt32LE(yerel) !== 0x04034b50) throw new Error("ZIP dosya başlığı bozuk");
  const veriBasi = yerel + 30 + zip.readUInt16LE(yerel + 26) + zip.readUInt16LE(yerel + 28);
  const veri = zip.subarray(veriBasi, veriBasi + sikistirilmis);
  if (yontem === 0) return Buffer.from(veri);
  if (yontem === 8) return inflateRawSync(veri);
  throw new Error(`Desteklenmeyen ZIP sıkıştırması: ${yontem}`);
}

/**
 * GKG satırlarını haberlere çevirir. Yalnızca İngilizce web haberleri (çeviri bilgisi boş) alınır;
 * başlık "Extras" alanındaki <PAGE_TITLE> etiketinden gelir.
 */
export function gkgCoz(metin: string): Haber[] {
  const sonuc: Haber[] = [];
  const gorulen = new Set<string>();
  for (const satir of metin.split("\n")) {
    if (!satir) continue;
    const a = satir.split("\t");
    if (a.length < 27) continue;
    const [, damga, tur, alan, adres] = a;
    if (tur !== "1" || a[25]) continue; // 1 = web; çeviri bilgisi doluysa İngilizce değil
    if (!alan || !guvenilirAlanMi(alan)) continue; // yalnızca güvenilir yayın kuruluşları (veri/guvenilir-alanlar.ts)
    const baslik = /<PAGE_TITLE>([\s\S]*?)<\/PAGE_TITLE>/.exec(a[26])?.[1];
    if (!baslik || !/^https?:\/\//i.test(adres) || gorulen.has(adres)) continue;
    gorulen.add(adres);
    let yayin: string;
    try {
      yayin = damgaCoz(damga).toISOString();
    } catch {
      continue;
    }
    sonuc.push({
      baslik: varlikCoz(baslik).replace(/\s+/g, " ").trim().slice(0, 300),
      adres,
      kaynak: alan ? alanKaynagi(alan) : "GDELT",
      yayin,
      ozet: "",
      gdelt: true,
    });
  }
  return sonuc;
}
