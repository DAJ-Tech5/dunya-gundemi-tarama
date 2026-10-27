// Elle derlenen önemli günler (Türkçe adlarıyla). Liste elle düzenlenir; otomatik işlemler değiştirmez.
//
// 1) ÜLKELER: Resmî tatil servisinin (Nager.Date) kapsamadığı ülkelerin miladi takvimde sabit milli/resmî günleri.
//    Kaynak: Vikipedi "Public holidays in …" sayfaları. Hareketli günler (Nevruz İran'da, İsrail Bağımsızlık Günü) gunler.ts'de hesaplanır;
//    dinî bayramlar ise bütün ülkeler için ortak "dinî günler" listesindedir.
// 2) ULUSLARARASI: BM'nin uluslararası günlerinden dış ilişkiler açısından öne çıkanlar (https://www.un.org/en/observances/list-days-weeks).

export type SabitGun = { ay_gun: string; ad: string; tur: "ulusal" | "resmi" };

export const SABIT_ULKE_GUNLERI: Record<string, { kaynak: string; gunler: SabitGun[] }> = {
  AZE: {
    kaynak: "https://en.wikipedia.org/wiki/Public_holidays_in_Azerbaijan",
    gunler: [
      { ay_gun: "01-01", ad: "Yılbaşı", tur: "resmi" },
      { ay_gun: "01-20", ad: "20 Ocak Şehitleri Anma Günü", tur: "ulusal" },
      { ay_gun: "03-08", ad: "Dünya Kadınlar Günü", tur: "resmi" },
      { ay_gun: "03-21", ad: "Nevruz Bayramı", tur: "resmi" },
      { ay_gun: "05-09", ad: "Faşizme Karşı Zafer Günü", tur: "resmi" },
      { ay_gun: "05-28", ad: "Bağımsızlık Günü", tur: "ulusal" },
      { ay_gun: "06-15", ad: "Ulusal Kurtuluş Günü", tur: "ulusal" },
      { ay_gun: "06-26", ad: "Silahlı Kuvvetler Günü", tur: "ulusal" },
      { ay_gun: "09-27", ad: "Anma Günü", tur: "ulusal" },
      { ay_gun: "11-08", ad: "Zafer Günü", tur: "ulusal" },
      { ay_gun: "11-09", ad: "Ulusal Bayrak Günü", tur: "ulusal" },
      { ay_gun: "12-31", ad: "Dünya Azerbaycanlıları Dayanışma Günü", tur: "ulusal" },
    ],
  },
  IND: {
    kaynak: "https://en.wikipedia.org/wiki/Public_holidays_in_India",
    gunler: [
      { ay_gun: "01-26", ad: "Cumhuriyet Günü", tur: "ulusal" },
      { ay_gun: "08-15", ad: "Bağımsızlık Günü", tur: "ulusal" },
      { ay_gun: "10-02", ad: "Mahatma Gandi'nin Doğum Günü", tur: "ulusal" },
    ],
  },
  KGZ: {
    kaynak: "https://en.wikipedia.org/wiki/Public_holidays_in_Kyrgyzstan",
    gunler: [
      { ay_gun: "01-01", ad: "Yılbaşı", tur: "resmi" },
      { ay_gun: "01-07", ad: "Ortodoks Noeli", tur: "resmi" },
      { ay_gun: "02-23", ad: "Anavatan Savunucuları Günü", tur: "resmi" },
      { ay_gun: "03-08", ad: "Dünya Kadınlar Günü", tur: "resmi" },
      { ay_gun: "03-21", ad: "Nevruz Bayramı", tur: "resmi" },
      { ay_gun: "04-07", ad: "Halk Nisan Devrimi Günü", tur: "ulusal" },
      { ay_gun: "05-01", ad: "Emek ve Dayanışma Günü", tur: "resmi" },
      { ay_gun: "05-05", ad: "Anayasa Günü", tur: "ulusal" },
      { ay_gun: "05-09", ad: "Zafer Günü", tur: "resmi" },
      { ay_gun: "08-31", ad: "Bağımsızlık Günü", tur: "ulusal" },
      { ay_gun: "11-07", ad: "Tarih ve Ataları Anma Günü", tur: "ulusal" },
    ],
  },
  UZB: {
    kaynak: "https://en.wikipedia.org/wiki/Public_holidays_in_Uzbekistan",
    gunler: [
      { ay_gun: "01-01", ad: "Yılbaşı", tur: "resmi" },
      { ay_gun: "01-14", ad: "Vatan Savunucuları Günü", tur: "resmi" },
      { ay_gun: "03-08", ad: "Dünya Kadınlar Günü", tur: "resmi" },
      { ay_gun: "03-21", ad: "Nevruz Bayramı", tur: "resmi" },
      { ay_gun: "05-09", ad: "Anma ve Saygı Günü", tur: "resmi" },
      { ay_gun: "09-01", ad: "Bağımsızlık Günü", tur: "ulusal" },
      { ay_gun: "10-01", ad: "Öğretmenler Günü", tur: "resmi" },
      { ay_gun: "12-08", ad: "Anayasa Günü", tur: "ulusal" },
    ],
  },
  TKM: {
    kaynak: "https://en.wikipedia.org/wiki/Public_holidays_in_Turkmenistan",
    gunler: [
      { ay_gun: "01-01", ad: "Yılbaşı", tur: "resmi" },
      { ay_gun: "03-08", ad: "Dünya Kadınlar Günü", tur: "resmi" },
      { ay_gun: "03-21", ad: "Nevruz Bayramı", tur: "resmi" },
      { ay_gun: "05-18", ad: "Yeniden Doğuş, Birlik ve Mahtumkulu Firaki Şiir Günü", tur: "ulusal" },
      { ay_gun: "09-27", ad: "Bağımsızlık Günü", tur: "ulusal" },
      { ay_gun: "10-06", ad: "Anma Günü", tur: "ulusal" },
      { ay_gun: "12-12", ad: "Uluslararası Tarafsızlık Günü", tur: "ulusal" },
    ],
  },
  SAU: {
    kaynak: "https://en.wikipedia.org/wiki/Public_holidays_in_Saudi_Arabia",
    gunler: [
      { ay_gun: "02-22", ad: "Kuruluş Günü", tur: "ulusal" },
      { ay_gun: "09-23", ad: "Ulusal Gün", tur: "ulusal" },
    ],
  },
};

