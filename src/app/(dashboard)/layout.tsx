import { Sidebar } from '@/components/layout/sidebar'
import { HeaderProvider } from '@/components/layout/header-provider'
import { getUserContext } from '@/lib/server-context'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Top-level server-side boundary check
    const ctx = await getUserContext()

    if (!ctx) {
        redirect('/login')
    }

    // Onboarding check (fetch manually since it's a layout protection feature, not a fast-context feature)
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('is_completed, current_step')
        .eq('user_id', ctx.userId)
        .maybeSingle()

    if (onboarding && !onboarding.is_completed) {
        const step = (onboarding.current_step || 'FINISHED').toLowerCase()
        if (step !== 'finished') {
            redirect(`/onboarding/${step}`)
        }
    }

    // Company boundary check
    if (!ctx.companyId) {
        // Only redirect to company creation if not accepting an invite path
        // layout acts blindly, so we're good unless they visit /join directly inside an authed protected group
        redirect('/onboarding/company_creation')
    }

    return (
        <div className="flex min-h-screen" style={{ background: 'var(--color-surface-0)' }}>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block relative z-40">
                <Sidebar />
            </div>

            {/* HeaderProvider handles mobile menu + main container state */}
            <HeaderProvider>
                {children}
            </HeaderProvider>

        </div>
    )
}
