import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/server-context'

export interface DashboardData {
    stats: {
        totalCustomers: number
        activeProjects: number
        pendingOffers: number
        pendingTasks: number
        overdueTasks: number
        totalBudget: number
        avgOfferAmount: number
    }
    recentActivities: any[]
    monthlyData: any[]
    insights: { type: 'warning' | 'info' | 'success', message: string }[]
    staffPerformance: any[]
}

export async function getDashboardData(): Promise<DashboardData | null> {
    const ctx = await getUserContext()
    if (!ctx || !ctx.companyId) return null

    const supabase = await createClient()
    const companyId = ctx.companyId
    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`

    // All data queries in parallel
    const [
        kpiResult,
        projectsFinancialResult,
        recentProjectsResult,
        offerAggResult,
        membersDataResult,
        tasksResult
    ] = await Promise.all([
        (supabase as any).rpc('fn_dashboard_kpi', { p_company_id: companyId }),
        supabase.from('projects').select('budget, created_at').eq('company_id', companyId).gte('created_at', yearStart).order('created_at', { ascending: true }),
        supabase.from('projects').select('id, title, status, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(10),
        (supabase as any).rpc('fn_offer_aggregate', { p_company_id: companyId }),
        supabase.from('members').select(`role, user_id, users:users!members_user_id_fkey(id, full_name, avatar_url)`).eq('company_id', companyId).eq('status', 'active'),
        supabase.from('tasks').select('assigned_to, status').eq('company_id', companyId)
    ])

    const kpi = kpiResult.data || {}
    const financialData = projectsFinancialResult.data || []
    const recentProjects = recentProjectsResult.data || []
    const offerAgg = offerAggResult.data || { total: 0, count: 0 }

    // Performance calculation
    const users = (membersDataResult.data || []).map((m: any) => ({
        id: (m.users as any)?.id || m.user_id,
        full_name: (m.users as any)?.full_name,
        avatar_url: (m.users as any)?.avatar_url,
        role: m.role
    }))
    const taskList = tasksResult.data || []

    const staffPerformance = users.map(u => {
        const userTasks = taskList.filter(t => t.assigned_to === u.id)
        const done = userTasks.filter(t => t.status === 'done').length
        const total = userTasks.length
        return {
            ...u,
            totalTasks: total,
            completedTasks: done,
            rate: total > 0 ? Math.round((done / total) * 100) : 0,
        }
    }).sort((a, b) => b.rate - a.rate)


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

    const stats = {
        totalCustomers: kpi.total_customers || 0,
        activeProjects: kpi.active_projects || 0,
        pendingOffers: kpi.pending_offers || 0,
        pendingTasks: kpi.pending_tasks || 0,
        overdueTasks: kpi.overdue_tasks || 0,
        totalBudget,
        avgOfferAmount,
    }

    const insights: { type: 'warning' | 'info' | 'success', message: string }[] = []
    if (stats.overdueTasks > 0) insights.push({ type: 'warning', message: `${stats.overdueTasks} görev gecikmiş durumda. Takviminizi önceliklendirin.` })
    if (stats.pendingOffers > 3) insights.push({ type: 'info', message: `${stats.pendingOffers} bekleyen teklif var. Takip araması yapma zamanı!` })

    return {
        stats,
        recentActivities: recentProjects.map((p: any) => ({
            id: p.id, type: 'project', title: p.title, status: p.status, created_at: p.created_at,
        })),
        monthlyData,
        insights,
        staffPerformance
    }
}
