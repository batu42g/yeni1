📌 FEATURE SPEC: Activity Timeline + Audit UI (Enterprise Grade)
🎯 Amaç

Sisteme aşağıdaki iki katmanı ekle:

Activity Timeline (ürün içi “ne oldu?” akışı)

Audit Log (kurumsal denetim: kim, ne zaman, ne yaptı?)

Bu iki katman farklıdır:

Activity Timeline: Kullanıcı deneyimi + operasyonel takip (soft, okunabilir, özet)

Audit Log: Güvenlik + izlenebilirlik + hukuki delil (immutability, detay, değiştirilemez)

Her ikisi de multi-tenant uyumlu, RLS güvenli, performanslı olmalı.

0) Sistem Varsayımları (Mevcut)

Tenant izolasyonu members tablosu ile yapılır.

Active company context user_settings.active_company_id üzerinden yönetilir.

Company lifecycle (active/archived/deleted) vardır.

User lifecycle (active/inactive/deleted) vardır.

Invitation lifecycle (pending/accepted/expired/revoked/rejected) vardır.

1) Veri Modeli
1.1 audit_logs (Immutable)

Amaç: Denetim kaydı; kesinlikle silinmez, update edilmez. Yalnız insert.

Alanlar:

audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  actor_user_id uuid null references auth.users(id), -- silinmiş kullanıcı için null olabilir
  actor_membership_id uuid null, -- opsiyonel (members id)
  actor_role text null,          -- olay anındaki rol snapshot
  action text not null,          -- enum benzeri action code
  target_type text not null,     -- 'member' | 'invitation' | 'company' | 'project' | ...
  target_id uuid null,           -- hedef entity id
  ip inet null,
  user_agent text null,
  request_id uuid null,          -- correlation id
  metadata jsonb not null default '{}'::jsonb, -- diff, payload snapshot, vb.
  created_at timestamp not null default now()
);

Index:

(company_id, created_at desc)

(company_id, action, created_at desc)

(company_id, target_type, target_id)

(request_id) (debug için)

(actor_user_id, created_at desc) (opsiyonel)

Immutability

UPDATE/DELETE kapat (RLS + DB trigger ile).

Sadece INSERT.

1.2 activity_events (User-friendly feed)

Amaç: UI timeline için, daha okunabilir ve sınırlı içerik.

activity_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  actor_user_id uuid null,
  event_type text not null,        -- enum benzeri event code
  title text not null,             -- kısa başlık
  summary text null,               -- 1-2 cümle açıklama
  entity_type text null,           -- 'project' | 'invoice' | 'member' | ...
  entity_id uuid null,
  severity text not null default 'info', -- info|warning|critical
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

Index:

(company_id, created_at desc)

(company_id, event_type, created_at desc)

(company_id, entity_type, entity_id)

1.3 Action/Event Kodları (Enum standardı)

DB’de gerçek enum kullanmak opsiyonel; minimumda “kayıt standardı” olacak.

Audit action örnekleri:

INVITE_CREATED

INVITE_ACCEPTED

INVITE_REVOKED

MEMBER_ROLE_UPDATED

MEMBER_REMOVED

COMPANY_ARCHIVED

USER_DEACTIVATED

USER_CONTEXT_SWITCHED

BILLING_PLAN_CHANGED (ileride)

EXPORT_DOWNLOADED

LOGIN_SUCCESS (opsiyonel)

Activity event örnekleri:

TEAM_MEMBER_JOINED

TEAM_MEMBER_REMOVED

INVITATION_SENT

COMPANY_SETTINGS_UPDATED

INVOICE_CREATED

PROJECT_CREATED

TASK_COMPLETED

2) Logging Mimari Kuralları
2.1 Hangi işlemler Audit Log’a gider?

Her zaman audit:

Yetki/rol değişimi

Üye çıkarma

Davet oluşturma/iptal/kabul

Şirket silme/archiving

Login / session revoke (opsiyonel)

Export işlemleri (data exfiltration risk)

Subscription değişimleri (ileride)

2.2 Hangi işlemler Activity’ye gider?

Kullanıcının “günlük” takip etmek isteyeceği şeyler

Operasyonel olaylar

UI’da timeline akışı

2.3 Correlation (request_id)

Her API isteği bir request_id üretir:

audit_logs.request_id

activity_events.metadata.request_id

Amaç:

Bir işlem zincirinde hangi audit’ler üretildiğini takip.

3) Yazma Katmanı (Server-side only)
3.1 Tek giriş noktası: logEvent()

Uygulamada tek bir “logger module” olacak:

logAudit({ companyId, actorUserId, action, target, metadata, requestInfo })

logActivity({ companyId, actorUserId, eventType, title, summary, entity, metadata })

Kural: Client log yazamaz. Sadece server actions / API routes.

3.2 Idempotency

Bazı event’ler tekrarlanabilir (retry).
request_id + action + target_id kombinasyonu ile duplicate önleme opsiyonel.

4) RLS / Güvenlik
4.1 audit_logs SELECT

Kullanıcı sadece aktif member olduğu company’nin audit’ini görür.

