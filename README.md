# Dünya Gündemi — haber taraması

Herkese açık haber akışlarını (RSS), GDELT dünya basını dosyalarını ve ReliefWeb'i okuyan; haberleri tür ve
ülkeye göre sınıflandırıp aynı olayı anlatanları gruplayan küçük bir program. Ek paket gerektirmez (Node.js 24).

- Deneme (hiçbir yere göndermez): `npm run kuru`
- GitHub Actions'ta çalışır (`.github/workflows/tarama.yml`): 5 dakikada bir komutla başlatılır, ayrıca yarım
  saatte bir kendi zamanlamasıyla (yedek). Sonucu gizli değerlerde tanımlı adrese gönderir.
- Seçim takvimi (`tarama/secimler.ts`): Vikipedi ulusal ve yerel seçim takvimlerini günde bir kez okur
  (`.github/workflows/secimler.yml`). Deneme: `npm run secimler`
- Önemli günler (`tarama/gunler.ts`) ve tarihte bugün (`tarama/tarihte-bugun.ts`, Türkçe Vikipedi): günde bir kez.

Bu depo otomatik olarak güncellenen bir kopyadır; değişiklik önerileri kabul edilmez.
