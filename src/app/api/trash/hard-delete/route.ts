import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request) {
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

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')
        const id = searchParams.get('id')

        if (!type || !id) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const allowedTypes = ['customers', 'projects', 'tasks', 'offers']
        if (!allowedTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
        }

        // Owners ve adminler hard delete yapabilir
        if (profile.role !== 'owner' && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gerekiyor' }, { status: 403 })
        }

        // Hard Delete -> delete row
        const { error: deleteError } = await (supabase as any)
            .from(type)
            .delete()
            .eq('id', id)
            .eq('company_id', profile.company_id)

        if (deleteError) {
            console.error('Failed to hard delete:', deleteError)
            return NextResponse.json({ error: 'Failed to delete entity completely' }, { status: 500 })
        }

        await logAudit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase: supabase as any,
            companyId: profile.company_id,
            actorUserId: user.id,
            action: 'ENTITY_HARD_DELETED',
            targetType: type,
            targetId: id,
            severity: 'critical',
            metadata: {
                context: {
                    action: 'HARD_DELETE',
                    entity_type: type,
                    entity_id: id,
                    actor_role: profile.role
                }
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Trash hard delete API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
