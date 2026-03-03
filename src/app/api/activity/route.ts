import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/server-context'
import { logPermissionDenied } from '@/lib/permission-audit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const ctx = await getUserContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        const { searchParams } = new URL(req.url)
        const limitStr = searchParams.get('limit') || '50'
        let limit = parseInt(limitStr, 10)
        if (limit > 100) limit = 100 // clamp max 100

        const cursor = searchParams.get('cursor')
        const q = searchParams.get('q')
        const severity = searchParams.get('severity')
        const type = searchParams.get('type')

        let query = supabase
            .from('activity_events')
            .select(`
                id, created_at, severity, title, summary, event_type, actor_user_id,
                actor:users!activity_events_actor_user_id_fkey(full_name, avatar_url)
            `)
            .eq('company_id', ctx.companyId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (cursor) {
            query = query.lt('created_at', cursor)
        }

        if (q && q.trim() !== '') {
            query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
        }

        if (severity && severity !== 'ALL') {
            query = query.eq('severity', severity)
        }

        if (type && type !== 'ALL') {
            query = query.eq('event_type', type)
        }

        const { data, error } = await query

        if (error) {
            console.error('Activity fetch error:', error)
            return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
        }

        return NextResponse.json({ events: data })

    } catch (e) {
        console.error('API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