Audit UI erişimi role-based:

owner/admin: full audit

staff: ya hiç görmez ya da sınırlı görür (konfigürasyon)

4.2 audit_logs INSERT

Sadece server-side role / service role.

Eğer client insert gerekiyorsa (önerilmez) çok sıkı policy gerekir.

4.3 activity_events SELECT

Company member olan herkes görebilir (opsiyonel)

PII içerikleri activity’de minimal.

4.4 Immutability Enforcement

audit_logs UPDATE/DELETE tamamen yasak

activity_events için UPDATE/DELETE genellikle yasak, ancak opsiyonel retention politikalarıyla “cleanup job” uygulanabilir.

5) Retention & Privacy (Kurumsal standart)
5.1 Audit retention

Varsayılan: 365 gün (konfigüre edilebilir)

Silme: gerçekten gerekiyorsa “legal delete policy” ile

5.2 Activity retention

Varsayılan: 90 gün

UI hızlı kalır.

5.3 PII

Audit metadata’da zorunlu olmadıkça kişisel veri tutulmaz.

Email gibi alanlar gerekiyorsa maskelenir veya hashlenir.

6) UI Tasarımı (App)
6.1 Activity Timeline UI

Route:

/app/activity veya /dashboard/activity

Görüntü:

Zaman çizelgesi (infinite scroll)

Filtreler:

event_type

entity_type

date range

severity

Kart içeriği:

Actor (isim + rol)

Title

Summary

Timestamp

Entity link (varsa ilgili sayfaya gider)

6.2 Audit UI

Route:

/app/admin/audit (admin-only)

Tablo görünümü:

created_at

actor

action

target_type/target_id

ip (opsiyonel)

request_id (expand)

metadata (expand drawer)

Filtreler:

action

actor

target_type

date range

search (request_id, target_id)

Export:

admin için CSV export (audit export da audit’e loglanır: EXPORT_DOWNLOADED)

7) Entegrasyon Noktaları (Mevcut modüllerle)
7.1 Invitation

Invite oluşturulunca:

audit: INVITE_CREATED

activity: INVITATION_SENT

Invite kabul edilince:

audit: INVITE_ACCEPTED

activity: TEAM_MEMBER_JOINED

Invite revoke:

audit: INVITE_REVOKED

activity: INVITATION_REVOKED

7.2 Membership

Role change:

audit: MEMBER_ROLE_UPDATED

activity: TEAM_MEMBER_ROLE_CHANGED

Remove member:

audit: MEMBER_REMOVED

activity: TEAM_MEMBER_REMOVED

7.3 Active company switch

audit: USER_CONTEXT_SWITCHED

activity: isteğe bağlı (genelde audit yeterli)

7.4 Deletion / Company archive

audit: COMPANY_ARCHIVED, USER_DEACTIVATED, USER_DELETED

activity: daha yumuşak özet event’leri

8) API Endpoints
8.1 Activity feed

GET /api/activity?cursor=...&filters=...

Return:

events[]

nextCursor

Cursor-based pagination zorunlu (created_at + id).

8.2 Audit feed (admin)

GET /api/audit?cursor=...&filters=...

Return:

logs[]

nextCursor

8.3 Export

POST /api/audit/export

CSV üret

Export event’i audit’e yaz (self-auditing)

9) Performans & Stabilite

Tüm listeler cursor pagination

Query’ler company_id index’i kullanmalı

metadata JSONB büyük olabilir: UI’da expand dışında yükleme opsiyonel

created_at desc index zorunlu

“date range + action” filtreleri için composite index opsiyonel

10) Test Planı (Zorunlu)
10.1 Unit/Integration

Invite created → audit+activity yazıldı mı

Invite accepted → membership + audit + activity

Role change → audit+activity

Remove member → audit+activity

Company archived → audit yazıldı mı

Staff audit sayfasına erişemez (403)

Admin sadece kendi company auditini görür (tenant isolation)

10.2 Abuse / Security

Client insert attempt → RLS block

Cross-company audit read attempt → block

audit update/delete attempt → block

11) Acceptance Criteria

Admin audit UI’dan tüm kritik olayları görür

Activity timeline kullanıcıya okunabilir “ne oldu?” akışı verir

Tenant isolation kırılmaz

audit_logs immutable (update/delete yok)

Filtreler ve pagination üretim verisinde performanslı

Export işlemi audit’e kaydolur

Davet + üyelik + silme + company archive olayları eksiksiz loglanır

12) Çıktılar (Deliverables)

DB migrations:

audit_logs

activity_events

indexler

RLS policies

immutability trigger (audit_logs)

Server logger module

API routes:

/api/activity

/api/audit

/api/audit/export

UI pages:

Activity timeline page

Admin audit page + filters + detail drawer

Test suite ve seed olay üretimi (opsiyonel)

Bu spesifikasyon uygulanınca sistemde kurumsal güven hissi oluşacak:
Kim ne yaptı, ne zaman yaptı, ne değişti görünür olacak ve denetlenebilirlik sağlanacaktır.