'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
    const pathname = usePathname()
    const { user, setUser, setCompanies, setLoading } = useAuthStore()
    const initialized = useRef(false)
    const didSubscribe = useRef(false)

    // Syntronous initialization of Zustand store using Server's initialData (No HTTP Waterfall)
    if (!initialized.current) {
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
        initialized.current = true
    }

    // Additional sync to keep client state consistent across fast navigations
    const hasHydrated = useRef(false)
    useEffect(() => {
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
    }, [initialData])

    useEffect(() => {
        if (didSubscribe.current) return
        didSubscribe.current = true

        const supabase = createClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                useAuthStore.setState({ user: null, companies: [] })
                router.push('/login')
                router.refresh()
            } else if (event === 'SIGNED_IN') {
                // If it's a genuine fresh login (no user in initial layout render), force stream re-fetch
                if (!initialData?.user && !hasHydrated.current) {
                    router.refresh()
                }
            }
        })

        return () => {
            subscription.unsubscribe()
            didSubscribe.current = false
        }
    }, [router, initialData?.user])

    return <>{children}</>
}
