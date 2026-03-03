import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { getUserContext } from '@/lib/server-context'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const fullName = user.user_metadata?.full_name || ''
        const avatarUrl = user.user_metadata?.avatar_url || ''

        // mask email for standard
        const parts = user.email ? user.email.split('@') : ['', '']
        const emailMasked = parts[0].length > 2
            ? `${parts[0].slice(0, 2)}***@${parts[1]}`
            : `*@${parts[1]}`

        return NextResponse.json({
            full_name: fullName,
            avatar_url: avatarUrl,
            email_masked: emailMasked
        })
    } catch (error) {
        console.error('Settings user GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { full_name, avatar_url } = body

        // old user metas
        const oldName = user.user_metadata?.full_name
        const oldAvatar = user.user_metadata?.avatar_url

        const updateData: any = {}
        if (full_name !== undefined) updateData.full_name = full_name
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url

        const { error } = await supabase.auth.updateUser({
            data: updateData
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const ctx = await getUserContext()

        // diff
        const changes: any[] = []
        if (full_name !== undefined && oldName !== full_name) {
            changes.push({ field: 'full_name', old: oldName, new: full_name })
        }
        if (avatar_url !== undefined && oldAvatar !== avatar_url) {
            changes.push({ field: 'avatar_url', old: oldAvatar, new: avatar_url })
        }

        if (changes.length > 0 && ctx?.companyId) {
            await logAudit({
                supabase: supabase as any,
                companyId: ctx.companyId,
                actorUserId: user.id,
                action: 'USER_SETTINGS_UPDATED',
                targetType: 'user',
                targetId: user.id,
                severity: 'info',
                metadata: { context: {}, changes }
            })
        }

        return NextResponse.json({ success: true, changes })

    } catch (error) {
        console.error('Settings user PATCH error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
