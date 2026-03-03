'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, Zap, Info } from 'lucide-react'

interface Insight {
    type: 'warning' | 'info' | 'success'
    message: string
}

export function InsightsToast({ stats, insights }: { stats: any, insights: Insight[] }) {
    // Show toast for overdue tasks once per session/mount
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
    }, [stats?.overdueTasks])

    if (insights.length === 0) return null

    return (
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
    )
}
