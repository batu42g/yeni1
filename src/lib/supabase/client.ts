import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Güvenlik amacıyla LocalStorage kullanımını engellemek için boş bir storage adapter tanımlıyoruz.
// Bu sayede session bilgileri tarayıcıda (localStorage/sessionStorage) saklanmaz, sadece Cookie ve Memory (RAM) üzerinde tutulur.
const inMemoryStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => { }, // No-op
  removeItem: (key: string) => { }, // No-op
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: inMemoryStorage, // LocalStorage yerine Memory kullan
        persistSession: true, // Session devamlılığını Memory'de sağla (sayfa yenilenene kadar)
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      // Not: @supabase/ssr zaten cookie yönetimini otomatik yapar. 
      // Cookie'ler HttpOnly olduğu için JS tarafından okunamaz, bu da XSS güvenliğini artırır.
    }
  )
}
