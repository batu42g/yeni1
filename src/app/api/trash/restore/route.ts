import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase.rpc('ensure_user_context').maybeSingle()

        if (!profile || !profile.company_id) {
            return NextResponse.json({ error: 'Company context required' }, { status: 403 })
        }

        const body = await req.json()
        const { type, id } = body

        if (!type || !id) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const allowedTypes = ['customers', 'projects', 'tasks', 'offers']
        if (!allowedTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
        }

        // Only owners / admins should restore? (Assumption based on requirements: "permission check admin/owner")
        if (profile.role !== 'owner' && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        // Restore -> set deleted_at to null
        const { error: updateError } = await (supabase as any)
            .from(type)
            .update({ deleted_at: null })
            .eq('id', id)
            .eq('company_id', profile.company_id)

        if (updateError) {
            console.error('Failed to restore:', updateError)
            return NextResponse.json({ error: 'Failed to restore entity' }, { status: 500 })
        }

        await logAudit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase: supabase as any,
            companyId: profile.company_id,
            actorUserId: user.id,
            action: 'ENTITY_RESTORED',
            targetType: type,
            targetId: id,
            severity: 'info',
            metadata: {
                context: {
                    action: 'RESTORE',
                    entity_type: type,
                    entity_id: id
                }
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Trash restore API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
