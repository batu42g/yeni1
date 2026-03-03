'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Activity, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { parseUTCDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

export function NotificationPopover() {
    const [open, setOpen] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [logs, setLogs] = useState<any[]>([])
    const { user } = useAuthStore()
    const containerRef = useRef<HTMLDivElement>(null)

    // Fetch logs
    useEffect(() => {
        if (open && user) {
            const fetchLogs = async () => {
                const supabase = createClient()
                const { data } = await supabase
                    .from('activity_events')
                    .select('*')
                    .eq('company_id', user.active_company_id!)
                    .order('created_at', { ascending: false })
                    .limit(10)
                setLogs(data || [])
            }
            fetchLogs()
        }
    }, [open, user])

    // Click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const getIcon = (action: string) => {
        switch (action) {
            case 'info': return <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
            case 'warning': return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
            case 'critical': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            default: return <Activity className="w-3.5 h-3.5 text-gray-500" />
        }
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-lg transition-all duration-200 hover:bg-indigo-500/10"
                style={{ color: open ? 'var(--color-accent)' : 'var(--color-text-2)' }}
            >
                <Bell className="w-5 h-5" />
                {/* Red dot if there are logs (simulated unseen) */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                </span>
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden shadow-2xl border animate-fade-in"
                    style={{
                        background: 'var(--color-surface-1)',
                        borderColor: 'var(--color-border)',
                        zIndex: 100
                    }}
                >
                    <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-0)' }}>Son Aktiviteler</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">Canlı</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                        {logs.length === 0 ? (
                            <div className="p-6 text-center">
                                <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs opacity-50">Henüz aktivite yok.</p>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="p-3 border-b last:border-0 hover:bg-white/5 transition-colors group relative" style={{ borderColor: 'var(--color-border)' }}>
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {getIcon(log.severity)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium mb-0.5 line-clamp-2" style={{ color: 'var(--color-text-1)' }}>
                                                {log.summary || log.title || 'İşlem yapıldı'}
                                            </p>
                                            <span className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>
                                                {formatDistanceToNow(parseUTCDate(log.created_at), { addSuffix: true, locale: tr })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t bg-black/5" style={{ borderColor: 'var(--color-border)' }}>
                        <button className="w-full text-[10px] text-center opacity-60 hover:opacity-100 py-1">
                            Tüm Aktivite Geçmişi
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
