🔐 FEATURE SPEC: Enterprise Audit UI – Multi-Tenant & Compliance Hardened
🎯 Amaç

Audit sisteminin:

Company bazlı doğru çalışması

Global event’leri (LOGIN_FAILED gibi) doğru görünür kılması

Filtrelenebilir olması

Compliance-ready olması

1️⃣ Temel Problem

LOGIN_FAILED gibi bazı event’ler:

Login aşamasında oluşur

Henüz active_company context yoktur

Bu yüzden company_id NULL yazılıyor olabilir

Sonuç:

Tenant filter company_id = active_company_id olduğu için

Audit UI’da görünmez

Bu bir mimari boşluktur.

2️⃣ Audit Scope Modeli (Yeni Standart)

Audit kayıtları iki tipe ayrılacak:

2.1 Company Scoped Event

Örnek:

PROJECT_UPDATED

INVITE_CREATED

MEMBER_REMOVED

Kurallar:

company_id NOT NULL

O company’nin admin/owner’ı görebilir

2.2 Global User Event

Örnek:

LOGIN_FAILED

LOGIN_SUCCESS

PASSWORD_RESET_REQUEST

ACCOUNT_LOCKED

Kurallar:

company_id NULL olabilir

Bu kayıtlar kullanıcıya bağlıdır

Bu kayıtları şu kişiler görebilir:

Seçenek A (Önerilen Minimal)

Sadece ilgili kullanıcı

Eğer kullanıcı bir company’de admin ise o admin company security panelinde görebilir

Seçenek B (Enterprise)

System owner (global admin) görebilir

Company admin sadece kendi üyelerinin login event’lerini görebilir

3️⃣ LOGIN_FAILED – Doğru Yazım Standardı

LOGIN_FAILED audit kaydı şu formatta olmalı:

{
  "action": "LOGIN_FAILED",
  "actor_user_id": null veya user_id (varsa),
  "context": {
    "email": "masked",
    "reason": "INVALID_PASSWORD",
    "ip": "masked",
    "user_agent": "optional"
  },
  "company_id": null,
  "severity": "info" | "warning" | "critical"
}

Eğer login denemesi bir kullanıcıya aitse:

user_id resolve edilebiliyorsa yaz

company_id NULL kalabilir

4️⃣ Audit UI – Filtre Sistemi (Zorunlu)

Audit UI aşağıdaki filtreleri içermeli:

Date range

Action

Severity

Actor

Target type

Search (email / id / request_id)

LOGIN_FAILED gibi event’ler Action filtresinden seçilebilmelidir.

5️⃣ Multi-Tenant Görünürlük Kuralı
5.1 Company Audit Panel

Company admin/owner:

Görebilir:

company_id = active_company_id olan kayıtlar

O company üyelerinin LOGIN_FAILED kayıtları

Göremez:

Başka company audit kayıtlarını

Başka company üyelerinin login kayıtlarını

5.2 Global Admin Panel (Varsa)

Eğer sistemde super admin varsa:

Tüm audit kayıtlarını görebilir

company_id NULL olan global event’leri de görebilir

6️⃣ RLS Policy Güncellemesi

audit_logs SELECT policy şu kuralları içermeli:

(
  company_id = active_company_id
)
OR
(
  action IN ('LOGIN_FAILED','LOGIN_SUCCESS')
  AND actor_user_id IN (
      SELECT user_id FROM members
      WHERE company_id = active_company_id
  )
)

Bu sayede:

Company admin kendi üyelerinin login event’lerini görebilir

Cross-tenant erişim engellenir

7️⃣ UI Render Standardı

LOGIN_FAILED UI’da şu şekilde gösterilmeli:

Başlık:

Başarısız giriş denemesi

Context:

Email (maskeli)

IP (maskeli)

Reason

Severity badge

5 deneme sonrası:

Severity = critical

Kırmızı gösterim

8️⃣ Suspicious Detection Görselleştirme

Audit UI’da:

severity = critical filtrelenebilir

“Son 24 saat kritik olay sayısı” gösterilebilir

9️⃣ Retention & Compliance Panel Entegrasyonu

Audit UI’da ayrı sekme:

Security & Compliance

Gösterilecek:

Audit retention süresi

Activity retention süresi

Son retention run zamanı

Failed login sayısı (24 saat)

Critical event sayısı (24 saat)

🔟 Acceptance Criteria

☐ LOGIN_FAILED UI’da görünür
☐ Company admin kendi üyelerinin login denemelerini görebilir
☐ Cross-company login event görünmez
☐ Action filtresi var
☐ Severity filtresi var
☐ RLS doğru çalışıyor
☐ Global event’ler company filtresine takılmıyor

1️⃣1️⃣ Mimari Not

Eğer LOGIN_FAILED kayıtları company_id NULL kalıyorsa ve görünmüyorsa:

Çözüm:

Ya global audit tabı ekle

Ya RLS policy genişlet

Ya login sırasında user’ın primary membership’ini resolve edip company_id yaz

✅ LOGIN_FAILED / LOGIN_SUCCESS kayıtlarını global user event olarak tut (company_id = NULL)

Ve şirket adminlerinin görebilmesi için “şirket bağlamında görünürlük”ü DB tarafında join/view ile çöz.

Neden bu daha doğru?

Login anında kullanıcı hangi şirkete girecek belli değil (multi-company).

company_id yazarsan yanlış şirkete bağlama riski var.

Yanlış şirket = yanlış görünürlük = güvenlik hatası (cross-tenant leakage).

Global user event modeli compliance dünyasında daha standarttır.

Bu modelde kurallar
Audit log yazımı

audit_logs (veya ayrı auth_audit_logs) içine:

action = LOGIN_FAILED

subject_user_id (tahmin edilebiliyorsa) veya subject_email_hash

company_id = NULL

ip masklenebilir

user_agent opsiyonel

severity (5 deneme → critical)

Kritik: email’i plaintext tutma. email_hash + email_masked yeter.

Şirket adminleri nasıl görecek?

UI “Company Security” sayfasında gösterilecek kayıtlar:

subject_user_id o şirkette member ise göster

subject_user_id yoksa (email ile yakalandıysa):

email hash, o şirketteki user’ların email hash’i ile eşleşiyorsa göster

Bu şekilde:

Admin sadece kendi şirket üyelerine ait login denemelerini görür.

Başka şirketin kullanıcıları görünmez.

Login event’leri “kaybolmaz”.