import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { headers } from 'next/headers'

interface PermissionDeniedParams {
    endpoint: string
    method?: string
    targetType: string
    targetId?: string | null
    requiredRole?: string
    reason: string
    requestId?: string | null
}

/**
 * Logs a PERMISSION_DENIED audit event.
 * Call at every deny point in API routes and server actions.
 * Non-throwing — never breaks the response flow.
 */
export async function logPermissionDenied({
    endpoint,
    method = 'POST',
    targetType,
    targetId,
    requiredRole,
    reason,
    requestId
}: PermissionDeniedParams) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || null
        const userAgent = headersList.get('user-agent') || null

        // Try to resolve company context
        let companyId: string | null = null
        let userId: string | null = user?.id || null

        if (user) {
            const { data: profile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single()
            companyId = profile?.company_id || null
        }

        if (!companyId) return // Can't log without company scope

        await logAudit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase: supabase as any,
            companyId,
            actorUserId: userId,
            action: 'PERMISSION_DENIED',
            targetType,
            targetId: targetId || null,
            severity: 'warning',
            ip,
            userAgent,
            requestId: requestId || null,
            metadata: {
                context: {
                    endpoint,
                    method,
                    required_role: requiredRole || null,
                    reason
                }
            }
        })
    } catch (e) {
        console.error('Permission denied audit error:', e)
    }
}
