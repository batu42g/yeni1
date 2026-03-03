import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logPermissionDenied } from '@/lib/permission-audit'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Authenticate Request
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { company_id } = body

        if (!company_id) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
        }

        // 2. Verify Eligibility (Membership must be active)
        const { data: membership } = await supabase
            .from('members')
            .select('role')
            .eq('user_id', user.id)
            .eq('company_id', company_id)
            .eq('status', 'active')
            .single()

        if (!membership) {
            await logPermissionDenied({ endpoint: '/api/context/active-company', targetType: 'company', targetId: company_id, reason: 'NOT_MEMBER' })
            return NextResponse.json({ error: 'You are not an active member of this company' }, { status: 403 })
        }

        // 3. Update user_settings
        const { error: updateError } = await supabase
            .from('user_settings' as any)
            .upsert({
                user_id: user.id,
                active_company_id: company_id,
                updated_at: new Date().toISOString()
            } as any)

        if (updateError) {
            console.error('Set active company error:', updateError)
            return NextResponse.json({ error: 'Failed to update active company' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            active_company_id: company_id,
            role: membership.role
        })

    } catch (error: any) {
        console.error('Set active company API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
