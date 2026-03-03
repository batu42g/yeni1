⚡ Performance Pass v2 — Teklifler / Raporlar / Güvenlik
🎯 Hedef

Sekme tıklayınca “geç açılıyor” hissini kaldırmak ve gereksiz rerender/network yükünü düşürmek.

Kapsam:

Teklifler: src/app/(dashboard)/offers/page.tsx

Raporlar: src/app/(dashboard)/reports/page.tsx

Güvenlik (2FA): src/app/(dashboard)/security/page.tsx

Güvenlik & Uyumluluk: src/app/(dashboard)/admin/compliance/page.tsx

0) Global Kurallar (Bu sayfalar için ortak)

Initial load hafif olacak. Modal/secondary data lazy.

Client-side full scan yok. Search/filter mümkünse server-side, değilse memo+debounce.

Skeleton sadece ilk yükte. Sonraki refresh’lerde “refreshing…” kullan.

Büyük bundle’lar lazy/dynamic import. (PDF export, recharts)

Store (Zustand) için selector kullan, whole-store subscribe etme.

1) Teklifler (Offers) — offers/page.tsx
1.1 Sorunlar (mevcut)

Sayfa açılışında hem teklifler hem customers çekiliyor (fetchOffers() + fetchCustomers()) → gereksiz ilk yük.

fetchOffers() her çağrıda setLoading(true) → UI sürekli skeleton’a düşüyor.

Search alanı DB’de değil, client’ta filter() ile yapılıyor (range ile çekip sonra filtreliyor) → hem yanlış count, hem gereksiz.

OfferPdfExport tablo satırlarında her render’da yüklü → bundle + render maliyeti.

1.2 Yapılacaklar
A) Customers meta lazy

fetchCustomers() çağrısını initial useEffect’ten kaldır.

Customers listesi sadece şu anlarda çekilecek:

“Yeni Teklif” modal açılınca

“Teklif Düzenle” modal açılınca

veya customer select focus olduğunda

Sonuç cache’lenip tekrar fetch edilmesin.

B) Loading davranışı

loading iki state olsun:

initialLoading (ilk açılış)

refreshing (sonraki fetch’ler: page change, status update, save/delete)

Page change / status update sonrası skeleton göstermeyin.

C) Search’ü server-side yap

Şu an query içinde “Search logic” boş, sonra client filter var.

Search varsa server-side ilkel yaklaşım:

müşteri adı araması için customers.name ilike / textSearch (Supabase imkanına göre)

amount araması için numeric parse

Eğer relational search zor ise: RPC ile çöz (offers + customer_name)

En azından: “range içinde çekip client’ta filtre” yaklaşımını kaldır.

D) OfferPdfExport performans

OfferPdfExport’u dynamic import yap (next/dynamic, ssr:false)

PDF export butonu tıklanınca component mount olsun (lazy render)

PDF export’un içinde ağır hesap varsa useMemo.

E) Stats hesapları memo

totalAmount / pendingCount / approvedCount her render’da recalculating.

useMemo(() => {...}, [offers])

Acceptance:

Offers sekmesi tıklanınca ilk tablo hızlı gelsin.

Arama yazınca UI donmasın.

Modal açılmadan customers fetch edilmesin.

2) Raporlar (Reports) — reports/page.tsx
2.1 Sorunlar (mevcut)

fetchReportsData() tüm projects ve offers verisini çekiyor:

select('id,budget,status,created_at') (limit yok)

Sonra ay ay JS tarafında filter() ile hesaplıyor

Veri büyüyünce:

Network payload büyür

CPU (filter/reduce) büyür

Recharts bundle büyük → ilk açılışı yavaşlatır

2.2 Yapılacaklar
A) DB’de aggregate

Aynı metrikleri DB/RPC ile döndür:

Yıl bazlı monthly revenue/potential:

month(created_at) group by

Project status distribution:

status group by

Offer conversion:

ay bazında total vs approved count

Kural: Rapor sayfası ham satır verisi çekmeyecek. Sadece aggregate dönecek.

B) Recharts lazy/dynamic import

Chart komponentlerini dynamic import et.

İlk ekran “summary cards” + “loading chart skeleton”.

Chart’lar viewport’a girince render edilsin.

C) Data transform memo

Gelen aggregate zaten küçük olacak ama yine de useMemo.

Acceptance:

Reports sekmesi küçük veriyle anında, büyük veriyle de stabil açılmalı.

Network’te “projects/offers full dump” görülmemeli.

3) Güvenlik (2FA) — security/page.tsx
3.1 Sorunlar (mevcut)

checkMfaStatus() içinde unverified factor cleanup için forEach(async...) var:

beklenmeyen paralel unenroll çağrıları

state race ihtimali

Loading state:

bazı durumlarda UX “yükleniyor” ekranında gereksiz kalabilir.

3.2 Yapılacaklar
A) Unverified cleanup kontrollü

Unverified factors varsa:

ya tek seferde sequential unenroll (for..of await)

ya da kullanıcı aksiyonuna bağla (“Temizle” butonu)

“hygiene” güzel ama sayfa açılışında agresif API çağrısı yapmasın.

B) QRCode üretimi

QRCode generation sadece enroll başladıktan sonra çalışıyor, bu iyi.

Ama QRCode.toDataURL pahalıysa:

enroll modal açılınca üret

progress UI göster (zaten var)

Acceptance:

Security sayfası açılışı “tek auth call” ile hızlı.

Background cleanup yüzünden gecikme yok.

4) Güvenlik & Uyumluluk (Compliance) — admin/compliance/page.tsx
4.1 Sorunlar (minör)

fetchStats() mount’ta tek fetch: iyi.

Inline retention click handler büyük; minör rerender.

“Otomatik job 03:30 UTC” metni sabit — eğer DB’den status geliyorsa UI bunu data ile göstermeli.

4.2 Yapılacaklar
A) Retention metni dynamic

/api/compliance/stats response içinde:

activityRetentionMode: 'auto' | 'manual'

lastRetentionRunAt

cronInstalled
gibi alanlar varsa UI text’leri buna göre bas.

B) Button handler stabilize

Retention click handler useCallback (minör ama temiz)

Acceptance:

Sayfa “yanlış otomatik” iddiası yapmıyor; gerçek status gösteriyor.

5) Çıkış Kriteri (Bu 4 sayfa için)

✅ İlk sekme tıklamasında hissedilir hız artışı
✅ Gereksiz meta fetch kaldırıldı (Offers customers gibi)
✅ Raporlar ham veriyi çekmiyor, sadece aggregate alıyor
✅ PDF export ve charts lazy-load
✅ Skeleton sadece ilk yükte, sonra refreshing UX
✅ Büyük listelerde client-side full scan yok