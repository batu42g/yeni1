'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'

interface InitialData {
    user: any
    companies: any[]
}

interface AuthProviderProps {
    children: React.ReactNode
    initialData?: InitialData | null
}

export function AuthProvider({ children, initialData }: AuthProviderProps) {
    const router = useRouter()

    // Yalnızca hidratasyon yapıldığını işaretleyen kalıcı referans (Sonsuz Döngüyü kırmak için)
    const hasHydrated = useRef(false)

    // Sayfa render edilirken Store'u eşzamanlı hydrate ediyoruz. Bu kısım sadece 1 kez çalışır.
    if (!hasHydrated.current) {
        if (initialData?.user) {
            useAuthStore.setState({
                user: initialData.user,
                companies: initialData.companies || [],
                loading: false
            })
        } else {
            useAuthStore.setState({
                user: null,
                companies: [],
                loading: false
            })
        }
        hasHydrated.current = true
    }

    // Effect üzerinde initialData veya AuthState gibi referans tutmuyoruz (Re-render / Infinite Loop bug'ını bitirir)
    useEffect(() => {
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                useAuthStore.setState({ user: null, companies: [], loading: false })
                router.push('/login')
                router.refresh()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router]) // Safely tied only to the router reference

    return <>{children}</>
}
