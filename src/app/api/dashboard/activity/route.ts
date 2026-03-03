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

        const [projectsResult, recentResult, offerAggResult] = await Promise.all([
            supabase
                .from('projects')
                .select('budget, created_at')
                .eq('company_id', companyId)
                .gte('created_at', yearStart)
                .order('created_at', { ascending: true }),

            supabase
                .from('projects')
                .select('id, title, status, created_at')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(10),

            (supabase as any).rpc('fn_offer_aggregate', { p_company_id: companyId }),
        ])

        const financialData = projectsResult.data || []
        const recentProjects = recentResult.data || []
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

        const recentActivities = recentProjects.map((p: any) => ({
            id: p.id, type: 'project', title: p.title, status: p.status, created_at: p.created_at,
        }))

        return NextResponse.json({ recentActivities, monthlyData, totalBudget, avgOfferAmount })
    } catch (error: any) {
        console.error('Dashboard activity error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
