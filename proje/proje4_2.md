1️⃣ Hesap Hareketleri (Activity Timeline)

Amaç:
“Kullanıcı şirket içinde ne oldu?” sorusuna cevap verir.

Bu sayfa okunabilir, özet, kullanıcı dostu olmalı.

🔹 Gösterilmesi Gereken Bildirimler (Sıralı Liste)
🟢 1. Üyelik & Ekip Olayları

Yeni ekip üyesi katıldı

Davet gönderildi

Davet kabul edildi

Davet iptal edildi

Üye çıkarıldı

Üye rolü değiştirildi

🟢 2. Şirket Olayları

Şirket oluşturuldu

Şirket ayarları güncellendi

Şirket arşivlendi

Şirket yeniden aktifleştirildi

🟢 3. Yetki & Güvenlik Olayları

Kullanıcı aktif şirket değiştirdi

Kullanıcı hesabı pasifleştirildi

Şifre sıfırlama talebi

2FA etkinleştirildi/devre dışı bırakıldı

🟢 4. Fatura / Finans (Varsa)

Plan değiştirildi

Seat limiti güncellendi

Fatura oluşturuldu

Ödeme alındı

Abonelik iptal edildi

🟢 5. Operasyonel İşlemler (CRM/Project varsa)

Proje oluşturuldu

Görev tamamlandı

Dosya yüklendi

Not eklendi

🎯 Timeline Özelliği

En yeni üstte

Infinite scroll

Filtrelenebilir (event type / kullanıcı / tarih)

90–180 gün retention yeterli

2️⃣ Audit Log Sayfası

Amaç:
“Kim, ne zaman, teknik olarak ne yaptı?” sorusuna cevap verir.

Bu sayfa:

Daha detaylı

Daha teknik

Metadata içerir

Immutable’dır

🔒 Gösterilmesi Gereken Audit Olayları
🔴 1. Yetki & Rol

MEMBER_ROLE_UPDATED

MEMBER_REMOVED

MEMBER_RESTORED

🔴 2. Davet

INVITE_CREATED

INVITE_ACCEPTED

INVITE_REVOKED

INVITE_EXPIRED

🔴 3. Şirket

COMPANY_CREATED

COMPANY_ARCHIVED

COMPANY_DELETED

COMPANY_SETTINGS_UPDATED

🔴 4. Kullanıcı

USER_DEACTIVATED

USER_DELETED

USER_REACTIVATED

🔴 5. Context

USER_CONTEXT_SWITCHED

🔴 6. Güvenlik

LOGIN_SUCCESS (opsiyonel)

LOGIN_FAILED (opsiyonel)

EXPORT_DOWNLOADED

PERMISSION_DENIED

🔴 7. Abonelik (Varsa)

BILLING_PLAN_CHANGED

SUBSCRIPTION_CANCELLED

SEAT_LIMIT_EXCEEDED

3️⃣ Personel Bu Sayfaları Görmeli mi?

Net cevap:

🔹 Activity Timeline

✔ Evet, personel görebilir.

Ama:

Sadece kendi şirketine ait

PII içermeyen

Finansal detay yok

Rol değişiklik diff detayı yok

Bu güven hissi verir.

🔹 Audit Log

❌ Hayır (varsayılan olarak).

Sadece:

owner

admin

görmeli.

5️⃣ UI Ayrımı

Activity:

Kart tasarım

Özet

Okunabilir

Audit:

Tablo

Filtre

Metadata expand

CSV export (audit edilir)

6️⃣ Kurumsal Güven İçin Ekstra

Audit export → EXPORT_DOWNLOADED olarak tekrar audit’e yazılmalı

Audit immutable olmalı

Request ID gösterilmeli

Tarih aralığı filtre zorunlu

🎯 Özet

Activity = İnsanlar için
Audit = Denetim için

Personel:

Activity görür

Audit görmez

Admin:

İkisini de görür