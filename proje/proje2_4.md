# Görev: "Sürekli Compiling" ve Sonsuz Render Döngüsünü (Infinite Loop) Kırmak

Şu an development ortamında hangi sayfaya girersem gireyim dev server sürekli "Compiling /..." uyarısı veriyor. Bu sorun, yaptığın son refactoring sırasında global provider'larda (özellikle `AuthProvider`) veya layout dosyalarında oluşan bir sonsuz döngüden kaynaklanmaktadır. 

Aşağıdaki kritik düzeltmeleri derhal uygula:

1. **AuthProvider Hydration Döngüsünü Düzelt (Object Reference Bug):**
   * `src/components/providers/auth-provider.tsx` dosyasında, sunucudan gelen `initialData` prop'unu Zustand store'una yazarken bir `useEffect` kullandıysan, `initialData` nesnesinin referansı her render'da değiştiği için sonsuz döngü oluşuyor.
   * ÇÖZÜM: İlk yüklemeyi (hydration) kontrol etmek için bir `useRef` kullan. 
   * Örnek: 
     ```typescript
     const hasHydrated = useRef(false);
     useEffect(() => {
       if (initialData && !hasHydrated.current) {
         setContext(initialData);
         hasHydrated.current = true;
       }
     }, [initialData, setContext]);
     ```

2. **Supabase Auth Listener ve `router.refresh()` Kontrolü:**
   * `AuthProvider` içinde `supabase.auth.onAuthStateChange` dinleyicisi varsa ve her tetiklendiğinde `router.refresh()` çalıştırıyorsa, bu da sunucuyu tekrar tekrar render etmeye zorluyor olabilir. Sadece oturum durumu **gerçekten** değiştiğinde (`SIGNED_IN` veya `SIGNED_OUT`) refresh atılmasını sağla. Gereksiz state updatelerini kaldır.

3. **useRouter ve useEffect Çakışmaları:**
   * Global Layout'larda veya Provider'larda bulunan, yetki kontrolü yapan (örn: `if (!user) router.push('/login')`) hook'ların dependency array'lerini (bağımlılık dizilerini) kontrol et. Yanlış verilmiş bir referans sayfanın sürekli kendini yönlendirmesine (redirect loop) ve compile edilmesine neden oluyor.

Lütfen `AuthProvider` ve `layout.tsx` dosyalarındaki veri akışını bu referans güvenliği (referential equality) prensiplerine göre tekrar yaz.