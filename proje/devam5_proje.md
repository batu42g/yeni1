📌 FEATURE: Multi-Tenant Invitation System (Production Grade)
🎯 Amaç

Bir şirket (company) admin’i sisteme yeni kullanıcı davet edebilmeli.

Davet edilen kişi güvenli bir link ile kayıt olmalı.

Kullanıcı doğru company ve role ile sisteme bağlanmalı.

Token tek kullanımlık ve süreli olmalı.

Güvenlik açıkları olmamalı.

1️⃣ VERİTABANI TASARIMI
invitations tablosu
id (uuid, primary key)
company_id (uuid, foreign key)
email (text, indexed)
role (text) → 'admin' | 'staff'
token_hash (text, unique, indexed)
expires_at (timestamp)
accepted (boolean, default false)
accepted_at (timestamp nullable)
created_by (uuid, fk users.id)
created_at (timestamp default now())

🔐 Neden token_hash?

Token’ı düz saklamıyoruz.

Akış:

Gerçek token üret

SHA256 ile hash’le

DB’ye hash kaydet

Email’e düz token gönder

Bu sayede DB leak olsa bile token kullanılamaz.

🔁 2️⃣ AKIŞ DETAYI
AŞAMA 1 — Admin Davet Gönderir
Endpoint:
POST /api/invitations

Body:
{
  email: string,
  role: 'admin' | 'staff'
}

Backend Logic:

Kullanıcı admin mi kontrol et.

Aynı email için aktif davet var mı kontrol et.

Random secure token üret:

32 byte crypto random

Token’ı hash’le.

expires_at = now + 48 saat

invitations tablosuna insert.

Email gönder.

📧 Email İçeriği

Link formatı:

https://domain.com/invite?token=RAW_TOKEN


NOT:
Token query param olarak gider.
Hash değil, raw token gider.

AŞAMA 2 — Invite Link Açılır

Route:

/invite?token=...


Frontend:

Token alır

Backend’e doğrulama isteği atar

Endpoint:
POST /api/invitations/validate

Logic:

Gelen token hash’lenir.

DB’de token_hash ile eşleşme aranır.

accepted = false olmalı.

expires_at > now olmalı.

Eğer geçerliyse:
→ Email + role + company_id döndürülür.

AŞAMA 3 — Kullanıcı Register Olur

Form:

Ad soyad

Şifre

Email değiştiremez.

Endpoint:
POST /api/invitations/accept

Backend Akışı:

Token doğrulanır.

Supabase auth user oluşturulur:

email

password

users tablosuna insert:

id = auth user id

company_id

role

invitation:

accepted = true

accepted_at = now

Kullanıcı otomatik login edilir.

🔐 3️⃣ GÜVENLİK KURALLARI
✅ Token tek kullanımlık

accepted = true olduktan sonra tekrar kullanılamaz.

✅ Süreli token

expires_at kontrol edilir.

✅ Email eşleşmesi zorunlu

Register edilen email davet email’i ile aynı olmalı.

✅ Rate limit

Invite endpoint abuse edilmemeli.

✅ Rol escalation engellenmeli

Client taraf role gönderemez.
Role DB’den okunur.

🏢 4️⃣ MULTI-TENANT ENTEGRASYON

Yeni kullanıcı:

users
id
company_id
role


Company isolation:

Tüm query’ler company_id ile filtrelenmeli.

RLS policy kontrol edilmeli.

🔄 5️⃣ EDGE CASELER
1. Süresi dolmuş davet

→ “Invitation expired” sayfası göster.

2. Zaten kayıtlı kullanıcı

Eğer email zaten auth’ta varsa:

Aynı company’de mi?

Başka company’de mi?

Karar:
Ya multi-company destekle
Ya reddet

3. Davet iptali

Admin:

DELETE /api/invitations/:id


accepted = false AND expired değilse iptal edilebilir.

🧠 6️⃣ GELİŞMİŞ VERSİYON (SaaS Seviyesi)
🔹 Resend Invite

expires_at güncellenir.
Yeni token üretilir.

🔹 Invite List Page

Admin görebilir:

Pending invites

Accepted invites

Expired invites

🔹 Role Change

Admin user rolünü değiştirebilir.

🚀 7️⃣ UX DETAYLARI

Invite gönderildi toast

Accept sonrası onboarding

İlk girişte:

“Profilini tamamla”

“Şirket ayarlarını gözden geçir”

🎯 8️⃣ PRODUCTION KALİTE CHECKLIST

Token hashing var mı?

Unique constraint var mı?

Expiry kontrol var mı?

RLS doğru mu?

Email doğrulama var mı?

API server-side mı?

Client role manipülasyonu engellendi mi?

💡 NEDEN BU KADAR DETAYLI?

Çünkü davet sistemi:

SaaS’in kalbidir.

Multi-tenant güvenliğini belirler.

Role sistemini etkiler.

Enterprise hissi verir.

Eğer bunu düzgün yaparsan:

Bu artık “demo CRM” değil,
gerçek SaaS altyapısı olur..

🛠️ 9️⃣ TEST SENARYOSU (EK)
Sistemi test etmek için sırasıyla:

1. Terminalde CTRL+C ile `npm run dev` komutunu durdur.
2. `npm run dev` ile yeniden başlat (veya `npm run dev --turbo` eğer turbo yüklüyse).
3. Admin hesabıyla gir, "Ekip Yönetimi"ne gel.
4. Yeni bir e-posta (sistemde olmayan) davet et.
5. "Link kopyalandı" uyarısından sonra linki kopyala.
6. Gizli sekmede (Private/Incognito) linki aç.
7. Bilgilerin doğru geldiğini gör. Formu doldurup kaydol.
8. Giriş yap.
9. Admin hesabıyla geri dönüp (normal pencere), yeni personelin listede olduğunu onayla.

Başarılar! 🚀