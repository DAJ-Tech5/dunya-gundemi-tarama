// Aynı olayı anlatan haberleri tek "gelişme" altında toplar ve puanlar.
// Önceki taramalardan kalan olaylar da verilir; yeni haberler mümkünse onlara eklenir.

import type { GidenOlay, MevcutOlay } from "../lib/olaylar.ts";
import type { Haber } from "./rss.ts";
import { ajansMi, kaynakSayisi } from "./veri/kaynak-sayisi.ts";
import { gorusYazisiMi } from "./veri/guvenilir-alanlar.ts";
import { anahtarKelimeler, benzerlik, konuOrtakSayisi, kategoriBul, KATEGORILER, puanla, turkiyeIlgili, ulkeBul } from "./siniflandir.ts";

export const BENZERLIK_ESIGI = 0.3;
/** Aynı ülke + aynı tür + 24 saat içinde ise daha düşük eşik yeter. */
export const YAKIN_BENZERLIK_ESIGI = 0.12;
export const ZAMAN_PENCERESI_SAAT = 36;
/** Bir grup ilk haberinden bu kadar saat sonra yeni haber almaz (konu kaymasın, grup sonsuza kadar büyümesin). */
export const EN_UZUN_OMUR_SAAT = 48;
/** İki haberin aynı gelişme sayılması için gereken en az ortak "konu" kelimesi (ülke/lider adları ve genel kelimeler sayılmaz). */
export const EN_AZ_ORTAK_KONU = 1;
/** Bir taramada bir gelişme için siteye gönderilen en fazla yeni haber (önce ajanslar). */
export const OLAY_BASINA_HABER = 20;

// Kaynak sayımı tarama ve site arasında ortaktır (tarama/veri/kaynak-sayisi.ts)
export { kaynakSayisi };

/** Kaynak güvenilirlik sırası: temsilci başlık bu sıraya göre seçilir. */
const KAYNAK_SIRASI = ["AA (Türkçe)", "Haberler.com", "Anadolu Ajansı", "Reuters", "AP", "BBC", "DW", "France 24", "Al Jazeera", "The Guardian", "Euronews", "ReliefWeb (BM)"];

export type SiniflanmisHaber = Haber & {
  ulke: string;
  tur: string;
  taban: number;
  turkiye: boolean;
  kelimeler: Set<string>;
  yerel: boolean; // kaynak yalnızca bu ülkenin ajansı mı
};

/** Habere tür ve ülke atar; ilgisiz (türü yok) veya yeri bulunamayan haberler atılır. */
export function siniflandir(h: Haber): SiniflanmisHaber | null {
  if (gorusYazisiMi(h.baslik, h.adres)) return null; // görüş yazısı, okur mektubu, başyazı: haber değil
  const metin = `${h.baslik}. ${h.ozet}`;
  // Tür önce başlıktan; yalnızca açıklamada geçiyorsa daha düşük taban
  const basliktan = kategoriBul(h.baslik);
  const ozettenGelen = basliktan ? undefined : kategoriBul(metin);
  const kat = basliktan ?? ozettenGelen;
  if (!kat) return null;
  const ulke = ulkeBul(h.baslik, h.ozet, h.ulke);
  if (!ulke) return null;
  return {
    ...h,
    ulke,
    tur: kat.id,
    taban: basliktan ? kat.taban : Math.max(4, kat.taban - 1),
    turkiye: turkiyeIlgili(metin),
    kelimeler: anahtarKelimeler(`${h.baslik} ${h.ozet.slice(0, 160)}`),
    yerel: Boolean(h.ulke) && h.ulke === ulke,
  };
}

type Kume = {
  id: string;
  yeni: boolean;
  degisti: boolean;
  ulke: string;
  ilk: string;
  son: string;
  baslik: string;
  /** ana başlığın kelimeleri (kayma denetimi için, ilk kullanımda hesaplanır) */
  anaKelimeler?: Set<string>;
  tur: string;
  haberler: {
    adres: string;
    baslik: string;
    kaynak: string;
    yayin?: string;
    kelimeler: Set<string>;
    taban?: number;
    turkiye?: boolean;
    yerel?: boolean;
  }[];
};

function tabanBul(tur: string): number {
  return KATEGORILER.find((k) => k.id === tur)?.taban ?? 4;
}

