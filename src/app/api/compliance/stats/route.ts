import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logPermissionDenied } from '@/lib/permission-audit'
import { getUserContext } from '@/lib/server-context'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const ctx = await getUserContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!ctx.companyId) {
            await logPermissionDenied({ endpoint: '/api/compliance/stats', method: 'GET', targetType: 'compliance', reason: 'NO_COMPANY_CONTEXT' })
            return NextResponse.json({ error: 'Company context required' }, { status: 403 })
        }

        if (ctx.role !== 'admin' && ctx.role !== 'owner') {
            await logPermissionDenied({ endpoint: '/api/compliance/stats', method: 'GET', targetType: 'compliance', requiredRole: 'admin', reason: 'NOT_ADMIN' })
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const supabase = await createClient()
        const companyId = ctx.companyId

        // Tek sorgu: tüm audit_logs metrikleri + compliance status paralel
        const [aggregateResult, failedLoginsResult, complianceStatusResult] = await Promise.all([
            (supabase as any).rpc('fn_compliance_aggregate', { p_company_id: companyId }),
            (supabase as any).rpc('fn_count_failed_logins', { p_company_id: companyId }),
            (supabase as any).rpc('fn_get_compliance_status'),
        ])

        const agg = aggregateResult.data || {}
        const failedLogins24h = failedLoginsResult.data || 0
        const complianceStatus = complianceStatusResult.data || {}

        const isCronActive = !!complianceStatus.is_retention_cron_active
        const isImmutableActive = !!complianceStatus.is_immutable_trigger_active

        return NextResponse.json({
            totalAuditLogs: agg.total_audit_logs || 0,
            last24hCritical: agg.last24h_critical || 0,
            last24hWarning: agg.last24h_warning || 0,
            permissionDenied24h: agg.permission_denied || 0,
            failedLogins24h: failedLogins24h || 0,
            auditRetention: '2 Yıl',
            activityRetention: isCronActive ? '180 Gün (Otomatik)' : '180 Gün (Manuel)',
            immutablePolicy: isImmutableActive,
            piiSanitized: true,
            exportSanitized: true,
        })
    } catch (e) {
        console.error('Compliance stats error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
