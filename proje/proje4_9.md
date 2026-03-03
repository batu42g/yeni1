⚡ Performance Pass v3 — Team / Activity / Security / Compliance
🎯 Hedef

Bu 4 sayfada:

Sekmeye tıklayınca “geç açılıyor” hissini azalt

Network/payload’ı küçült

Rerender ve CPU maliyetini düşür

Büyük veriyle ölçeklenebilir hale getir

Kapsam:

Ekip Yönetimi: src/app/(dashboard)/team/page.tsx

Hesap Hareketleri: src/app/(dashboard)/activity/page.tsx + src/app/api/activity/route.ts

Güvenlik (2FA): src/app/(dashboard)/security/page.tsx

Güvenlik & Uyumluluk: src/app/(dashboard)/admin/compliance/page.tsx + src/app/api/compliance/stats/route.ts

0) Global Kurallar (Bu 4 sayfa için)

Skeleton sadece ilk load’da. Sonraki refresh’lerde “refreshing / inline spinner”.

select('*') yasak. UI’da kullanılan alanlar kadar seç.

Client-side full scan yok. Search/filter server-side; değilse memo+debounce.

Realtime varsa: full refetch yerine incremental patch.

Büyük listelerde: Row component’leri React.memo, derived listeler useMemo.

1) Ekip Yönetimi (Team) — src/app/(dashboard)/team/page.tsx
1.1 Mevcut durum (güncel zip)

fetchTeamData() içinde:

members: iyi bir select var, company filter var ✅

invitations: select('*') var ❌ (payload şişirir)

Invite / cancel / remove sonrası fetchTeamData() ile full refetch yapılıyor (çalışır ama yavaş hissettirebilir)

Loading tek state: loading → işlem sonrası da “Yükleniyor…” hissi verebilir

1.2 Yapılacaklar
A) Invitations payload küçült

invitations.select('*') yerine sadece UI’da kullanılanlar:

id, email, role, status, expires_at, created_at, accepted
Kesinlikle alma/gösterme:

token_hash

invited_by

company_id

revoked_by

audit/metadata benzeri gereksiz alanlar

B) Loading split

initialLoading (ilk sayfa açılışı)

refreshing (invite/cancel/remove sonrası)
Kural: işlem sonrası full “Yükleniyor…” ekranına düşme.

C) Incremental state patch (önerilen)

Full refetch yerine:

Invite create → invitations state’e prepend

Invite cancel → ilgili invite status=revoked (veya listeden kaldır)

Remove member → members state’ten çıkar
Fallback: her 10 işlemde 1 refetch (sync garanti)

D) Render temizliği

members.map ve invitations.map satırlarını MemberRow / InviteRow olarak ayır + React.memo.

Import cleanup: kullanılmayan icon/import varsa kaldır.

Acceptance

Team sekmesi ilk açılış hızlı.

Invite/cancel/remove sonrası sayfa “Yükleniyor…”a düşmüyor.

2) Hesap Hareketleri (Activity) — UI + API
2.1 Mevcut durum (güncel zip)

UI: src/app/(dashboard)/activity/page.tsx

Search input var ama hiçbir şeye bağlı değil ❌

formatDistanceToNow(...) her render’da çalışıyor (çok event olursa CPU) ⚠️

Pagination yok

API: src/app/api/activity/route.ts

limit paramı var ✅ (default 50)

Ama select('*') var ❌

Cursor/pagination yok ❌

Search yok ❌

2.2 Yapılacaklar
A) API payload küçült

activity_events için select('*') kaldır.
Minimum response alanları:

id, created_at, severity, title, summary, event_type, actor_user_id

actor join: actor(full_name, avatar_url) (mevcut join kalabilir)

B) Cursor pagination ekle (server-side)

Endpoint:
GET /api/activity?limit=50&cursor=<created_at_or_id>&q=<text>&severity=<>&type=<>

cursor yoksa son 50

cursor varsa created_at < cursor + order desc

limit max 100 clamp

C) Search/Filter’i gerçek yap (minimum)

