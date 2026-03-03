import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.rpc('ensure_user_context').maybeSingle()
        if (!profile) return NextResponse.json({ error: 'Context required' }, { status: 403 })

        const body = await req.json()
        const { action, reason, companyId } = body

        if (action === 'deactivate_user') {
            const { error } = await supabase.rpc('deactivate_user', { reason: reason || '' })
            if (error) throw error

            await logAudit({
                supabase: supabase as any,
                actorUserId: user.id,
                companyId: profile.company_id,
                action: 'USER_DEACTIVATED',
                targetType: 'user',
                targetId: user.id,
                severity: 'warning',
                metadata: { reason }
            })
            return NextResponse.json({ success: true })
        }

        if (action === 'delete_user') {
            const { error } = await supabase.rpc('hard_delete_user')
            if (error) throw error

            await logAudit({
                supabase: supabase as any,
                actorUserId: user.id,
                companyId: profile.company_id,
                action: 'USER_HARD_DELETED',
                targetType: 'user',
                targetId: user.id,
                severity: 'critical'
            })
            return NextResponse.json({ success: true })
        }

        // Company admin validations
        if (profile.role !== 'owner') {
            return NextResponse.json({ error: 'Only owners can manage company destruction protocols' }, { status: 403 })
        }

        if (action === 'archive_company') {
            const { error } = await supabase.rpc('archive_company', { target_company_id: companyId })
            if (error) throw error

            await logAudit({
                supabase: supabase as any,
                actorUserId: user.id,
                companyId: companyId,
                action: 'COMPANY_ARCHIVED',
                targetType: 'company',
                targetId: companyId,
                severity: 'critical'
            })
            return NextResponse.json({ success: true })
        }

        if (action === 'delete_company') {
            const { error } = await supabase.rpc('hard_delete_company', { target_company_id: companyId })
            if (error) throw error

            await logAudit({
                supabase: supabase as any,
                actorUserId: user.id,
                companyId: companyId,
                action: 'COMPANY_HARD_DELETED',
                targetType: 'company',
                targetId: companyId,
                severity: 'critical'
            })
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error: any) {
        console.error('Danger zone error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
