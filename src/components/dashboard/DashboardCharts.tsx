'use client'

import { formatCurrency } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'
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

interface MonthlyData {
    month: string
    projects: number
    revenue: number
}

interface Props {
    monthlyData: MonthlyData[]
}

export function DashboardCharts({ monthlyData }: Props) {
    return (
        <>
            {/* Monthly Projects Chart */}
            <div
                className="lg:col-span-2 p-6 rounded-xl animate-fade-in"
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

            {/* Revenue Chart - Need to be in the same or separate layout structure */}
            {/* Let's extract the Revenue Bar Chart as well for flexibility */}
        </>
    )
}

export function RevenueChart({ monthlyData }: Props) {
    return (
        <div
            className="p-6 rounded-xl animate-fade-in"
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
    )
}
