import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sanitizeAuditMetadata } from '@/lib/audit'
import { logPermissionDenied } from '@/lib/permission-audit'
import { getUserContext } from '@/lib/server-context'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const ctx = await getUserContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (ctx.role !== 'admin' && ctx.role !== 'owner') {
            await logPermissionDenied({ endpoint: '/api/audit', method: 'GET', targetType: 'audit_logs', requiredRole: 'admin', reason: 'NOT_ADMIN' })
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
        }

        const supabase = await createClient()

        const { searchParams } = new URL(req.url)
        const limitStr = searchParams.get('limit') || '100'
        const limit = parseInt(limitStr, 10)

        const { data, error } = await (supabase as any)
            .from('audit_logs')
            .select(`*, actor:users!audit_logs_actor_user_id_fkey(full_name, email)`)
            .eq('company_id', ctx.companyId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Audit fetch error:', error)
            return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
        }

        const sanitizedLogs = (data as any[])?.map((log: any) => ({
            ...log,
            metadata: sanitizeAuditMetadata(log.action, log.metadata)
        }))

        return NextResponse.json({ logs: sanitizedLogs })

    } catch (e) {
        console.error('API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
