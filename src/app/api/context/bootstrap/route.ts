import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()

        // Step 1: getUser() + fn_fast_user_context in PARALLEL
        // fn_fast_user_context uses auth.uid() from JWT cookie — doesn't need getUser() result
        const [authResult, profileResult] = await Promise.all([
            supabase.auth.getUser(),
            (supabase as any).rpc('fn_fast_user_context').maybeSingle(),
        ])

        if (authResult.error || !authResult.data.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = authResult.data.user
        const typedProfile = profileResult.data as any
        const activeCompanyId: string | null = typedProfile?.company_id || null

        // Step 2: memberships + onboarding in PARALLEL (now we have user.id)
        const [membershipsResult, onboardingResult] = await Promise.all([
            supabase
                .from('members')
                .select('company_id, role, status, companies(id, name, logo_url, status)')
                .eq('user_id', user.id),
            (supabase as any)
                .from('user_onboarding')
                .select('is_completed, current_step')
                .eq('user_id', user.id)
                .maybeSingle(),
        ])

        const activeMemberships = (membershipsResult.data || []).filter((m: any) => m.status === 'active')
        const validCompanies = activeMemberships
            .filter((m: any) => m.companies)
            .map((m: any) => ({ ...m.companies, role: m.role }))

        const onboarding = onboardingResult.data as any
        const isCompleted: boolean = onboarding?.is_completed || false
        const currentStep: string = onboarding?.current_step || 'FINISHED'

        return NextResponse.json({
            user: {
                id: user.id,
                full_name: typedProfile?.full_name || '',
                avatar_url: typedProfile?.avatar_url || null,
                email: user.email,
            },
            active_company_id: activeCompanyId,
            role: typedProfile?.role || 'staff',
            companies: validCompanies,
            onboarding: {
                is_completed: isCompleted,
                current_step: currentStep,
            },
        })

    } catch (error: any) {
        console.error('Bootstrap API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
