'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useAuthStore } from '@/store/auth-store'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, loading } = useAuthStore()
    const router = useRouter()
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        if (loading) return

        if (!user) {
            router.push('/login')
            return
        }

        // Eğer onboarding tamamlanmadıysa yönlendir
        if (user.onboarding && !user.onboarding.is_completed) {
            const step = user.onboarding.current_step.toLowerCase()
            router.push(`/onboarding/${step}`)
            return
        }

        // Eğer kullanıcının aktif şirketi yoksa ve şu an davet kabul sayfasında değilse
        if (!user.active_company_id && !pathname.startsWith('/join')) {
            // Fallback (Should be caught by onboarding step but just in case)
            router.push('/onboarding/company_creation')
        }
    }, [user, loading, router, pathname])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-surface-0)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-accent) 0%, #00b8d4 100%)',
                            animation: 'pulseDot 1.5s ease-in-out infinite',
                        }}
                    >
                        <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>Yükleniyor...</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--color-surface-0)' }}>
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div onClick={(e) => e.stopPropagation()}>
                        <Sidebar />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 lg:ml-[260px] transition-all duration-300">
                <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}
