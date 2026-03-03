/**
 * Combined dashboard endpoint — single client round-trip.
 * Auth (getUser + fn_fast_user_context) parallel in Wave 1.
 * All data queries parallel in Wave 2.
 * KPIs via fn_dashboard_kpi (single DB pass instead of 5 COUNT queries).
 */

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
        const currentYear = new Date().getFullYear()
        const yearStart = `${currentYear}-01-01`

        // All data queries in parallel — single DB connection wave
        const [kpiResult, projectsFinancialResult, recentProjectsResult, offerAggResult] = await Promise.all([
            // 5 counts → 1 single-pass DB function
            (supabase as any).rpc('fn_dashboard_kpi', { p_company_id: companyId }),

            // Financial chart data (current year only)
            supabase
                .from('projects')
                .select('budget, created_at')
                .eq('company_id', companyId)
                .gte('created_at', yearStart)
                .order('created_at', { ascending: true }),

            // Recent projects list
            supabase
                .from('projects')
                .select('id, title, status, created_at')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(10),

            // Offer aggregate
            (supabase as any).rpc('fn_offer_aggregate', { p_company_id: companyId }),
        ])

        const kpi = kpiResult.data || {}
        const financialData = projectsFinancialResult.data || []
        const recentProjects = recentProjectsResult.data || []
        const offerAgg = offerAggResult.data || { total: 0, count: 0 }

        const totalBudget = financialData.reduce((s: number, p: any) => s + (p.budget || 0), 0)
        const avgOfferAmount = offerAgg.count > 0 ? Math.round(offerAgg.total / offerAgg.count) : 0

        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
        const monthlyData = months.map((month, i) => {
            const mp = financialData.filter((p: any) => new Date(p.created_at).getMonth() === i)
            return {
                month,
                projects: mp.length,
                revenue: mp.reduce((s: number, p: any) => s + (p.budget || 0), 0),
            }
        })

        return NextResponse.json({
            stats: {
                totalCustomers: kpi.total_customers || 0,
                activeProjects: kpi.active_projects || 0,
                pendingOffers: kpi.pending_offers || 0,
                pendingTasks: kpi.pending_tasks || 0,
                overdueTasks: kpi.overdue_tasks || 0,
                totalBudget,
                avgOfferAmount,
            },
            recentActivities: recentProjects.map((p: any) => ({
                id: p.id, type: 'project', title: p.title, status: p.status, created_at: p.created_at,
            })),
            monthlyData,
        })
    } catch (error: any) {
        console.error('Dashboard bootstrap error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
