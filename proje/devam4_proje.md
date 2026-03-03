DAVET SİSTEMİ NASIL ÇALIŞMALI?

Şu an demo’da muhtemelen:

Email giriliyor

DB’ye kayıt atılıyor

Ama gerçek akış yok

Gerçek SaaS akışı şöyle olur 👇

🔁 DOĞRU AKIŞ
1️⃣ Admin → “Kullanıcı Davet Et”

Form:

Email

Rol (admin / staff)

Backend şunları yapar:

invitations
id
company_id
email
role
token
expires_at
accepted (boolean)


Unique token üret

48 saat geçerli olsun

Email gönder

2️⃣ Email İçeriği

Link:

https://site.com/invite/{token}


Bu linke tıklayan kişi:

Token doğrulanır

Süresi dolmamış mı kontrol edilir

Kullanıcı register sayfasına yönlendirilir

3️⃣ Register Akışı

Kullanıcı:

Şifre belirler

Ad soyad girer

Backend:

Supabase auth user oluşturur

users tablosuna company_id + role ile kayıt atar

invitation accepted = true yapar

4️⃣ Güvenlik

Mutlaka kontrol edilmeli:

Token tek kullanımlık

Süresi dolmuş token invalid

Email eşleşmesi zorunlu

Davet Sistemi Neden Bu Kadar Önemli?

Çünkü:

SaaS ekip ürünüdür.

Tek kullanıcı ürünü değil.

İşletmeler 3-10 kişi kullanır.

Davet sistemi yoksa ürün “kişisel CRM” gibi görünür.