q varsa title/summary üzerinde ilike

severity/type filtreleri server-side

UI:

Search input state + 300ms debounce

q/severity/type değişince fetch yenile (skeleton değil, refreshing)

D) UI render optimizasyonu

EventCard component + React.memo

Tarih formatı:

ya server’dan “relative_time” gönder

ya da client’ta useMemo ile hesapla (event id + created_at değişmiyor)

Acceptance

1000+ event olsa bile UI akıcı.

Search yazınca takılmıyor.

İlk yük 50 event; “Daha fazla yükle” ile devam.

3) Güvenlik (2FA) — src/app/(dashboard)/security/page.tsx
3.1 Mevcut durum (güncel zip)

checkMfaStatus() içinde unverified factors cleanup:

unverified.forEach(async...) var ❌ (race + gereksiz paralel istek)

startEnrollment() içinde setLoading(true) tüm sayfayı etkiliyor (UX yavaş hissedebilir) ⚠️

3.2 Yapılacaklar
A) Unverified cleanup’ı kontrollü yap

Seçeneklerden birini uygula (tercih: 1):

Sayfa açılışında cleanup yapma. “Temizle” butonuna bağla.

Otomatik cleanup yapacaksan for..of await ile sequential yap.

B) Loading state ayrımı

initialLoading (factor list)

actionLoading (enroll/verify/disable)
Kural: enroll başlatınca tüm sayfayı “Yükleniyor” ekranına düşürme; buton/spinner yeter.

C) QR code generation optimizasyonu

QRCode üretimi sadece enroll başladıktan sonra, bu iyi.
Ek iyileştirme:

“qrCodeUrl” üretimi sırasında local spinner göster (zaten var pulse), tamam.

Acceptance

Security sekmesi hızlı açılır.

Cleanup yüzünden gecikme/race yok.

Enroll/verify aksiyonları sayfayı kilitlemez.

4) Güvenlik & Uyumluluk (Compliance) — UI + API
4.1 Mevcut durum (güncel zip)

UI: src/app/(dashboard)/admin/compliance/page.tsx

İyi: KPI kartları + retention run ✅

Problem: “Otomatik job her gün 03:30 UTC” metni hardcoded görünüyor (retentionResult yokken) ⚠️
API: src/app/api/compliance/stats/route.ts

Company scoped metrikler company_id ile filtreli ✅

LOGIN_FAILED metrikleri members üzerinden .in(actor_user_id, memberIds) ile scoped ✅

activityRetention metni cron aktifliğine göre Otomatik/Manuel ✅

4.2 Yapılacaklar
A) UI metnini tamamen stats’a bağla

UI’da “03:30 UTC’de çalışır” gibi sabit cümleyi kaldır.
Onun yerine stats’tan gelen:

activityRetention (Otomatik/Manuel)

(varsa) lastRetentionRunAt

(varsa) cronActive
gibi alanlara göre dinamik göster.

B) Stats endpoint performans güvenliği

memberIds büyümesi için:

şimdilik kabul (normal seviye) ama limit uygula:

memberIds çok büyükse (örn > 2000) metrik için RPC/join fallback planı (flag bırak)

Bu sayfada “normal seviye” hedeflendiği için şu anki yaklaşım korunabilir.

C) PII/Export/Immutable badge doğruluğu

Şu an API’da:

piiSanitized: true

exportSanitized: true
statik.
Minimum iyileştirme:

UI’da “Aktif” yerine “Uygulama seviyesi” gibi bir label veya

stats endpoint’e lightweight healthcheck (ör. config flag) ekle.

Acceptance

Compliance sayfası “yanlış otomatik” iddiası yapmıyor.

Metinler DB status’a bağlı.

✅ Çıkış Kriteri

Bu 4 sayfada:

İlk açılış hissedilir hız artışı

payload küçülmüş (özellikle select('*') kalkmış)

Activity gerçek pagination + search kazanmış

Security cleanup race kaldırılmış

Compliance metinleri gerçek stat’a bağlı