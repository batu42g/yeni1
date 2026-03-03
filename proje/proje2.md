INTEGRATION PLAN – Advanced Deletion Architecture Integration
🎯 Amaç

Mevcut:

Multi-tenant yapı

Invitation sistemi

Membership tablosu

Role sistemi

üzerine gelişmiş silme mimarisini entegre etmek.

Bu entegrasyon:

Veri bütünlüğünü korumalı

Audit zincirini bozmamalı

Davet sistemini kırmamalı

Multi-company desteğini zedelememeli

1️⃣ VERİTABANI GÜNCELLEMELERİ
1.1 Users Tablosu

Ek alanlar:

deleted_at timestamp null
deleted_by uuid null
deletion_reason text null
is_active boolean default true


Index:

is_active

deleted_at

1.2 Membership Tablosu

Mevcut statelere ekle:

active
inactive
removed
archived


Ek alanlar:

removed_at timestamp null
removed_by uuid null

1.3 Company Tablosu
deleted_at timestamp null
deleted_by uuid null
status text default 'active'


State:

active
archived
deleted

2️⃣ DAVET SİSTEMİ İLE ENTEGRASYON

Silme mimarisi davet sistemini şu şekilde etkiler:

2.1 Eğer Membership Removed ise

Kullanıcı tekrar davet edilebilir.

Eski membership restore edilmez.

Yeni membership kaydı açılır.

Invitation kabul edildiğinde:

Eğer eski membership removed ise:
→ restore yerine yeni kayıt oluştur.

2.2 Eğer User Soft Deleted ise

Davet akışı sırasında:

Eğer email sistemde var ama is_active = false ise:

Invite accept engellenmeli.

"Account deactivated" mesajı dönmeli.

Reactivation süreci başlatılmalı.

2.3 Eğer Company Archived ise

Invite accept engellenmeli.

Yeni membership oluşturulmamalı.

"Company inactive" hatası dönmeli.

3️⃣ API ENTEGRASYONU
3.1 Membership Removal
POST /memberships/{id}/remove


İşlem:

Transaction başlat.

membership.status = removed

removed_at = now

removed_by = current_user

Kullanıcının o şirkete ait active session’larını revoke et.

Event tetikle: MEMBERSHIP_REMOVED

Commit.

3.2 User Soft Delete
DELETE /users/{id}


Varsayılan davranış: soft delete.

Transaction:

user.is_active = false

user.deleted_at = now

Tüm membership → inactive

Auth token revoke

Event: USER_DEACTIVATED

Audit log yaz

3.3 User Hard Delete

Endpoint:

DELETE /users/{id}?mode=hard


Ön kontrol:

Owner mı?

Aktif subscription var mı?

Finansal kayıt var mı?

Eğer geçerse:

Transaction:

Membership delete

Invitation delete

Activity anonymize

Audit nullify user reference

User delete

Event: USER_DELETED

4️⃣ OWNER SENARYOSU ENTEGRASYONU

Silme sırasında:

if user.role == owner:


Kontroller:

Şirkette başka admin var mı?

Yoksa hata ver:
OWNERSHIP_TRANSFER_REQUIRED

Transfer endpoint:

POST /companies/{id}/transfer-ownership


Bu işlem audit zorunlu.

5️⃣ COMPANY DELETE ENTEGRASYONU
5.1 Soft Delete
DELETE /companies/{id}


Varsayılan: archive

Transaction:

company.status = archived

membership.status = archived

subscription cancel

Invite accept engelle

Event: COMPANY_ARCHIVED

5.2 Hard Delete

Ön koşullar:

subscription yok

90 gün geçmiş

İşlem:

membership delete

invitation delete

invoice anonymize

payment korunur

company delete

Event: COMPANY_DELETED

6️⃣ STATE MACHINE GÜNCELLEMESİ
User Lifecycle
active
→ inactive (soft delete)
→ deleted (hard delete)

Membership Lifecycle
pending (invite)
→ active
→ removed
→ archived

Company Lifecycle
active
→ archived
→ deleted

7️⃣ DAVET SİSTEMİNE EK KONTROLLER

Invite accept sırasında kontrol zinciri:

token valid mi?

invitation.status == pending mi?

invitation expired mı?

company.status == active mı?

user.is_active == true mı?

seat limit dolu mu?

Bu kontrollerden biri false ise:

Membership oluşturulmaz.

8️⃣ EVENT DRIVEN ENTEGRASYON

Event dispatcher şu olaylarda tetiklenmeli:

MEMBERSHIP_REMOVED

USER_DEACTIVATED

USER_DELETED

COMPANY_ARCHIVED

COMPANY_DELETED

Bu eventler:

Webhook

Cache invalidation

Email

Internal analytics

tetiklemeli.

9️⃣ MULTI-COMPANY SENARYO TEST MATRİSİ
Senaryo	Beklenen Sonuç
User 3 şirketten birinden çıkarıldı	Diğer 2 etkilenmez
User soft delete	Tüm şirketlerde inactive
User hard delete	Tüm membership silinir
Company archive	Membership archived
Company hard delete	Membership silinir
🔟 GÜVENLİK ENTEGRASYONU

Silme işlemlerinde:

Password re-entry

2FA zorunlu (owner için)

Rate limit

Idempotent endpoint

Double submit protection

11️⃣ RLS GÜNCELLEMESİ

RLS policy şunları kontrol etmeli:

user.is_active = true
membership.status = active
company.status = active


Bu üçü true değilse:

Veri erişimi engellenmeli.

12️⃣ STRATEJİK SONUÇ

Bu entegrasyon sonrası sistem:

Gerçek lifecycle yönetimine sahip olur.

Davet sistemi bozulmaz.

Multi-tenant izolasyon korunur.

Yasal risk azalır.

Monetization’a hazır olur.

Enterprise geçiş mümkün olur.

🎯 Nihai Karar

Varsayılan:

Membership → soft remove

User → soft delete

Company → soft archive

Hard delete:

Bilinçli

Loglanmış

Ön koşullu

Geri dönüşsüz

Bu noktada sistem artık:

Basit SaaS değil.
Lifecycle yönetimi olan kurumsal SaaS altyapısıdır.