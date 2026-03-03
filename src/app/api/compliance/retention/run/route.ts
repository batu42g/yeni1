import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { logPermissionDenied } from '@/lib/permission-audit'

export async function POST() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase.rpc('ensure_user_context').maybeSingle()

        if (!profile || !profile.company_id) {
            await logPermissionDenied({ endpoint: '/api/compliance/retention/run', targetType: 'compliance', reason: 'NO_COMPANY_CONTEXT' })
            return NextResponse.json({ error: 'Company context required' }, { status: 403 })
        }

        if (profile.role !== 'admin' && profile.role !== 'owner') {
            await logPermissionDenied({ endpoint: '/api/compliance/retention/run', targetType: 'compliance', requiredRole: 'admin', reason: 'NOT_ADMIN' })
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Call the retention cleanup function
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: result, error } = await (supabase as any).rpc('fn_audit_retention_cleanup')

        if (error) {
            console.error('Retention cleanup error:', error)
            return NextResponse.json({ error: 'Retention cleanup failed' }, { status: 500 })
        }

        const resultData = result && typeof result === 'object' ? result : {}

        // Log the manual retention run
        await logAudit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase: supabase as any,
            companyId: profile.company_id,
            actorUserId: user.id,
            action: 'RETENTION_JOB_RUN',
            targetType: 'compliance',
            metadata: {
                context: {
                    trigger: 'manual',
                    ...resultData
                }
            }
        })

        return NextResponse.json({
            success: true,
            result: resultData,
            ran_at: new Date().toISOString()
        })
    } catch (e) {
        console.error('Retention run error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
