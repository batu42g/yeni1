👉 Active company context boş / yanlış
👉 veya bootstrap sırasında membership doğrulaması fail oluyor

Bu yüzden sistem seni:

“şirkete bağlı değil” gibi görüyor

ama rolün admin olduğu için header’da admin yazıyor.

Yani:

👉 rol okunuyor
👉 context okunmuyor

Bu iki katman ayrışmış.

Olan şey büyük ihtimalle şu

Login sonrası akış:

user_settings.active_company_id → null


ve bootstrap:

membership kontrol → fail
→ No Company Mode
→ şirket oluştur ekranı


Ama:

members tablosunda kayıt var


Yani DB’de üyeliğin var
ama context set edilmiyor.

En olası 3 sebep
1️⃣ user_settings tablosunda active_company_id yok

Migrate doğru kopyalamamış olabilir.

Kontrol SQL:

select user_id, active_company_id
from user_settings
where user_id = 'senin_user_id';


null ise problem bu.

2️⃣ membership status active değil

Bootstrap kontrolü genelde:

members.status = 'active'


Eğer:

archived

inactive

removed

ise context reddedilir.

Kontrol:

select *
from members
where user_id = 'sen'

3️⃣ company archived/deleted

Company status active değilse:

bootstrap context’i reddeder.

Kontrol:

select status
from companies
where id = active_company_id;

Neden rol görünüyor ama şirket yok?

Çünkü:

👉 rol members’tan okunuyor
👉 active context user_settings’tan

biri var
biri yok

UI iki farklı kaynaktan besleniyor.

Hızlı düzeltme

Geçici test için:

update user_settings
set active_company_id = (select company_id
                         from members
                         where user_id = 'sen'
                         and status = 'active'
                         limit 1)
where user_id = 'sen';


Sonra logout/login yap.

Eğer bu düzeltirse

bootstrap logic’inde bug var demektir:

👉 fallback çalışmıyor
👉 first active membership set edilmiyor