export const ULUSLARARASI_GUNLER: { ay_gun: string; ad: string }[] = [
  { ay_gun: "01-27", ad: "Uluslararası Holokost Kurbanlarını Anma Günü" },
  { ay_gun: "02-21", ad: "Uluslararası Anadil Günü" },
  { ay_gun: "03-08", ad: "Dünya Kadınlar Günü" },
  { ay_gun: "03-21", ad: "Uluslararası Nevruz Günü" },
  { ay_gun: "03-22", ad: "Dünya Su Günü" },
  { ay_gun: "04-07", ad: "Dünya Sağlık Günü" },
  { ay_gun: "04-22", ad: "Dünya Günü" },
  { ay_gun: "05-03", ad: "Dünya Basın Özgürlüğü Günü" },
  { ay_gun: "05-09", ad: "Avrupa Günü" },
  { ay_gun: "05-21", ad: "Diyalog ve Kalkınma için Dünya Kültürel Çeşitlilik Günü" },
  { ay_gun: "06-05", ad: "Dünya Çevre Günü" },
  { ay_gun: "06-20", ad: "Dünya Mülteciler Günü" },
  { ay_gun: "06-23", ad: "Birleşmiş Milletler Kamu Hizmeti Günü" },
  { ay_gun: "07-11", ad: "Dünya Nüfus Günü" },
  { ay_gun: "08-12", ad: "Uluslararası Gençlik Günü" },
  { ay_gun: "08-19", ad: "Dünya İnsani Yardım Günü" },
  { ay_gun: "09-21", ad: "Uluslararası Barış Günü" },
  { ay_gun: "09-27", ad: "Dünya Turizm Günü" },
  { ay_gun: "10-01", ad: "Uluslararası Yaşlılar Günü" },
  { ay_gun: "10-16", ad: "Dünya Gıda Günü" },
  { ay_gun: "10-24", ad: "Birleşmiş Milletler Günü" },
  { ay_gun: "10-31", ad: "Dünya Şehirler Günü" },
  { ay_gun: "11-16", ad: "Uluslararası Hoşgörü Günü" },
  { ay_gun: "12-03", ad: "Uluslararası Engelliler Günü" },
  { ay_gun: "12-09", ad: "Uluslararası Yolsuzlukla Mücadele Günü" },
  { ay_gun: "12-10", ad: "İnsan Hakları Günü" },
  { ay_gun: "12-18", ad: "Uluslararası Göçmenler Günü" },
];
