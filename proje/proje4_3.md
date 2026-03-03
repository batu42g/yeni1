📌 FEATURE SPEC: Enterprise Audit UI 2.0 (Secure + Hardened)
🎯 Amaç

Mevcut audit ekranını “JSON dump” seviyesinden çıkarıp enterprise-grade audit panel haline getirmek:

Okunabilir audit kayıtları (diff/field change view)

Hassas veri sızıntısı olmadan (token_hash vb. asla görünmez)

Role-based erişim (admin/owner)

Cursor pagination + filtreleme + export

Immutable audit (silinemez/değiştirilemez)

Correlation/request_id ile olay zinciri görüntüleme

Güvenli DB fonksiyonları (SECURITY DEFINER hardening)

1) Tehdit Modeli (Kapatılacak Açıklar)
1.1 Hassas verinin UI’a sızması

Şu an UI’da görünen örnek:

token_hash ✅ kaldırılmalı

invited_by, company_id gibi internal ID’ler ✅ maske veya link

email ✅ gerekiyorsa maskelenebilir (opsiyonel)

user_agent, ip ✅ “admin-only” ve maskeli gösterim opsiyon

Kural: Audit UI hiçbir koşulda token/token_hash/secret göstermez.

1.2 “Ham JSON” ile XSS / injection riskleri

JSON string olarak ekrana basılmayacak

Sadece server-side sanitize edilmiş alanlar UI’a gidecek

UI’da JSON viewer varsa “safe rendering” (no HTML injection)

1.3 Audit update/delete

audit_logs UPDATE/DELETE tamamen yasak olacak (RLS + trigger)

2) Veri Modeli Güncellemeleri
2.1 audit_logs tablo standardı (mevcutsa doğrula)

Zorunlu kolonlar:

company_id

actor_user_id (nullable)

actor_role_snapshot (text)

action (code)

target_type, target_id

request_id (uuid) – opsiyonel ama önerilir

metadata (jsonb)

created_at

Index:

(company_id, created_at desc)

(company_id, action, created_at desc)

(company_id, target_type, target_id)

(request_id)

2.2 Immutability trigger

UPDATE/DELETE attempt → reject

3) Audit Yazma Standardı (Yeni Kural Seti)
3.1 Metadata allowlist yaklaşımı

Audit yazarken metadata’ya sadece allowlist alanlar konur.

Örnek: INVITE_CREATED

allowed: email, role, expires_at, status

forbidden: token, token_hash, raw ids (gereksizse), internal debug payload

3.2 Old/New diff standardı

Audit action’larında mümkünse şu yapı kullanılacak:

{
  "changes": [
    { "field": "role", "old": "staff", "new": "admin" },
    { "field": "status", "old": "pending", "new": "accepted" }
  ],
  "context": { "invite_email": "a@gmail.com" }
}

Kural: UI diff’i changes[] üzerinden üretir.
old_value/new_value full snapshot gerekiyorsa bile sanitize edilmiş olmalı.

4) Server-Side Sanitization Layer (Zorunlu)
4.1 Tek bir sanitize fonksiyonu

sanitize_audit_metadata(action, metadata):

token, token_hash, secret, api_key gibi alanları recursive siler

id alanlarını maskeler (UUID → 6dd0…fb93)

email mask opsiyon: a***@gmail.com (opsiyon, admin için açık olabilir)

sadece allowlist alanları geçirir (ideal)

Kural: UI’a giden audit payload %100 sanitize edilmiş olmalı.

4.2 UI’a “raw metadata” gönderme

API response: display alanı üretilecek

raw metadata sadece “admin debug mode”da bile gönderilmeyecek

5) Enterprise Audit UI Tasarımı
5.1 Audit Table (Admin-only)

Route:

/admin/audit

Kolonlar (minimum):

Time

Actor (name + role snapshot)

Action (human readable)

Target (type + label)

Severity

Request ID (link)

Details (expand)

5.2 Expand panel (Diff view)

Expand açılınca:

Changes table (field, old, new)

Context (email, plan, seat vs)

Optional: masked ip/user_agent

Kural: JSON dump yok. Diff + context var.

5.3 Filtreler

Zorunlu:

Date range

Action

Actor

Target type

Search (request_id/target_id/email)

5.4 Pagination

Cursor pagination (created_at + id)

Export için “date range” zorunlu

5.5 Export (CSV)

admin/owner

export action’ı audit’e yazılır: EXPORT_DOWNLOADED

export sadece sanitize edilmiş alanları içerir

6) Role-Based Access (RBAC) + RLS
6.1 Audit page erişimi

Owner/Admin: full

Staff: yok (default)

6.2 RLS policy

audit_logs SELECT:

user, company member ise görebilir ama UI route admin-only olduğu için DB de admin-only yap:

SELECT allowed if requester role in (owner, admin) for that company

audit_logs INSERT:

server only (service role veya security definer fonksiyon)

UPDATE/DELETE:

deny

7) Correlation / Request Chain UI (Enterprise detay)
7.1 request_id drilldown

Audit satırındaki request_id tıklanınca:

aynı request_id’ye bağlı tüm audit satırlarını listele

“bu işlem zinciri” görünür

8) Security Hardening (DB / Functions)
8.1 SECURITY DEFINER fonksiyonlar

Tüm security definer fonksiyonlara:

SET search_path = public; ekle

8.2 GRANT/REVOKE

Audit insert fonksiyonlarını sadece backend role’a aç

Public erişimi kapat

8.3 Rate limit

audit export endpoint rate limit

9) Acceptance Criteria (Çıkış şartları)

Audit UI’da token_hash ve benzeri hassas alanlar asla görünmez

UI’da ham JSON dump yok; diff + context var

Admin audit’e erişir, staff erişemez

Filtre + cursor pagination sorunsuz

CSV export var ve export işlemi audit’e loglanır

audit_logs immutable (update/delete yok)

request_id drilldown çalışır

Tenant isolation bozulmaz (başka company logları görülemez)

10) Migration / Refactor Plan (Sıfır downtime hedef)

Sanitizer ve display payload üretimi ekle (server side)

UI’yi yeni display payload’a geçir

Legacy metadata gösterimini kaldır

Immutability trigger + RLS sıkılaştır

Export + correlation drilldown ekle

Regression test: invite created/accepted, member removed, company archived