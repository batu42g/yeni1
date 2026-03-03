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
        const { companyId } = body

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
        }

        // 2. Verify Membership
        // Check if user is an active member or owner of the target company
        const { data: membership } = await supabase
            .from('members')
            .select('role')
            .eq('user_id', user.id)
            .eq('company_id', companyId)
            .in('status', ['active']) // Only allow switching to active memberships
            .single()

        if (!membership) {
            await logPermissionDenied({ endpoint: '/api/user/switch-company', targetType: 'company', targetId: companyId, reason: 'NOT_MEMBER' })
            return NextResponse.json({ error: 'You are not an active member of this company' }, { status: 403 })
        }

        // 3. Update Active Context (user_settings.active_company_id)
        const { error: updateError } = await supabase
            .from('user_settings' as any)
            .upsert({
                user_id: user.id,
                active_company_id: companyId,
                updated_at: new Date().toISOString()
            } as any)

        if (updateError) {
            console.error('Switch company error:', updateError)
            return NextResponse.json({ error: 'Failed to switch company' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Switch company error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
