import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit, sanitizeAuditMetadata } from '@/lib/audit'
import { logPermissionDenied } from '@/lib/permission-audit'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase.rpc('ensure_user_context').maybeSingle()

        if (!profile || !profile.company_id) {
            await logPermissionDenied({ endpoint: '/api/audit/export', targetType: 'audit_logs', reason: 'NO_COMPANY_CONTEXT' })
            return NextResponse.json({ error: 'Company context required' }, { status: 403 })
        }

        if (profile.role !== 'admin' && profile.role !== 'owner') {
            await logPermissionDenied({ endpoint: '/api/audit/export', targetType: 'audit_logs', requiredRole: 'admin', reason: 'NOT_ADMIN' })
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
        }

        // Rate limit: max 3 exports per 5 minutes
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { count: recentExports } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', profile.company_id)
            .eq('actor_user_id', user.id)
            .eq('action', 'EXPORT_DOWNLOADED')
            .gte('created_at', fiveMinAgo)

        if ((recentExports || 0) >= 3) {
            await logPermissionDenied({ endpoint: '/api/audit/export', targetType: 'audit_logs', reason: 'RATE_LIMIT' })
            return NextResponse.json({ error: 'Rate limit exceeded. Max 3 exports per 5 minutes.' }, { status: 429 })
        }

        // Generate CSV Export
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000)

        if (error) {
            console.error('Audit export error:', error)
            return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
        }

        // IP masking in export CSV
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const csvContent = "id,created_at,actor_user_id,action,target_type,target_id,ip,severity,metadata\n" +
            (data || []).map((row: any) => {
                const safeMetadata = sanitizeAuditMetadata(row.action, row.metadata)
                const safeMetaStr = safeMetadata ? JSON.stringify(safeMetadata).replace(/"/g, '""') : '{}'
                const maskedIp = row.ip ? row.ip.replace(/\.\d+\.\d+$/, '.xxx.xxx') : ''
                return `"${row.id}","${row.created_at}","${row.actor_user_id}","${row.action}","${row.target_type}","${row.target_id}","${maskedIp}","${row.severity || 'info'}","${safeMetaStr}"`
            }).join('\n')

        // Log the export action
        await logAudit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase: supabase as any,
            companyId: profile.company_id,
            actorUserId: user.id,
            action: 'EXPORT_DOWNLOADED',
            targetType: 'audit_logs',
            metadata: {
                context: {
                    format: 'csv',
                    row_count: data?.length || 0
                }
            }
        })

        const headers = new Headers()
        headers.set('Content-Type', 'text/csv')
        headers.set('Content-Disposition', `attachment; filename=audit_export_${new Date().toISOString().split('T')[0]}.csv`)

        return new NextResponse(csvContent, { status: 200, headers })

    } catch (e) {
        console.error('Audit Export API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
