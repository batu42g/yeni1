import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/server-context'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const ctx = await getUserContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()
        const activeCompanyId = ctx.companyId

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') || 'customers'
        const limitStr = searchParams.get('limit') || '50'
        const limit = Math.min(parseInt(limitStr, 10), 100)
        const cursor = searchParams.get('cursor') // expects ISO date string deleted_at
        const q = searchParams.get('q')

        const selectMap: Record<string, string> = {
            customers: 'id, name, status, deleted_at, created_at',
            projects: 'id, title, status, deleted_at, created_at',
            tasks: 'id, title, status, deleted_at, created_at',
            offers: 'id, amount, status, deleted_at, created_at',
        }

        if (!selectMap[type]) {
            return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
        }

        let query = (supabase as any)
            .from(type)
            .select(selectMap[type])
            .eq('company_id', activeCompanyId)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })
            .limit(limit)

        if (cursor) {
            query = query.lt('deleted_at', cursor)
        }

        if (q) {
            const searchField = type === 'customers' ? 'name' : (type === 'offers' ? 'id' : 'title');
            if (type === 'offers') {
                // Text search on a UUID is tricky, maybe skip or map correctly. We will skip for UUIDs unless casted.
                // For offers we could search by amount if needed, but ilike mostly applies to text.
                // By default no ilike on offers
            } else {
                query = query.ilike(searchField, `%${q}%`)
            }
        }

        const { data, error } = await query

        if (error) {
            console.error('Trash fetch error:', error)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Parse return to common DeletedItem format
        const items = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            title: item.title,
            amount: item.amount,
            status: item.status,
            deleted_at: item.deleted_at,
            created_at: item.created_at
        }))

        return NextResponse.json({ items })

    } catch (error) {
        console.error('Trash API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