export function kumele(
  mevcut: MevcutOlay[],
  yeniHaberler: SiniflanmisHaber[],
  kimlikUret: () => string,
): GidenOlay[] {
  const kumeler: Kume[] = mevcut.map((o) => ({
    id: o.id,
    yeni: false,
    degisti: false,
    ulke: o.ulke_kod,
    ilk: o.ilk_gorulme,
    son: o.son_gorulme,
    baslik: o.baslik,
    tur: o.tur,
    haberler: o.haberler.map((h) => ({ ...h, kelimeler: anahtarKelimeler(h.baslik) })),
  }));
  const bilinenAdresler = new Set(kumeler.flatMap((k) => k.haberler.map((h) => h.adres)));

  for (const h of [...yeniHaberler].sort((a, b) => a.yayin.localeCompare(b.yayin))) {
    if (bilinenAdresler.has(h.adres)) continue;
    bilinenAdresler.add(h.adres);
    const zaman = new Date(h.yayin).getTime();
    let enIyi: { kume: Kume; skor: number } | undefined;
    for (const k of kumeler) {
      if (k.ulke !== h.ulke) continue;
      if (Math.abs(new Date(k.son).getTime() - zaman) > ZAMAN_PENCERESI_SAAT * 3_600_000) continue;
      // Grup sonsuza kadar büyümesin: ilk haberinden EN_UZUN_OMUR_SAAT sonra yeni haber almaz (gelişme sürerse yeni grup açılır)
      if (zaman - new Date(k.ilk).getTime() > EN_UZUN_OMUR_SAAT * 3_600_000) continue;
      // Yalnızca konuya özgü en az EN_AZ_ORTAK_KONU kelime paylaşan haberlerle karşılaştırılır
      // ("Trump" + "savaş" gibi genel kelimeler alakasız haberleri birleştirmesin)
      const eslesenler = k.haberler.filter((x) => konuOrtakSayisi(x.kelimeler, h.kelimeler) >= EN_AZ_ORTAK_KONU);
      // Kayma denetimi: zincirleme benzerlikle konu kaymasın. Yeni haber ya grubun ana başlığıyla konu kelimesi paylaşmalı
      // ya da gruptaki en az iki haberle (A–B, B–C, C–D… diye alakasız haberlere varılmasın)
      const anaKelimeler = k.anaKelimeler ?? (k.anaKelimeler = anahtarKelimeler(k.baslik));
      if (konuOrtakSayisi(anaKelimeler, h.kelimeler) < 1 && eslesenler.length < 2) continue;
      const skor = Math.max(0, ...eslesenler.map((x) => benzerlik(x.kelimeler, h.kelimeler)));
      const yakin = k.tur === h.tur && Math.abs(new Date(k.son).getTime() - zaman) <= 24 * 3_600_000;
      if (skor >= (yakin ? YAKIN_BENZERLIK_ESIGI : BENZERLIK_ESIGI) && (!enIyi || skor > enIyi.skor)) enIyi = { kume: k, skor };
    }
    const kayit = { adres: h.adres, baslik: h.baslik, kaynak: h.kaynak, yayin: h.yayin, kelimeler: h.kelimeler, taban: h.taban, turkiye: h.turkiye, yerel: h.yerel };
    if (enIyi) {
      const k = enIyi.kume;
      k.haberler.push(kayit);
      k.degisti = true;
      if (h.yayin < k.ilk) k.ilk = h.yayin;
      if (h.yayin > k.son) k.son = h.yayin;
      if (h.taban > Math.max(...k.haberler.slice(0, -1).map((x) => x.taban ?? tabanBul(k.tur)))) k.tur = h.tur;
    } else {
      kumeler.push({
        id: kimlikUret(),
        yeni: true,
        degisti: true,
        ulke: h.ulke,
        ilk: h.yayin,
        son: h.yayin,
        baslik: h.baslik,
        tur: h.tur,
        haberler: [kayit],
      });
    }
  }

  // Yalnızca yeni veya değişen olaylar gönderilir
  return kumeler
    .filter((k) => k.degisti)
    .map((k): GidenOlay => {
      const sayi = kaynakSayisi(k.haberler.map((h) => h.kaynak));
      const turkiye = k.haberler.some((h) => h.turkiye ?? turkiyeIlgili(h.baslik));
      const temsilci =
        [...k.haberler].sort((a, b) => {
          const sa = KAYNAK_SIRASI.indexOf(a.kaynak);
          const sb = KAYNAK_SIRASI.indexOf(b.kaynak);
          return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb);
        })[0] ?? k.haberler[0];
      return {
        id: k.id,
        baslik: temsilci.baslik,
        ulke_kod: k.ulke,
        tur: k.tur,
        puan: puanla(
          Math.max(...k.haberler.map((h) => h.taban ?? tabanBul(k.tur))),
          sayi,
          turkiye,
          k.haberler.every((h) => h.yerel === true),
        ),
        kaynak_sayisi: sayi,
        turkiye,
        ilk_gorulme: k.ilk,
        son_gorulme: k.son,
        // Siteye yalnızca yeni haberler gider (eskiler zaten kayıtlı); en az bir haber olmalı
        haberler: k.haberler
          .filter((h) => h.yayin)
          .sort((a, b) => Number(ajansMi(b.kaynak)) - Number(ajansMi(a.kaynak)))
          .slice(0, OLAY_BASINA_HABER)
          .map((h) => ({ adres: h.adres, baslik: h.baslik, kaynak: h.kaynak, yayin: h.yayin! })),
      };
    })
    .filter((o) => o.haberler.length > 0);
}
