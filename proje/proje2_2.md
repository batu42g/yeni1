# Görev: Next.js Uygulamasında Performans Optimizasyonu ve İstek Şelalesi (Request Waterfall) Çözümü

Şu anda uygulamada ciddi bir sayfa yüklenme gecikmesi yaşanıyor. Bunun temel sebebi, verilerin İstemci Tarafında (Client-Side) ardışık `fetch` istekleri zinciri (Request Waterfall) kurularak çekilmesidir. Next.js App Router'ın sunduğu Sunucu Bileşenleri (Server Components) gücü kullanılmamaktadır.

## İlgili Dosyalar
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/providers/auth-provider.tsx`
- `src/lib/server-context.ts`

## Mevcut Sorunlar
1. **İstek Şelalesi (Waterfall):** `AuthProvider` oturumu çekiyor, bitince `DashboardLayout` yükleniyor, ardından `DashboardPage` render olup istatistikleri çekmek için `/api/dashboard/bootstrap` isteği atıyor. Eşzamanlı olarak `StaffPerformance` alt bileşeni de istemci üzerinden Supabase'e iki ayrı sorgu daha atıyor.
2. **Yanlış Rendering Stratejisi:** `layout.tsx` ve `page.tsx` dosyaları en üstte `'use client'` ile işaretlenmiş ve tüm sayfa React SPA mantığıyla çalışıyor. Veriler yüklenene kadar kullanıcı boş bir sayfa ve spinner izliyor.

## Beklenen Mimari Değişiklikler ve Çözüm Adımları
1. **Server Components'e Geçiş:** `layout.tsx` ve `dashboard/page.tsx` dosyalarından `'use client'` yönergesini kaldırarak bunları Server Component'e dönüştür. Ana veri çekme işlemlerini istemcideki `useEffect` kancalarından çıkarıp doğrudan sunucu tarafına (server-side async) taşı.
2. **Paralel Veri Çekme (Parallel Fetching):** Bağımsız verileri sırayla çekmek yerine `Promise.all` kullanarak sunucuda paralel olarak çek. Sunucu tarafındaki sabit gecikmeleri (örneğin RLS veya RPC çağrılarını) tek bir seferde asenkron olarak çöz.
3. **API Rotalarını Bypass Etme:** Server Component'ler içinden uygulamanın kendi `/api/...` rotalarına HTTP isteği atmak yerine, doğrudan `lib/supabase/server.ts` veya ilgili veritabanı servis fonksiyonlarını çağır.
4. **Bileşen Ayrışımı (Component Segregation):** Sadece interaktivite gerektiren parçaları (grafikler, butonlar, modallar) izole edilmiş küçük Client Component'ler olarak ayır. Sunucuda hazırladığın verileri bu bileşenlere `props` olarak aktar.
5. **Next.js Loading UI:** Manuel `loading` state'leri (`setLoading(false)`) kullanmak yerine, sayfa geçişlerinde anında tepki vermek için Next.js'in yerleşik `loading.tsx` dosyasını ve `<Suspense>` mimarisini kullan.

Lütfen bu refactoring işlemini projeyi kırmadan, adım adım gerçekleştir ve kodu yazmadan önce mimari planını kısaca onayla.