🧱 1️⃣ INVITE CANCELLATION (Davet İptali)
🎯 Amaç

Admin gönderdiği daveti iptal edebilmeli.

Gereksinimler
DB Güncellemesi

invitations tablosuna:

status:

'pending'

'accepted'

'expired'

'revoked'

Endpoint
POST /api/invitations/:id/revoke

Backend Logic

Sadece company admin veya owner iptal edebilir.

Sadece status = pending olan davet iptal edilebilir.

status → revoked yapılır.

revoked_at timestamp eklenir.

revoke_reason optional alan eklenebilir.

Sonuç

Token artık geçersiz olur.

Linke girilirse → "Invitation revoked" ekranı gösterilir.

🧱 2️⃣ ROLE UPDATE AFTER ACCEPTANCE
🎯 Amaç

Admin kullanıcı rolünü değiştirebilmeli.

Endpoint
PATCH /api/company-members/:membership_id


Body:

{
  role: 'admin' | 'staff'
}

Backend Kurallar

Admin kendi rolünü düşüremez.

Owner rolü özel korunmalı.

Rol değişimi audit log'a yazılmalı.

Ekstra

membership tablosuna:

updated_at

updated_by

🧱 3️⃣ TOKEN SHARING PROTECTION
Problem

Invite link başka biriyle paylaşılırsa ne olur?

Çözüm
Email Binding Enforcement

Invitation kabul edilirken:

Giriş yapan email,

Invitation email ile eşleşmeli.

Eşleşmezse:

❌ "This invitation is not assigned to your email."

Ek Güvenlik (Opsiyonel)

Token + Email birlikte hash kontrolü

IP logging

Device fingerprint (opsiyonel)

🧱 4️⃣ EMAIL VERIFICATION ENFORCEMENT
🎯 Amaç

Email doğrulanmadan membership aktif olmasın.

Gereksinim

Supabase email verification açık olmalı.

Invitation accept flow:

User register

Email verify

Sonra membership activate

Membership tablosuna:

status: 'pending_verification' | 'active'

Email doğrulanmadan:

Company data erişimi olamaz.

🧱 5️⃣ BULK INVITE SYSTEM
🎯 Amaç

Admin tek seferde çoklu kullanıcı davet edebilmeli.

Endpoint
POST /api/invitations/bulk


Body:

{
  invites: [
    { email: "...", role: "staff" },
    { email: "...", role: "admin" }
  ]
}

Backend

Her email için ayrı token üret.

Transaction içinde insert yap.

Duplicate kontrolü:

Aynı email zaten member mı?

Pending invite var mı?

Response

Başarılı / başarısız liste döndür.

🧱 6️⃣ INVITE PREVIEW PAGE
🎯 Amaç

Kullanıcı daveti kabul etmeden önce şirket bilgisi görmeli.

Route:

/invite?token=...


Backend doğrulama sonrası frontend'e:

company_name

company_logo

invited_role

invited_by (name)

UI:

"You have been invited to join ACME Corp as Admin"

Kullanıcı:

Accept

Reject

🧱 7️⃣ INVITATION REJECTION
🎯 Amaç

Kullanıcı daveti reddedebilmeli.

Endpoint
POST /api/invitations/:id/reject

DB

status → rejected
rejected_at
rejected_reason (optional)

Admin panelde:

Rejected invites listelenir.

🧱 8️⃣ WEBHOOK EVENTS (SaaS Level)
🎯 Amaç

Sistem event-driven çalışmalı.

Event Türleri

INVITE_CREATED

INVITE_REVOKED

INVITE_ACCEPTED

INVITE_REJECTED

MEMBER_ROLE_UPDATED

DB

webhooks tablosu:

id

company_id

event_type

payload

sent

created_at

Endpoint
POST /api/webhooks/dispatch


Her event oluştuğunda:

JSON payload oluştur

Kayıtlı webhook URL'lere POST at

🧱 9️⃣ INVITE RESEND SYSTEM
🎯 Amaç

Admin daveti tekrar gönderebilmeli.

Endpoint:

POST /api/invitations/:id/resend

Backend

Yeni token üret

expires_at güncelle

token_hash güncelle

Email tekrar gönder

🧱 🔟 INVITATION MANAGEMENT DASHBOARD

Admin panelde:

Filtreler:

Pending

Accepted

Expired

Revoked

Rejected

Gösterilecek alanlar:

Email

Role

Status

Created at

Expires at

Action buttons

🧱 1️⃣1️⃣ AUDIT LOG SYSTEM

audit_logs tablosu:

id

company_id

actor_user_id

action

target_type (invitation / membership)

target_id

metadata JSON

created_at

Her önemli işlem loglanmalı.

🧱 1️⃣2️⃣ RATE LIMIT & ABUSE PROTECTION

Invite endpoint rate limited olmalı.

Aynı IP’den aşırı davet engellenmeli.

Domain blacklist eklenebilir.

🧱 1️⃣3️⃣ SEAT LIMIT INTEGRATION (Monetization Hazırlığı)

company tablosuna:

seat_limit

current_active_members

Invite accept edilirken:

if current_active_members >= seat_limit:
→ Accept engellenir.

Bu sistem ileride ücretlendirmeye bağlanabilir.

🏗️ PRODUCTION CHECKLIST

Token hashing var

Expiry kontrol var

Role escalation engellendi

Email binding var

Status enum genişletildi

Audit log var

Webhook var

Seat limiti var

Multi-company support var

RLS policy doğru