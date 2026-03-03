'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { formatCurrency, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { StatCardSkeleton } from '@/components/ui/loading'
import { PendingInvites } from '@/components/dashboard/PendingInvites'
import {
    Users,
    FolderKanban,
    FileText,
    ListTodo,
    TrendingUp,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    Target,
    Percent,
    Zap,
    AlertCircle,
    Info,
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts'

interface DashboardStats {
    totalCustomers: number
    activeProjects: number
    pendingOffers: number
    pendingTasks: number
    overdueTasks: number
    totalBudget: number
    // Some stats are fetched separately now
    completionRate: number
    avgOfferAmount: number
    totalTasks: number
    completedTasks: number
    approvedOffers: number
    totalOffers: number
}

interface MonthlyData {
    month: string
    projects: number
    revenue: number
}

interface RecentActivity {
    id: string
    type: string
    title: string
    status: string
    created_at: string
}

interface Insight {
    type: 'warning' | 'info' | 'success'
    message: string
}

export default function DashboardPage() {
    const { user } = useAuthStore()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [insights, setInsights] = useState<Insight[]>([])
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingSecondary, setLoadingSecondary] = useState(true)

    const fetchDashboardData = useCallback(async () => {
        if (!user) return

        try {
            setLoading(true)

            // Single request — combines summary + activity in one RTT
            const res = await fetch('/api/dashboard/bootstrap')
            if (!res.ok) throw new Error('Dashboard fetch failed')
            const data = await res.json()

            if (data.stats) {
                setStats({
                    totalCustomers: data.stats.totalCustomers || 0,
                    activeProjects: data.stats.activeProjects || 0,
                    pendingOffers: data.stats.pendingOffers || 0,
                    pendingTasks: data.stats.pendingTasks || 0,
                    overdueTasks: data.stats.overdueTasks || 0,
                    totalBudget: data.stats.totalBudget || 0,
                    avgOfferAmount: data.stats.avgOfferAmount || 0,
                    completionRate: 0,
                    totalTasks: 0,
                    completedTasks: 0,
                    approvedOffers: 0,
                    totalOffers: 0,
                })

                const { overdueTasks, pendingOffers: po } = data.stats
                const newInsights: Insight[] = []
                if (overdueTasks > 0) newInsights.push({ type: 'warning', message: `${overdueTasks} görev gecikmiş durumda. Takviminizi önceliklendirin.` })
                if (po > 3) newInsights.push({ type: 'info', message: `${po} bekleyen teklif var. Takip araması yapma zamanı!` })
                setInsights(newInsights)
            }

            setMonthlyData(data.monthlyData || [])
            setRecentActivities(data.recentActivities || [])

        } catch (err) {
            console.error('Dashboard fetch error:', err)
            toast.error('Veriler yüklenemedi')
        } finally {
            setLoading(false)
            setLoadingSecondary(false)
        }

    }, [user])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    useEffect(() => {
        if (stats && stats.overdueTasks > 0) {
            toast(`Dikkat! ${stats.overdueTasks} gecikmiş göreviniz var.`, {
                icon: '🚨',
                duration: 6000,
                position: 'top-center',
                style: {
                    border: '1px solid var(--color-danger)',
                    color: 'var(--color-danger)',
                    background: 'var(--color-surface-1)',
                },
            })
        }
    }, [stats?.overdueTasks]) // Only trigger if overdue count changes

    const statCards = stats
        ? [
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
        : []

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Pending Invitations Alert - ADDED THIS */}
            <PendingInvites />

            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-0)' }}>
                        Merhaba, {user?.full_name?.split(' ')[0]} 👋
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>
                        İşte bugünkü özet durumunuz.
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                    : statCards.map((card: any, i) => {
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

            {/* Smart Insights Widget */}
            {insights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {insights.map((insight, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border animate-fade-in group hover:scale-[1.01] transition-transform cursor-default"
                            style={{
                                background: 'var(--color-surface-1)',
                                borderColor: insight.type === 'warning' ? 'rgba(255,56,96,0.3)' :
                                    insight.type === 'success' ? 'rgba(34,197,94,0.3)' :
                                        'var(--color-border)',
                                animationDelay: `${400 + (i * 100)}ms`
                            }}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${insight.type === 'warning' ? 'bg-red-500/10 text-red-500' :
                                insight.type === 'success' ? 'bg-green-500/10 text-green-500' :
                                    'bg-blue-500/10 text-blue-500'
                                }`}>
                                {insight.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                                    insight.type === 'success' ? <Zap className="w-5 h-5" /> :
                                        <Info className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text-0)' }}>
                                    {insight.type === 'warning' ? 'Eylem Gerekiyor' :
                                        insight.type === 'success' ? 'Harika İş!' :
                                            'Sistem Tavsiyesi'}
                                </h4>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-2)' }}>
                                    {insight.message}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Projects Chart */}
                <div
                    className="lg:col-span-2 p-6 rounded-xl"
                    style={{
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--color-text-0)' }}>
                                Aylık Proje Grafiği
                            </h3>
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                                {new Date().getFullYear()} yılı proje dağılımı
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                                Bu yıl
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey="month"
                                stroke="var(--color-text-3)"
                                fontSize={11}
                                fontFamily="Plus Jakarta Sans"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="var(--color-text-3)"
                                fontSize={11}
                                fontFamily="Plus Jakarta Sans"
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontFamily: 'Plus Jakarta Sans',
                                    color: 'var(--color-text-0)',
                                }}
                                itemStyle={{ color: 'var(--color-text-0)' }}
                                labelStyle={{ color: 'var(--color-text-2)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="projects"
                                stroke="var(--color-accent)"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorProjects)"
                                name="Projeler"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Budget Overview */}
                <div
                    className="p-6 rounded-xl"
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
                            {stats ? formatCurrency(stats.totalBudget) : '—'}
                        </p>
                        <p className="text-xs mt-2" style={{ color: 'var(--color-text-3)' }}>
                            Toplam Proje Bütçesi
                        </p>
                    </div>
                    {/* Progress charts removed during refactoring for high performance - to be implemented safely if requested */}
                </div>
            </div>

            {/* Recent Activities & Revenue Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activities */}
                <div
                    className="p-6 rounded-xl"
                    style={{
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <h3 className="font-bold mb-4" style={{ color: 'var(--color-text-0)' }}>
                        Son Projeler
                    </h3>
                    <div className="space-y-3">
                        {recentActivities.length === 0 && !loading ? (
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
                                                background:
                                                    activity.status === 'completed'
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

                {/* Revenue Chart */}
                <div
                    className="p-6 rounded-xl"
                    style={{
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <h3 className="font-bold mb-6" style={{ color: 'var(--color-text-0)' }}>
                        Aylık Gelir
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                                dataKey="month"
                                stroke="var(--color-text-3)"
                                fontSize={11}
                                fontFamily="Plus Jakarta Sans"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="var(--color-text-3)"
                                fontSize={11}
                                fontFamily="Plus Jakarta Sans"
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                formatter={(value) => [formatCurrency(value as number), 'Gelir']}
                                contentStyle={{
                                    background: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontFamily: 'Plus Jakarta Sans',
                                    color: 'var(--color-text-0)',
                                }}
                                itemStyle={{ color: 'var(--color-text-0)' }}
                                labelStyle={{ color: 'var(--color-text-2)' }}
                            />
                            <Bar
                                dataKey="revenue"
                                fill="var(--color-accent)"
                                radius={[4, 4, 0, 0]}
                                name="Gelir"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Staff Performance */}
            <StaffPerformance />
        </div >
    )
}

function StaffPerformance() {
    const { user } = useAuthStore()
    const [staff, setStaff] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            if (!user?.active_company_id) return
            const supabase = createClient()

            // Get company users correctly via members table
            const { data: membersData } = await supabase
                .from('members')
                .select(`
                    role,
                    users:users!members_user_id_fkey (
                        id,
                        full_name,
                        avatar_url,
                        role
                    )
                `)
                .eq('company_id', user.active_company_id)
                .eq('status', 'active')

            if (!membersData) { setLoading(false); return }

            const users = membersData.map(m => ({
                id: (m.users as any).id,
                full_name: (m.users as any).full_name,
                avatar_url: (m.users as any).avatar_url,
                role: m.role // Use member role
            }))

            // Get all tasks for performance calc
            const { data: tasks } = await supabase
                .from('tasks')
                .select('assigned_to, status')
                .eq('company_id', user.active_company_id)

            const taskList = tasks || []

            const staffData = users.map(u => {
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

            setStaff(staffData)
            setLoading(false)
        }
        fetch()
    }, [user])

    if (loading) return null

    return (
        <div
            className="p-6 rounded-xl"
            style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
            }}
        >
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                <Users className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                Ekip Performansı
            </h3>
            {staff.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-3)' }}>Ekip üyesi yok</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <th className="pb-3 font-medium" style={{ color: 'var(--color-text-3)' }}>Üye</th>
                                <th className="pb-3 font-medium text-center" style={{ color: 'var(--color-text-3)' }}>Görev</th>
                                <th className="pb-3 font-medium text-center" style={{ color: 'var(--color-text-3)' }}>Biten</th>
                                <th className="pb-3 font-medium" style={{ color: 'var(--color-text-3)' }}>Oran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((s, i) => (
                                <tr
                                    key={s.id}
                                    className="animate-fade-in"
                                    style={{
                                        borderBottom: i < staff.length - 1 ? '1px solid var(--color-border)' : undefined,
                                        animationDelay: `${i * 60}ms`,
                                    }}
                                >
                                    <td className="py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                style={{
                                                    background: 'var(--color-accent-glow)',
                                                    color: 'var(--color-accent)',
                                                }}
                                            >
                                                {s.full_name?.charAt(0)}
                                            </div>
                                            <span style={{ color: 'var(--color-text-1)' }}>{s.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-center" style={{ color: 'var(--color-text-2)' }}>{s.totalTasks}</td>
                                    <td className="py-3 text-center" style={{ color: 'var(--color-text-2)' }}>{s.completedTasks}</td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-3)', maxWidth: 80 }}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${s.rate}%`,
                                                        background: s.rate >= 70 ? 'var(--color-accent)' : s.rate >= 40 ? 'var(--color-warn)' : 'var(--color-danger)',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--color-text-2)' }}>
                                                %{s.rate}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
