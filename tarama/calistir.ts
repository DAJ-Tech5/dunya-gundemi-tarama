// Haber taraması: kaynakları okur, sınıflandırır, gruplar ve sonucu siteye gönderir.
// GitHub Actions'ta her 30 dakikada bir çalışır (.github/workflows/tarama.yml). Ek paket gerektirmez.
//
// Ortam değişkenleri:
//   TARAMA_ADRESI   Sitenin adresi (ör. https://....workers.dev)
//   TARAMA_ANAHTARI Site ile paylaşılan gizli anahtar (GitHub "secret" olarak saklanır)
// Seçenek: --kuru  → siteye göndermez, yalnızca sonucu yazar.

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import type { KaynakDurumu, MevcutOlay, TaramaGonderimi } from "../lib/olaylar.ts";
import { gkgAdresleri, gkgCoz, SON_GUNCELLEME, zipAc } from "./gdelt.ts";
import { RSS_KAYNAKLARI } from "./kaynaklar.ts";
import { kumele, siniflandir, type SiniflanmisHaber } from "./kume.ts";
import { akisCoz, type Haber } from "./rss.ts";
import { gosterilirMi, ulkeBilgisi } from "./siniflandir.ts";

const KURU = process.argv.includes("--kuru");
const ADRES = (process.env.TARAMA_ADRESI ?? "").replace(/\/+$/, "");
// Kopyalarken araya giren boşluk / satır sonu temizlenir
const ANAHTAR = (process.env.TARAMA_ANAHTARI ?? "").trim();
const ANAHTAR_IPUCU =
  "GitHub'daki TARAMA_ANAHTARI, sitedeki anahtarla aynı değil. Sitedeki anahtarı GitHub → Settings → Secrets and variables → Actions → TARAMA_ANAHTARI → Update ile yeniden yapıştırın.";
const TARAYICI = "Mozilla/5.0 (compatible; DunyaGundemi/1.0; haber taramasi)";
const ZAMAN_ASIMI = 20_000;

const calistirDosya = promisify(execFile);

/**
 * Akışlar curl ile okunur: bazı siteler (ör. ReliefWeb) Node'un kendi bağlantısını engelliyor.
 * curl Windows 10+ ve GitHub'ın Linux makinelerinde hazırdır.
 */
async function metinGetir(adres: string): Promise<string> {
  const { stdout } = await calistirDosya(
    "curl",
    ["-sSL", "--compressed", "--max-time", String(ZAMAN_ASIMI / 1000), "-A", TARAYICI, "--fail", adres],
    { maxBuffer: 20 * 1024 * 1024, encoding: "utf8" },
  );
  return stdout;
}

async function baytGetir(adres: string): Promise<Buffer> {
  const { stdout } = await calistirDosya(
    "curl",
    ["-sSL", "--max-time", "60", "-A", TARAYICI, "--fail", adres],
    { maxBuffer: 60 * 1024 * 1024, encoding: "buffer" },
  );
  return stdout;
}

async function rssOku(): Promise<{ haberler: Haber[]; durum: KaynakDurumu[] }> {
  const sonuclar = await Promise.all(
    RSS_KAYNAKLARI.map(async (k) => {
      try {
        const haberler = akisCoz(await metinGetir(k.adres), k.ad, k.ulke).map((h) =>
          k.sonEk && h.baslik.endsWith(k.sonEk) ? { ...h, baslik: h.baslik.slice(0, -k.sonEk.length).trim() } : h,
        );
        return { haberler, durum: { ad: k.ad, durum: "tamam" as const, haber: haberler.length } };
      } catch (e) {
        const satirlar = (e as Error).message.trim().split(/\r?\n/);
        console.warn(`  ! ${k.ad}: ${satirlar[satirlar.length - 1]}`);
        return { haberler: [], durum: { ad: k.ad, durum: "hata" as const, haber: 0 } };
      }
    }),
  );
  return { haberler: sonuclar.flatMap((s) => s.haberler), durum: sonuclar.map((s) => s.durum) };
}

/** GDELT ham dosyaları: son 30 dakikanın (2 dosya) dünya basını başlıkları. İstek sınırı yoktur. */
async function gdeltOku(): Promise<{ haberler: Haber[]; durum: KaynakDurumu[] }> {
  try {
    const adresler = gkgAdresleri(await metinGetir(SON_GUNCELLEME), 2);
    const dosyalar = await Promise.allSettled(adresler.map(async (a) => gkgCoz(zipAc(await baytGetir(a)).toString("utf8"))));
    const haberler = dosyalar.flatMap((d) => (d.status === "fulfilled" ? d.value : []));
    const basarisiz = dosyalar.filter((d) => d.status === "rejected").length;
    if (basarisiz === dosyalar.length) throw new Error("GDELT dosyaları indirilemedi");
    return { haberler, durum: [{ ad: "GDELT", durum: "tamam", haber: haberler.length }] };
  } catch (e) {
    const satirlar = (e as Error).message.trim().split(/\r?\n/);
    console.warn(`  ! GDELT: ${satirlar[satirlar.length - 1]}`);
    return { haberler: [], durum: [{ ad: "GDELT", durum: "hata", haber: 0 }] };
  }
}

