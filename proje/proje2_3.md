# Görev: Next.js Uygulamasında Sunucu Tarafı Bloklamalarını (Server-Side Blocking) Çözme ve Streaming Entegrasyonu

Mevcut yapıda Server Component ve `loading.tsx` kullanıma alınmış olsa da, sayfanın kök dizinlerinde yapılan sıralı `await` işlemleri sayfa render'ını bloklamakta ve yavaşlık hissine neden olmaktadır. Ayrıca client tarafındaki gereksiz bootstrap isteği performansı etkilemektedir. 

Aşağıdaki mimari düzenlemeleri derhal uygula:

1. **Layout İçinde Paralel Veri Çekimi:** `src/app/(dashboard)/layout.tsx` içindeki `getUserContext` ve `user_onboarding` sorgularını sıralı beklemek yerine `Promise.all` ile paralel olarak çalıştır.

2. **Partial Prerendering ve Suspense Kullanımı:** `src/app/(dashboard)/dashboard/page.tsx` dosyasını güncelle. Ağır veritabanı işlemlerini (`getDashboardData`) ana sayfa bileşeninden çıkar. Sayfa iskeletini (Başlıklar, statik yapılar) anında render et. Veri gerektiren bölümleri (StatCards, Charts, StaffPerformance) ayrı alt Server Component'lere (örn: `<DashboardContent />`) taşı ve bunları `<Suspense fallback={<LoadingSkeleton />}>` ile sarmalayarak Streaming mimarisini kur.

3. **AuthProvider Optimizasyonu:** `src/components/providers/auth-provider.tsx` içindeki `runBootstrap` fonksiyonunun `/api/context/bootstrap` adresine attığı HTTP isteğini kaldır. Sunucu tarafında `layout.tsx` üzerinden zaten oturum ve kullanıcı bağlamını (context) alıyoruz. Sunucudan alınan bu veriyi `AuthProvider`'a bir `initialData` prop'u olarak geç ve Zustand store'unu istemcide HTTP isteği atmadan doğrudan bu sunucu verisiyle (hydrate ederek) başlat.

Bu değişiklikler tamamlandığında sayfa geçişleri anında gerçekleşmeli ve veri blokları hazır oldukça ekrana yerleşmelidir. Kodu bu prensiplere göre yeniden yaz.