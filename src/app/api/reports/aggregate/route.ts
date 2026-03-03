import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/server-context'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const ctx = await getUserContext()

        if (!ctx || !ctx.companyId) {
            return NextResponse.json({ error: 'Unauthorized or missing company context' }, { status: 401 })
        }

        const supabase = await createClient()
        const activeCompanyId = ctx.companyId

        const { searchParams } = new URL(req.url)
        const yearParam = searchParams.get('year')

        let startDate: string
        let endDate: string
        let targetYear: number

        if (yearParam && !isNaN(parseInt(yearParam, 10))) {
            targetYear = parseInt(yearParam, 10)
            startDate = new Date(targetYear, 0, 1).toISOString()
            endDate = new Date(targetYear, 11, 31, 23, 59, 59).toISOString()
        } else {
            const end = new Date()
            const start = new Date()
            start.setDate(end.getDate() - 30) // Default last 30 days fallback
            startDate = start.toISOString()
            endDate = end.toISOString()
            targetYear = end.getFullYear()
        }

        // Fetch within ranges
        const [projectsRes, offersRes] = await Promise.all([
            supabase
                .from('projects')
                .select('budget, status, created_at')
                .eq('company_id', activeCompanyId)
                .gte('created_at', startDate)
                .lte('created_at', endDate),
            supabase
                .from('offers')
                .select('amount, status, created_at')
                .eq('company_id', activeCompanyId)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
        ])

        const projects = projectsRes.data || []
        const offers = offersRes.data || []

        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

        const monthlyStats = months.map((month, i) => {
            const monthProjects = projects.filter((p: any) => new Date(p.created_at).getMonth() === i && new Date(p.created_at).getFullYear() === targetYear)
            const monthOffers = offers.filter((o: any) => new Date(o.created_at).getMonth() === i && new Date(o.created_at).getFullYear() === targetYear)

            return {
                name: month,
                revenue: monthProjects.reduce((sum: number, p: any) => sum + (p.budget || 0), 0),
                potential: monthOffers.reduce((sum: number, o: any) => sum + (o.amount || 0), 0),
            }
        })

        const statusCounts = projects.reduce((acc: any, p) => {
            const status = p.status || 'unknown'
            acc[status] = (acc[status] || 0) + 1
            return acc
        }, {})

        const statusChartData = [
            { name: 'Devam Eden', value: statusCounts['in_progress'] || 0, color: 'var(--color-info)' },
            { name: 'Tamamlanan', value: statusCounts['completed'] || 0, color: 'var(--color-success)' },
            { name: 'İptal', value: statusCounts['cancelled'] || 0, color: 'var(--color-danger)' },
            { name: 'Beklemede', value: statusCounts['on_hold'] || 0, color: 'var(--color-warn)' },
        ].filter(i => i.value > 0)

        const conversionStats = months.slice(0, new Date().getMonth() + 1).map((month, i) => {
            const monthOffers = offers.filter((o: any) => new Date(o.created_at).getMonth() === i && new Date(o.created_at).getFullYear() === targetYear)
            const total = monthOffers.length
            const approved = monthOffers.filter((o: any) => o.status === 'approved').length

            return {
                name: month,
                rate: total > 0 ? Math.round((approved / total) * 100) : 0,
                total,
                approved
            }
        })

        return NextResponse.json({
            monthlyData: monthlyStats,
            statusData: statusChartData,
            offerConversionData: conversionStats
        })
    } catch (error) {
        console.error('Reports aggregate API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
