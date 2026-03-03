🔐 ENTERPRISE COMPLIANCE READY – UPGRADE SPEC
🎯 Hedef

Sistem şu gereksinimleri karşılamalı:

Immutable audit log

Retention policy

Access audit (login / failed / permission denied)

Suspicious activity detection

Correlation tracking

PII minimization

Compliance documentation readiness

1️⃣ IMMUTABLE GUARANTEE (Zorunlu)
1.1 DB Seviyesi

audit_logs tablosu:

UPDATE → yasak

DELETE → yasak

Trigger ile blokla

RLS ile INSERT sadece backend/service role

1.2 Hash Integrity (Opsiyonel ama güçlü)

Her audit satırı için:

hash = SHA256(previous_hash + current_row_json)

Zincir mantığı.

Bu sayede log manipulation tespit edilir.

2️⃣ RETENTION POLICY
2.1 Süre Tanımı

Audit log: 2 yıl

Activity log: 180 gün

2.2 Otomatik Temizleme

Scheduled job:

2 yıldan eski audit:

Soft archive

veya cold storage

180 günden eski activity:

sil

2.3 Admin Panel

Compliance ekranı:

“Audit retention: 2 years”

“Activity retention: 180 days”

3️⃣ ACCESS CONTROL AUDIT (Zorunlu)

Yeni action tipleri ekle:

LOGIN_SUCCESS

LOGIN_FAILED

PERMISSION_DENIED

ROLE_CHANGED

EXPORT_DOWNLOADED

COMPANY_ARCHIVED

USER_DEACTIVATED

Login başarısız denemeler de audit’e yazılmalı.

4️⃣ SUSPICIOUS ACTIVITY DETECTION
4.1 Kural Motoru

Şu olaylar flag’lensin:

5 failed login (10 dk içinde)

3 export (5 dk içinde)

Role escalation attempt

Çoklu şirket geçişi kısa sürede

Audit satırına:

"severity": "warning" | "critical"
5️⃣ CORRELATION ID / REQUEST TRACE

Her request’e:

request_id üret

Aynı işlem zincirindeki audit kayıtlarına aynı request_id yaz

UI’da:

request_id tıklanınca zincir göster

6️⃣ DATA MINIMIZATION POLICY
6.1 Asla Tutulmayacak

token

token_hash

password

secret

api_key

6.2 Maskelenmesi Gereken

email (kısmi)

IP (78.186.xxx.xxx)

UUID (33c9…26c8)

7️⃣ EXPORT HARDENING

CSV export sanitize edilmiş olmalı

Export işlemi audit’e yazılmalı

Export rate limit olmalı

Cross-company export engellenmeli

8️⃣ FAILED LOGIN TRACKING

Login API:

Başarısız denemeler audit’e yazılır

threshold aşılırsa severity = warning

9️⃣ PERMISSION DENIED AUDIT

Her RLS veya role failure:

PERMISSION_DENIED

context: endpoint + target_type

Bu compliance için önemlidir.

🔟 COMPLIANCE PANEL

Admin paneline yeni bölüm:

Security & Compliance

Gösterilecekler:

Retention süreleri

Immutable policy aktif mi?

Audit log count

Son 24 saat kritik olay sayısı

Failed login sayısı

1️⃣1️⃣ ACCEPTANCE CRITERIA

☐ audit_logs update/delete mümkün değil
☐ retention job çalışıyor
☐ failed login audit var
☐ permission denied audit var
☐ export audit var
☐ suspicious activity severity var
☐ request_id zincir görünümü var
☐ PII sanitize edilmiş