async function mevcutAl(): Promise<MevcutOlay[]> {
  if (KURU && !ANAHTAR) return [];
  const y = await fetch(`${ADRES}/api/tarama`, {
    headers: { authorization: `Bearer ${ANAHTAR}` },
    signal: AbortSignal.timeout(ZAMAN_ASIMI),
  });
  if (y.status === 401) throw new Error(`Site anahtarı kabul etmedi (HTTP 401). ${ANAHTAR_IPUCU}`);
  if (!y.ok) throw new Error(`Site önceki olayları vermedi (HTTP ${y.status})`);
  return ((await y.json()) as { olaylar: MevcutOlay[] }).olaylar;
}

async function main() {
  if (!KURU && (!ADRES || !ANAHTAR)) {
    console.error(
      "TARAMA_ANAHTARI bulunamadı. GitHub → Settings → Secrets and variables → Actions bölümünde adı tam olarak TARAMA_ANAHTARI olan bir gizli değer olmalı (ya da --kuru kullanın).",
    );
    process.exit(1);
  }
  const baslangic = new Date().toISOString();
  console.log(`Tarama başladı: ${baslangic}`);

  const [mevcut, rss, gdelt] = await Promise.all([mevcutAl(), rssOku(), gdeltOku()]);
  const hepsi = [...rss.haberler, ...gdelt.haberler];

  // Son 36 saatten eski haberler alınmaz
  const esik = Date.now() - 36 * 3_600_000;
  const siniflanmis = hepsi
    .filter((h) => new Date(h.yayin).getTime() >= esik)
    .map(siniflandir)
    .filter((h): h is SiniflanmisHaber => h !== null);

  // Önce yüksek puanlılar; sitenin kabul sınırları aşılmasın (en fazla 400 gelişme, 1500 haber)
  const tumu = kumele(mevcut, siniflanmis, () => randomUUID().replace(/-/g, "")).sort((a, b) => b.puan - a.puan);
  const olaylar: typeof tumu = [];
  let haberToplami = 0;
  for (const o of tumu) {
    if (olaylar.length >= 400 || haberToplami + o.haberler.length > 1400) break;
    olaylar.push(o);
    haberToplami += o.haberler.length;
  }

  const gonderim: TaramaGonderimi = {
    baslangic,
    bitis: new Date().toISOString(),
    haber_sayisi: hepsi.length,
    kaynaklar: [...rss.durum, ...gdelt.durum],
    olaylar,
  };

  console.log(
    `Okunan haber: ${hepsi.length} · ilgili: ${siniflanmis.length} · yeni/değişen gelişme: ${olaylar.length} · önceki: ${mevcut.length}`,
  );
  for (const o of olaylar.filter((o) => gosterilirMi(o.puan, o.ulke_kod)).sort((a, b) => b.puan - a.puan).slice(0, 25)) {
    console.log(`  [${o.puan}] ${ulkeBilgisi(o.ulke_kod)?.ad ?? o.ulke_kod} · ${o.tur} · ${o.kaynak_sayisi} kaynak · ${o.baslik}`);
  }

  if (KURU) return;
  const y = await fetch(`${ADRES}/api/tarama`, {
    method: "POST",
    headers: { authorization: `Bearer ${ANAHTAR}`, "content-type": "application/json" },
    body: JSON.stringify(gonderim),
    signal: AbortSignal.timeout(180_000), // site sonucu kaydedip Claude değerlendirmesini bekler
  });
  if (!y.ok) {
    console.error(`Site sonucu kabul etmedi: HTTP ${y.status} ${(await y.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const sonuc = (await y.json().catch(() => ({}))) as {
    degerlendirme?: { degerlendirilen: number; durum: string };
    birlestirme?: { birlesen: number; durum: string };
    sabah?: string;
  };
  console.log(
    `Sonuç siteye gönderildi. Claude değerlendirmesi: ${sonuc.degerlendirme?.durum ?? "?"} (${sonuc.degerlendirme?.degerlendirilen ?? 0} gelişme) · birleştirilen tekrar: ${sonuc.birlestirme?.birlesen ?? 0} · sabah özeti: ${sonuc.sabah ?? "?"}`,
  );
}

main().catch((e) => {
  console.error("Tarama başarısız:", (e as Error).message);
  process.exit(1);
});
