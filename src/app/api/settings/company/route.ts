import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
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

        const { data: company, error } = await supabase
            .from('companies')
            .select('id, name, logo_url, seat_limit, status')
            .eq('id', profile.company_id)
            .single()

        if (error) {
            return NextResponse.json({ error: 'Database fetch error' }, { status: 500 })
        }

        return NextResponse.json({ company })
    } catch (error) {
        console.error('Settings company GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.rpc('ensure_user_context').maybeSingle()
        if (!profile || !profile.company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        // Check role
        if (profile.role !== 'admin' && profile.role !== 'owner') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const body = await req.json()
        const { name, logo_url } = body

        // old company
        const { data: oldCompany } = await supabase.from('companies').select('name, logo_url').eq('id', profile.company_id).single()

        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (logo_url !== undefined) updateData.logo_url = logo_url

        const { error } = await supabase
            .from('companies')
            .update(updateData)
            .eq('id', profile.company_id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // calc diff
        const changes: any[] = []
        if (oldCompany) {
            if (name !== undefined && oldCompany.name !== name) {
                changes.push({ field: 'name', old: oldCompany.name, new: name })
            }
            if (logo_url !== undefined && oldCompany.logo_url !== logo_url) {
                changes.push({ field: 'logo_url', old: oldCompany.logo_url, new: logo_url })
            }
        }

        if (changes.length > 0) {
            await logAudit({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabase: supabase as any,
                companyId: profile.company_id,
                actorUserId: user.id,
                action: 'COMPANY_SETTINGS_UPDATED',
                targetType: 'company',
                targetId: profile.company_id,
                severity: 'info',
                metadata: {
                    context: { updated_by: user.email },
                    changes
                }
            })
        }

        return NextResponse.json({ success: true, changes })

    } catch (error) {
        console.error('Settings company PATCH error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
