import { create } from 'zustand'
import type { UserRole } from '@/types/database'

interface CompanySnapshot {
    id: string
    name: string
    logo_url: string | null
    status: string
    role: UserRole
}

interface UserProfile {
    id: string
    active_company_id: string | null
    role: UserRole
    full_name: string
    avatar_url: string | null
    email: string
    onboarding?: {
        is_completed: boolean
        current_step: string
    }
}

interface AuthState {
    user: UserProfile | null
    companies: CompanySnapshot[]
    loading: boolean
    setUser: (user: UserProfile | null) => void
    setCompanies: (companies: CompanySnapshot[]) => void
    setLoading: (loading: boolean) => void
    isAdmin: () => boolean
    activeCompany: () => CompanySnapshot | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    companies: [],
    loading: true,
    setUser: (user) => set({ user }),
    setCompanies: (companies) => set({ companies }),
    setLoading: (loading) => set({ loading }),
    isAdmin: () => {
        const user = get().user
        if (!user || !user.active_company_id) return false
        return user.role === 'admin' || user.role === 'owner'
    },
    activeCompany: () => {
        const { user, companies } = get()
        if (!user?.active_company_id) return null
        return companies.find(c => c.id === user.active_company_id) ?? null
    },
}))
