import { Sidebar } from '@/components/layout/sidebar'
import { HeaderProvider } from '@/components/layout/header-provider'
import { getUserContext } from '@/lib/server-context'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. Get authenticated user first securely
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 2. Parallelize all remaining heavy DB queries (context + onboarding)
    const [contextRes, onboardingRes] = await Promise.all([
        (supabase as any).rpc('fn_fast_user_context').maybeSingle(),
        supabase.from('user_onboarding').select('is_completed, current_step').eq('user_id', user.id).maybeSingle()
    ])

    const onboarding = onboardingRes.data
    const ctxData = contextRes.data as any

    if (onboarding && !onboarding.is_completed) {
        const step = (onboarding.current_step || 'FINISHED').toLowerCase()
        if (step !== 'finished') {
            redirect(`/onboarding/${step}`)
        }
    }

    // Company boundary check
    if (!ctxData || !ctxData.company_id) {
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
