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
    useEffect(() => {
        if (initialized.current) {
            if (initialData?.user) {
                setUser(initialData.user)
                setCompanies(initialData.companies || [])
            } else {
                if (user) setUser(null)
                setCompanies([])
            }
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, setUser, setCompanies, setLoading])

    useEffect(() => {
        if (didSubscribe.current) return
        didSubscribe.current = true

        const supabase = createClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                setUser(null)
                setCompanies([])
                router.push('/login')
            } else if (event === 'SIGNED_IN') {
                // Next.js will re-stream the server layout yielding fresh initialData
                // So no need to run custom HTTP logic here anymore.
                // Just force a refresh if we're technically not carrying user state yet
                if (!useAuthStore.getState().user) {
                    router.refresh()
                }
            }
        })

        return () => {
            subscription.unsubscribe()
            didSubscribe.current = false
        }
    }, [router, setUser, setCompanies])

    return <>{children}</>
}
