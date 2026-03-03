'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth-store'
import dynamic from 'next/dynamic'

const FinancialChart = dynamic(() => import('@/components/reports/ReportsCharts').then(mod => mod.FinancialChart), { ssr: false, loading: () => <div className="h-[350px] w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div> })
const StatusPieChart = dynamic(() => import('@/components/reports/ReportsCharts').then(mod => mod.StatusPieChart), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div> })
const ConversionLineChart = dynamic(() => import('@/components/reports/ReportsCharts').then(mod => mod.ConversionLineChart), { ssr: false, loading: () => <div className="h-[300px] w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"></div> })

export default function ReportsPage() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [monthlyData, setMonthlyData] = useState<any[]>([])
    const [statusData, setStatusData] = useState<any[]>([])
    const [offerConversionData, setOfferConversionData] = useState<any[]>([])

    const fetchReportsData = useCallback(async () => {
        if (!user) return

        try {
            const currentYear = new Date().getFullYear();
            const res = await fetch(`/api/reports/aggregate?year=${currentYear}`)
            if (!res.ok) throw new Error('API request failed')
            const { monthlyData, statusData, offerConversionData } = await res.json()

            setMonthlyData(monthlyData)
            setStatusData(statusData)
            setOfferConversionData(offerConversionData)
        } catch (error) {
            console.error('Error fetching reports:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchReportsData()
    }, [fetchReportsData])

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Veriler analiz ediliyor...</div>
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-0)' }}>Gelişmiş Raporlar</h1>
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-3)' }}>
                    İşletmenizin performans metrikleri ve finansal analizi.
                </p>
            </div>

            {/* Financial Overview Chart */}
            <FinancialChart data={monthlyData} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Status Distribution */}
                <StatusPieChart data={statusData} />

                {/* Offer Conversion Rate */}
                <ConversionLineChart data={offerConversionData} />
            </div>
        </div>
    )
}
