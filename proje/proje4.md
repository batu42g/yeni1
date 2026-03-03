FEATURE SPEC: Enterprise-Grade Onboarding System
🎯 Amaç

Bu onboarding sistemi:

İlk kez giriş yapan kullanıcıyı doğru akışa yönlendirmeli

Multi-company modelle çakışmamalı

Davet kabul senaryolarını desteklemeli

Şirketi olmayan kullanıcıyı doğru state’e almalı

Admin ve staff için farklı onboarding gösterebilmeli

Lifecycle ve deletion mimarisiyle uyumlu olmalı

Idempotent çalışmalı (yarıda kalırsa devam edebilmeli)

Bu sistem UI özelliği değil, sistem state yönetimidir.

1️⃣ Sistem Gereksinimleri

Onboarding, şu durumlarda tetiklenir:

Kullanıcı ilk kez login oldu.

Kullanıcının active_company_id null.

Kullanıcının üyelik var ama şirket archived.

Davet kabul edildi ama profil eksik.

Şirket sahibi ilk şirketini kurdu.

2️⃣ Veri Modeli
2.1 user_onboarding Tablosu (YENİ)
user_onboarding
---------------
user_id uuid primary key references auth.users(id)
is_completed boolean default false
current_step text
started_at timestamp default now()
completed_at timestamp null
metadata jsonb null
updated_at timestamp default now()

Index:

is_completed

current_step

Bu tablo onboarding state’i kontrol eder.

2.2 Step Enum (State Machine)
INIT
PROFILE_COMPLETION
COMPANY_SELECTION
COMPANY_CREATION
INVITE_ACCEPT
TEAM_SETUP
BILLING_SETUP
FINISHED
3️⃣ Onboarding State Machine

Onboarding her login’de şu sırayla kontrol edilir:

3.1 Kullanıcı soft-deleted mi?

→ login engelle

3.2 Active membership var mı?

Eğer members.status='active' yoksa:
→ COMPANY_SELECTION veya COMPANY_CREATION

3.3 user_settings.active_company_id valid mi?

Değilse fallback + COMPANY_SELECTION

3.4 Profile eksik mi?

name, surname, avatar vs
→ PROFILE_COMPLETION

3.5 Admin mi?

Eğer admin ve team boşsa:
→ TEAM_SETUP

3.6 Billing zorunlu mu?

seat_limit > 0 ve plan gerektiriyorsa:
→ BILLING_SETUP

3.7 Hepsi tamamsa:

→ FINISHED

4️⃣ Onboarding API Tasarımı
4.1 Bootstrap Endpoint
GET /api/onboarding/bootstrap

Return:

{
  is_completed: boolean,
  current_step: string,
  required_actions: [],
  active_company_id: uuid | null
}

Bu endpoint UI routing’i belirler.

4.2 Step Update Endpoint
POST /api/onboarding/complete-step

Body:

{
  step: string
}

Server:

Step valid mi?

Önceki adımlar tamam mı?

DB update

Audit log

5️⃣ UI Routing Kuralları

App Layout içinde:

if (!onboarding.is_completed) {
  redirect(`/onboarding/${current_step}`)
}

Ama:

API route’lar onboarding’den etkilenmemeli

Admin-only sayfalar onboarding sırasında kilitlenebilir

6️⃣ Multi-Company Entegrasyonu
Scenario A: Davet ile gelen kullanıcı

İlk login

membership var

active_company_id set

PROFILE_COMPLETION göster

Scenario B: Şirketi olmayan kullanıcı

active_company_id null

members boş

COMPANY_CREATION göster

Scenario C: Archived company

active_company invalid

fallback yok

COMPANY_SELECTION göster

7️⃣ Team Setup (Admin Flow)

Eğer:

role = owner/admin

team member sayısı = 1

onboarding:

→ TEAM_SETUP step

Burada:

Invite link oluştur

Bulk invite

Atla butonu opsiyonel

8️⃣ Billing Setup (Opsiyonel ama hazır olmalı)

Eğer:

company.plan != free

subscription yok

→ BILLING_SETUP

9️⃣ Güvenlik Kuralları

Onboarding bypass edilemez (server kontrol)

Step manipulation engellenmeli

current_step client’tan belirlenmemeli

API idempotent olmalı

company archived ise onboarding durumu resetlenmeli

🔟 Event Entegrasyonu

Onboarding event’leri:

USER_ONBOARDING_STARTED

USER_PROFILE_COMPLETED

COMPANY_CREATED

TEAM_MEMBER_INVITED

BILLING_SETUP_COMPLETED

USER_ONBOARDING_COMPLETED

Audit log yazılmalı.

11️⃣ Silme Mimarisi Uyumu

User soft delete → onboarding resetlenmez

Company archived → onboarding incomplete sayılır

Membership removed → onboarding fallback tetiklenir

12️⃣ Edge Case Listesi

Kullanıcı 2 sekmede onboarding tamamlarsa

Davet kabul edilmeden onboarding başlarsa

Company silinirse onboarding ortasında

user_settings active_company invalid

Seat limit dolu

Invite expired

Hepsi test edilmeli.

13️⃣ Performans

Bootstrap tek query ile user + members + company + onboarding döndürmeli

Gereksiz N+1 olmamalı

current_step compute server-side olmalı

14️⃣ Kabul Kriterleri

İlk login doğru step’e yönlendirir

Admin team setup görür

Staff profile completion görür

Şirketi olmayan kullanıcı company creation görür

Archived company fallback çalışır

Onboarding tamamlanmadan dashboard’a erişim yok

API route’lar etkilenmez

Deletion mimarisiyle çakışmaz

Multi-company senaryosu bozulmaz

15️⃣ Final Mentalite

Bu onboarding:

Basit wizard değil

State-driven sistemdir

Multi-tenant aware

Role-aware

Lifecycle-aware

Idempotent

Production-grade

Bu spesifikasyonu uygulayarak onboarding sistemi mevcut SaaS altyapısına entegre edilecektir.
Kod minimal değil, doğru ve geniş kapsamlı olacaktır.