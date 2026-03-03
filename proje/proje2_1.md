🗑️⚙️ Performance + UX Pass v4 — Çöp Kutusu (Trash) & Ayarlar (Settings)
🎯 Hedef

Sekmeye tıklayınca gecikme hissini azalt

Liste/payload ve rerender maliyetini düşür

Soft-delete / restore / hard-delete akışlarını güvenli ve audit’li hale getirmek

Ayarlarda meta fetch’i lazy yapmak ve “aktif company context” ile tutarlı çalışmak

Kapsam:

Trash (Çöp Kutusu) sayfası: src/app/(dashboard)/trash/page.tsx (ve ilgili API routes)

Settings (Ayarlar) sayfası: src/app/(dashboard)/settings/page.tsx (ve ilgili API routes)

Not: Dosya path’leri projeye göre farklıysa aynı isimli route/sayfaları bul ve uygula.

0) Global Kurallar

Skeleton sadece ilk load. Sonraki işlemler “refreshing” ve buton loading.

select('*') yok. UI alanları kadar select.

Liste sayfaları: server-side pagination zorunlu.

Heavy modallar (domain, logo upload, danger actions) lazy load.

Her destructive işlem audit’e yazılacak (RESTORE, HARD_DELETE, SETTINGS_CHANGED).

1) 🗑️ Trash (Çöp Kutusu)
1.1 Ürün Mantığı (Sistem Kuralı)

Trash sadece soft-deleted entity’leri gösterir.
Hard delete:

sadece admin/owner

sadece retention veya explicit “kalıcı sil” aksiyonu ile

Gösterilecek entity tipleri (örnek):

projects

customers

offers

invoices

tasks

members (membership removed) → opsiyonel, ayrı sekme

1.2 DB / Query Standardı

Her entity’de ortak soft delete alanları:

deleted_at

deleted_by

delete_reason (opsiyonel)

status varsa “archived/deleted” ile uyumlu

Trash listesi sorgusu:

deleted_at IS NOT NULL

company_id = active_company_id (tenant isolation)

1.3 API Tasarımı
A) Liste endpoint

GET /api/trash?type=project&limit=50&cursor=...&q=...

Döndürülen alanlar (minimum):

id, title/name, deleted_at, deleted_by, entity_type

deleted_by_name (UI için, join)

B) Restore endpoint

POST /api/trash/restore
Body:

type

id

Server-side:

permission check (admin/owner)

restore: deleted_at = null, deleted_by = null

restore sonrası audit:

action: ENTITY_RESTORED

context: type, id, title

C) Hard delete endpoint (danger zone)

DELETE /api/trash/hard-delete?type=project&id=...
Kurallar:

owner-only

2FA re-auth (varsa)

irreversible confirmation token (UI → server)

hard delete sonrası audit:

action: ENTITY_HARD_DELETED

context: type, id

1.4 UI Performans
A) Pagination

İlk yük: 50

“Daha fazla yükle” ile cursor

Büyük dataset’te client-side filter yok

B) Search

q = title/name üzerinde server-side ilike

debounce 300ms

C) State patch

Restore tıklanınca listeden remove (tam refetch yerine)

Hard delete tıklanınca listeden remove
Fallback: 1–2 işlemde bir background refetch

D) Render

TrashItemRow React.memo

derived lists useMemo

1.5 UX ve Güvenlik

Restore için “Undo” toast (opsiyonel)

Hard delete için:

typed confirmation (“DELETE”)

entity name göster

Staff kullanıcılar Trash’i göremez (opsiyonel: sadece kendi sildiğini görebilir ama önerilmez)

Acceptance

Trash sayfası hızlı açılıyor

Restore/hard delete sonrası sayfa skeleton’a düşmüyor

Tüm işlemler audit’e düşüyor

2) ⚙️ Settings (Ayarlar)
2.1 Sayfa Bölümleri

Settings sayfasını 3 sekme yap (performans + netlik):

Company Settings (logo/name/seat limit görünümü)

User Settings (profil, bildirim)

Danger Zone (company archive/delete, üyelikten ayrıl, account deactivate)

2.2 Data Fetching Standardı

Initial load: sadece “görünen sekmenin” datası

Diğer sekmeler lazy fetch (sekme açılınca)

Modallar (logo upload, custom domain, smtp settings) açılınca fetch

2.3 API ve Payload
A) Company settings fetch

GET /api/settings/company
Return minimal:

name, logo_url, seat_limit, status

B) Company update

PATCH /api/settings/company
Body:

allowlist: name, logo_url (seat_limit server-controlled)

Audit:

action: COMPANY_SETTINGS_UPDATED

changes[] üret

C) User settings

GET /api/settings/user
Return:

full_name, avatar_url, email_masked

Update:
PATCH /api/settings/user
Audit:

action: USER_SETTINGS_UPDATED

2.4 Rerender / Store

Active company context store’dan sadece gereken alanlarla alınacak (selector)

Settings form state local state’te tutulacak

Save sonrası sadece ilgili section refresh

2.5 Danger Zone

Bu bölüm heavy ve güvenlik kritik → lazy.
İşlemler:

Company archive/delete

Membership remove

Account deactivate

Kurallar:

2FA / re-auth gate (varsa)

typed confirmation

audit log zorunlu:

COMPANY_ARCHIVED

MEMBERSHIP_REMOVED

USER_DEACTIVATED

Acceptance

Settings sekmesi hızlı açılıyor

Update sonrası audit doğru yazılıyor (changes[])

Danger zone işlemleri güvenli ve audit’li

3) Audit Entegrasyonu (İki sayfa için ortak)

Trash restore/hard delete → audit

Settings update → audit changes[]

Eğer export varsa → audit

UI’da:

“Hesap Hareketleri / Audit” sayfasında bu event’ler okunabilir görünmeli.

4) Çıkış Kriteri

✅ Trash: pagination + search + restore/hard delete + audit
✅ Settings: tabbed lazy load + minimal payload + changes[] audit
✅ Skeleton sadece ilk yük
✅ Büyük veriyle ölçeklenir