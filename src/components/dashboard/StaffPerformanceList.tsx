'use client'

import { Users } from 'lucide-react'

export function StaffPerformanceList({ staff }: { staff: any[] }) {
    return (
        <div
            className="p-6 rounded-xl animate-fade-in"
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
