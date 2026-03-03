⚡ Performance Pass v1 — Dashboard / Customers / Projects
🎯 Hedef

Aşağıdaki sayfalarda “sekme tıklayınca gecikme” hissini kaldır:

Dashboard

Müşteriler (Customers)

Projeler (Projects)

Kural: Ayar değiştirmek yok; her sayfanın darboğazını optimize et.
Öncelik: fewer queries + smaller payload + less rerender.

0) Global Kurallar (Bu 3 sayfa için ortak)
0.1 Data Fetching Standardı

Liste sayfalarında server-side pagination (cursor/limit) zorunlu

Tek seferde “her şeyi çekme” yok

select('*') yok, sadece UI’da kullanılan alanlar seçilecek

0.2 Meta Lazy Loading

projects/users/statuses gibi meta veriler:

Sayfa açılışında çekilmez

Sadece modal açılınca (create/edit) ya da filtre dropdown açılınca çekilir

Cache’lenir (memory) ve tekrar fetch edilmez

0.3 Loading UX Standardı

İlk load: skeleton olabilir

Sonraki refresh (save/delete/realtime): skeleton’a düşme

“refreshing…” küçük spinner / subtle toast

0.4 Realtime / Events

Realtime subscription varsa:

Her event’te full refetch yasak

insert/update/delete event’lerinde state’e incremental patch uygula

Sadece “out-of-sync” şüphesi varsa fallback refetch

0.5 Rerender Kontrolü

Büyük listelerde useMemo ile türetilmiş listeler (filter/group/sort) hesaplanacak

Row component’leri React.memo

Zustand/Store kullanılıyorsa:

store’dan sadece ihtiyaç duyulan field’lar selector ile alınacak

whole-store subscribe yasak

1) Dashboard — Optimize
1.1 Problem Pattern

Dashboard genelde yavaş olur çünkü:

Çok sayıda query (stats, charts, recent activity)

İlk açılışta hepsini paralel çekip UI’ı bloklar

1.2 Yapılacaklar

Dashboard data’yı 2 seviyeye böl:

Critical (ilk ekranda görünen 3–4 KPI)

Secondary (grafikler, geniş listeler)

Critical KPI’ları tek endpoint veya tek server action ile getir:

GET /api/dashboard/summary

payload minimal: counts + last updated timestamp

Secondary bölümleri lazy yap:

“Recent activity” kartı ayrı fetch (component mount olduğunda)

Grafikler viewport’a girince fetch (IntersectionObserver)

Dashboard’daki “son 24h failed login / permission denied” gibi metrikler:

company scoped olanları company_id ile filtrele

global login event’leri için şirket üyeleri üzerinden join/RPC (mevcut yaklaşım uygunsa onu kullan)

Render:

charts heavy ise dynamic import (ssr:false) ile böl

data transform (grouping) useMemo

Acceptance:

Dashboard ilk açılış TTI gözle görülür şekilde düşmeli

Secondary içerik “sonradan yüklenebilir”, kritik KPI’lar anında

2) Customers — Optimize
2.1 Liste Modeli

Customers listesi:

cursor pagination (limit 25/50)

server-side search (ilkel contains) + debounce

2.2 Yapılacaklar

/customers sayfasında:

initial fetch: GET /api/customers?limit=50&cursor=...&q=...

sadece alanlar: id, name, email/phone (varsa), created_at, status

Search:

client-side full scan yok

input debounce 300ms

q parametresi ile server-side query

Customer detail panel/modals:

customer seçilince detail fetch et

liste yükünde detail bilgisi çekme

Realtime:

customer insert/update/delete event’leri incremental patch

full refetch sadece nadiren (ör. batch import bitti)

Rerender:

filteredCustomers gibi şeyler client’ta hesaplanmayacak (server-side)

row memoization

Acceptance:

Customers sekmesi tıklanınca ilk liste hızlı gelsin

Search yazınca UI takılmasın

3) Projects — Optimize
3.1 Problem Pattern

Projects genelde:

customer join + counts (tasks, invoices) derken payload şişer

3.2 Yapılacaklar

/projects listesinde “thin list” kullan:

id, title, status, customer_name (veya customer_id), updated_at

task_count gibi alanlar gerekiyorsa:

ya DB view/RPC ile minimal aggregate

ya da detail sayfasında göster (listeye koyma)

Filtre/sort:

status filtresi server-side

date range server-side

client-side groupBy sadece küçük listelerde; büyük listede server-side paginate

Create/Edit modalları:

customer listesi meta lazy load

status enum mapping local

Realtime:

project update event’i geldiğinde state patch

status değişince sadece ilgili item güncellensin

Heavy UI:

kanban varsa: useMemo(groupByStatus) + row memo

drag-drop kullanıyorsa dynamic import ve sadece kanban route’unda yükle

Acceptance:

Projects sekmesi tıklayınca liste anında gelsin

Status filtresi değişince skeleton’a düşmeden “refreshing” ile güncellensin

4) Telemetry / Ölçüm (Zorunlu)

Her sayfada console’a değil, minimal ölçüm koy:

API response time (ms)

render count (React dev tools ile gözlem)

Largest payload endpoint hangisi

Ama bunu prod’a loglama; dev amaçlı.

5) Çıkış Kriteri

Bu 3 sayfa için:

İlk tıklamada “gecikme hissi” bariz azalacak

Network panelinde “gereksiz paralel query” azalacak

Realtime event’lerde full refetch yerine patch çalışacak

Search ve filtreler UI’ı kilitlemeyecek