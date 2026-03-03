import { formatCurrency, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { getDashboardData } from '@/lib/services/dashboard'
import { DashboardCharts, RevenueChart } from '@/components/dashboard/DashboardCharts'
import { InsightsToast } from '@/components/dashboard/InsightsToast'
import { StaffPerformanceList } from '@/components/dashboard/StaffPerformanceList'
import {
    Users,
    FolderKanban,
    FileText,
    ListTodo,
    ArrowUpRight,
} from 'lucide-react'

export default async function DashboardContent() {
    const data = await getDashboardData()

    if (!data) return null

    const { stats, insights, monthlyData, recentActivities, staffPerformance } = data

    const statCards = [
        {
            label: 'Toplam Müşteri',
            value: stats.totalCustomers,
            icon: Users,
            color: 'var(--color-accent)',
            bg: 'var(--color-accent-glow)',
        },
        {
            label: 'Aktif Projeler',
            value: stats.activeProjects,
            icon: FolderKanban,
            color: 'var(--color-info)',
            bg: 'var(--color-info-dim)',
        },
        {
            label: 'Bekleyen Teklifler',
            value: stats.pendingOffers,
            icon: FileText,
            color: 'var(--color-warn)',
            bg: 'var(--color-warn-dim)',
        },
        {
            label: stats.overdueTasks > 0 ? 'Gecikmiş Görevler' : 'Açık Görevler',
            value: stats.overdueTasks > 0 ? stats.overdueTasks : stats.pendingTasks,
            icon: ListTodo,
            color: stats.overdueTasks > 0 ? 'var(--color-danger)' : '#a78bfa',
            bg: stats.overdueTasks > 0 ? 'rgba(255, 56, 96, 0.1)' : 'rgba(167, 139, 250, 0.12)',
            subValue: stats.overdueTasks > 0 ? `${stats.pendingTasks} toplam açık` : null
        },
    ]

    return (
        <div className="space-y-6">
            {/* Stat Cards - Fully Server Rendered */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={card.label}
                            className="stat-card animate-fade-in"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div
                                    className="flex items-center justify-center w-10 h-10 rounded-lg"
                                    style={{ background: card.bg }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                                </div>
                                <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
                            </div>
                            <p
                                className="text-2xl font-bold tabular-nums"
                                style={{ color: 'var(--color-text-0)' }}
                            >
                                {card.value}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                                <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                                    {card.label}
                                </p>
                                {card.subValue && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                        {card.subValue}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Smart Insights Toast & Widget - Client Component (for Toast side effect) */}
            <InsightsToast stats={stats} insights={insights} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recharts - Client Component */}
                <DashboardCharts monthlyData={monthlyData} />

                {/* Budget Overview - Fully Server Rendered */}
                <div
                    className="p-6 rounded-xl animate-fade-in"
                    style={{
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <h3 className="font-bold mb-6" style={{ color: 'var(--color-text-0)' }}>
                        Bütçe & Performans
                    </h3>
                    <div className="flex flex-col items-center justify-center h-32">
                        <p className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
                            {formatCurrency(stats.totalBudget)}
                        </p>
                        <p className="text-xs mt-2" style={{ color: 'var(--color-text-3)' }}>
                            Toplam Proje Bütçesi
                        </p>
                    </div>
                </div>
            </div>

            {/* Recent Activities & Revenue Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activities - Server Rendered */}
                <div
                    className="p-6 rounded-xl animate-fade-in"
                    style={{
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <h3 className="font-bold mb-4" style={{ color: 'var(--color-text-0)' }}>
                        Son Projeler
                    </h3>
                    <div className="space-y-3">
                        {recentActivities.length === 0 ? (
                            <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-3)' }}>
                                Henüz proje yok
                            </p>
                        ) : (
                            recentActivities.map((activity, i) => (
                                <div
                                    key={activity.id}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors duration-150 animate-fade-in"
                                    style={{
                                        background: 'var(--color-surface-2)',
                                        animationDelay: `${i * 60}ms`,
                                    }}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{
                                                background: activity.status === 'completed'
                                                    ? 'var(--color-accent)'
                                                    : activity.status === 'in_progress'
                                                        ? 'var(--color-info)'
                                                        : 'var(--color-warn)',
                                            }}
                                        />
                                        <span className="text-sm truncate" style={{ color: 'var(--color-text-1)' }}>
                                            {activity.title}
                                        </span>
                                    </div>
                                    <span className={`badge ${getStatusBadgeClass(activity.status)} shrink-0 ml-2`}>
                                        {getStatusLabel(activity.status)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Revenue Chart - Client Component */}
                <RevenueChart monthlyData={monthlyData} />
            </div>

            {/* Staff Performance */}
            <StaffPerformanceList staff={staffPerformance} />
        </div>
    )
}
