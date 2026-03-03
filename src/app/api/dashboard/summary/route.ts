import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/server-context'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const ctx = await getUserContext()
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()
        const companyId = ctx.companyId
        const today = new Date().toISOString()

        const [
            { count: totalCustomers },
            { count: activeProjects },
            { count: pendingOffers },
            { count: pendingTasks },
            { count: overdueTasks },
        ] = await Promise.all([
            supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
            supabase.from('projects').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'in_progress'),
            supabase.from('offers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['todo', 'doing']),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('company_id', companyId).lt('due_date', today).neq('status', 'done'),
        ])

        return NextResponse.json({
            stats: {
                totalCustomers: totalCustomers || 0,
                activeProjects: activeProjects || 0,
                pendingOffers: pendingOffers || 0,
                pendingTasks: pendingTasks || 0,
                overdueTasks: overdueTasks || 0,
            }
        })
    } catch (error: any) {
        console.error('Dashboard summary error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
