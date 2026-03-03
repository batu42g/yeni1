'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'

// Module-scope promise — session boyunca tek bootstrap garantisi
// Next.js App Router'da client module'ler page navigasyonunda yeniden evaluate edilmez
let _bootstrapPromise: Promise<void> | null = null
let _bootstrapDone = false

async function runBootstrap(
    setUser: ReturnType<typeof useAuthStore.getState>['setUser'],
    setCompanies: ReturnType<typeof useAuthStore.getState>['setCompanies'],
    setLoading: ReturnType<typeof useAuthStore.getState>['setLoading'],
) {
    try {
        const res = await fetch('/api/context/bootstrap')
        if (res.status === 401) {
            setUser(null)
            setCompanies([])
            return
        }
        if (!res.ok) throw new Error('Bootstrap failed')

        const data = await res.json()

        if (data.user) {
            setUser({
                id: data.user.id,
                active_company_id: data.active_company_id,
                role: data.role,
                full_name: data.user.full_name,
                avatar_url: data.user.avatar_url,
                email: data.user.email || '',
                onboarding: data.onboarding,
            })
            setCompanies(data.companies || [])
            _bootstrapDone = true
        } else {
            setUser(null)
            setCompanies([])
        }
    } catch {
        setUser(null)
        setCompanies([])
    } finally {
        setLoading(false)
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { setUser, setCompanies, setLoading } = useAuthStore()
    // Guard against StrictMode double-invoke within the same component instance
    const didSubscribe = useRef(false)

    useEffect(() => {
        // Deduplicate bootstrap: module-scope promise ensures single HTTP call
        if (!_bootstrapPromise) {
            _bootstrapPromise = runBootstrap(setUser, setCompanies, setLoading)
        } else {
            _bootstrapPromise.finally(() => setLoading(false))
        }

        if (didSubscribe.current) return
        didSubscribe.current = true

        const supabase = createClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                _bootstrapPromise = null
                _bootstrapDone = false
                setUser(null)
                setCompanies([])
                router.push('/login')
            } else if (event === 'SIGNED_IN' && !_bootstrapDone) {
                // Only re-bootstrap on actual new login, not on token refresh / session restore
                // _bootstrapDone flag prevents re-run when Supabase fires SIGNED_IN on page load
                _bootstrapPromise = runBootstrap(setUser, setCompanies, setLoading)
            }
        })

        return () => {
            subscription.unsubscribe()
            didSubscribe.current = false
        }
    }, [setUser, setCompanies, setLoading, router])

    return <>{children}</>
}
