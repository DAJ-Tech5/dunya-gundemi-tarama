// Bağımsız kaynak sayısı: ajanslar (RSS) tam sayılır; GDELT'teki küçük siteler aynı haberi kopyalayabildiği için
// bir gelişmede en fazla AZAMI_GDELT_KAYNAGI kadarı sayılır. Hem tarama hem site (birleştirme) bunu kullanır.
import { RSS_KAYNAKLARI } from "../kaynaklar.ts";

export const AZAMI_GDELT_KAYNAGI = 2;
const AJANS_ADLARI = new Set(RSS_KAYNAKLARI.map((k) => k.ad));

export function ajansMi(kaynak: string): boolean {
  return AJANS_ADLARI.has(kaynak);
}

export function kaynakSayisi(kaynaklar: string[]): number {
  const ajanslar = new Set<string>();
  const siteler = new Set<string>();
  for (const k of kaynaklar) {
    if (AJANS_ADLARI.has(k)) ajanslar.add(k);
    else siteler.add(k.toLowerCase().replace(/^www\./, ""));
  }
  return ajanslar.size + Math.min(siteler.size, AZAMI_GDELT_KAYNAGI);
}
