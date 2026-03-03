'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts'
import { TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function FinancialChart({ data }: { data: any[] }) {
    return (
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Finansal Genel Bakış
                    </h3>
                    <p className="text-xs text-gray-500">Proje Gelirleri vs. Teklif Potansiyeli (Bu Yıl)</p>
                </div>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--color-text-3)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-text-3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₺${val / 1000}k`} />
                        <Tooltip
                            contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-0)' }}
                            itemStyle={{ color: 'var(--color-text-0)' }}
                            formatter={(val: number | undefined) => formatCurrency(val || 0)}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="potential" name="Teklif Potansiyeli" stroke="#6366f1" fillOpacity={1} fill="url(#colorPotential)" strokeWidth={2} />
                        <Area type="monotone" dataKey="revenue" name="Gerçekleşen Gelir" stroke="#22c55e" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export function StatusPieChart({ data }: { data: any[] }) {
    return (
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--color-text-0)' }}>
                <PieIcon className="w-5 h-5 text-amber-500" />
                Proje Durum Dağılımı
            </h3>
            <div className="h-[300px] w-full flex items-center justify-center">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'var(--color-surface-2)', border: 'none', borderRadius: '8px' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-gray-500 text-sm">Veri bulunamadı</div>
                )}
            </div>
        </div>
    )
}

export function ConversionLineChart({ data }: { data: any[] }) {
    return (
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--color-text-0)' }}>
                <Activity className="w-5 h-5 text-blue-500" />
                Teklif Dönüşüm Oranı (%)
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--color-text-3)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-text-3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <Tooltip
                            contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                            formatter={(val: number | undefined) => [`${val || 0}%`, 'Dönüşüm Oranı']}
                        />
                        <Line
                            type="monotone"
                            dataKey="rate"
                            stroke="var(--color-accent)"
                            strokeWidth={3}
                            dot={{ fill: 'var(--color-accent)', r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
