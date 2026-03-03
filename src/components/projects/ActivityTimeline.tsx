'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import {
    Plus, Edit, Trash2, RotateCcw, Loader2,
    File, Clock, CheckCircle2, AlertTriangle, Wand2, LayoutTemplate, Activity
} from 'lucide-react'

interface ActivityEntry {
    id: string
    event_type: string
    title: string
    summary: string | null
    entity_type: string | null
    entity_id: string | null
    severity: 'info' | 'warning' | 'critical'
    created_at: string
    actor_user_id: string | null
    users: { full_name: string; avatar_url: string | null } | null
}

function getEventConfig(eventType: string): { icon: any; color: string; bg: string } {
    if (eventType.includes('CREATED') || eventType.includes('CREATE')) {
        return { icon: Plus, color: '#34d399', bg: 'rgba(52,211,153,0.1)' }
    }
    if (eventType.includes('UPDATED') || eventType.includes('UPDATE')) {
        return { icon: Edit, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' }
    }
    if (eventType.includes('DELETED') || eventType.includes('DELETE')) {
        return { icon: Trash2, color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
    }
    if (eventType.includes('RESTORED') || eventType.includes('RESTORE')) {
        return { icon: RotateCcw, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' }
    }
    if (eventType.includes('TEMPLATE')) {
        return { icon: LayoutTemplate, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
    }
    if (eventType.includes('FILE')) {
        return { icon: File, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
    }
    return { icon: Activity, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
}

function getSeverityConfig(severity: string): { color: string } {
    if (severity === 'critical') return { color: '#f87171' }
    if (severity === 'warning') return { color: '#fbbf24' }
    return { color: '#94a3b8' }
}

function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Az önce'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} dk önce`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} saat önce`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} gün önce`
    return new Date(date).toLocaleDateString('tr-TR')
}

export function ActivityTimeline({ projectId }: { projectId: string }) {
    const [entries, setEntries] = useState<ActivityEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchTimeline = async () => {
            setLoading(true)
            setError(null)
            const supabase = createClient()

            // activity_events tablosunu doğru şekilde sorgula
            // entity_type='project' AND entity_id=projectId
            // UNION entity_type='task' (şablon task'ları dahil)
            const { data, error: fetchError } = await supabase
                .from('activity_events')
                .select(`
                    id,
                    event_type,
                    title,
                    summary,
                    entity_type,
                    entity_id,
                    severity,
                    created_at,
                    actor_user_id,
                    users:actor_user_id (full_name, avatar_url)
                `)
                .eq('entity_id', projectId)
                .order('created_at', { ascending: false })
                .limit(50)

            if (fetchError) {
                console.error('ActivityTimeline fetch error:', fetchError)
                setError('Aktivite verileri yüklenemedi.')
                setLoading(false)
                return
            }

            // Proje entity_id'si ile eşleşen kayıtlar zaten project + template task events
            // Şablon görevlerin proje entity_id'si ile loglandığı için doğru şekilde geliyor
            setEntries((data as ActivityEntry[]) || [])
            setLoading(false)
        }

        fetchTimeline()
    }, [projectId])

    if (loading) {
        return (
            <div className="flex justify-center items-center py-16">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-text-3)' }} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: 'var(--color-danger)' }}>
                <AlertTriangle className="w-8 h-8" />
                <p className="text-sm">{error}</p>
            </div>
        )
    }

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--color-text-3)' }}>
                <Clock className="w-10 h-10 mb-3" />
                <p className="text-sm">Henüz aktivite kaydı yok</p>
                <p className="text-xs mt-1">Proje üzerinde yapılan değişiklikler burada görünecek</p>
            </div>
        )
    }

    return (
        <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px" style={{ background: 'var(--color-border)' }} />

            <div className="space-y-0 relative">
                {entries.map((entry, i) => {
                    const config = getEventConfig(entry.event_type)
                    const Icon = config.icon

                    return (
                        <div
                            key={entry.id}
                            className="relative flex gap-4 py-4 group"
                            style={{
                                animationDelay: `${i * 40}ms`,
                                animation: 'fadeInUp 0.3s ease forwards',
                                opacity: 0,
                            }}
                        >
                            {/* Icon Dot */}
                            <div
                                className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-transform group-hover:scale-110"
                                style={{
                                    background: config.bg,
                                    borderColor: config.color + '40',
                                }}
                            >
                                <Icon className="w-4 h-4" style={{ color: config.color }} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium leading-tight" style={{ color: 'var(--color-text-0)' }}>
                                            {entry.title}
                                        </p>
                                        {entry.summary && (
                                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-3)' }}>
                                                {entry.summary}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs whitespace-nowrap flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                                        {timeAgo(entry.created_at)}
                                    </span>
                                </div>

                                {/* Actor */}
                                {entry.users && (
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                                            {entry.users.full_name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>
                                            {entry.users.full_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(6px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    )
}
