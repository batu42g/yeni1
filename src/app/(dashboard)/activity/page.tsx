'use client'

import { useEffect, useState, memo, useMemo, useCallback } from 'react'
import { Activity, Search, AlertTriangle, AlertCircle, Info, Filter, Loader2 } from 'lucide-react'
import { parseUTCDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth-store'
import { useDebounce } from 'use-debounce'

const getSeverityIcon = (sev: string) => {
    switch (sev) {
        case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />
        case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />
        default: return <Info className="w-5 h-5 text-blue-500" />
    }
}

const EventCard = memo(({ ev }: { ev: any }) => {
    // Memoize the distance string so it doesn't recalculate on every layout rerender
    const timeAgo = useMemo(() => formatDistanceToNow(parseUTCDate(ev.created_at), { addSuffix: true, locale: tr }), [ev.created_at])

    return (
        <div className="flex gap-4 p-5 bg-[#1a1a26] border border-gray-800 rounded-xl hover:bg-[#1f1f2e] transition-colors">
            <div className="mt-1">
                {getSeverityIcon(ev.severity)}
            </div>
            <div className="flex-1">
                <div className="flex items-start justify-between">
                    <h3 className="font-medium text-white">{ev.title}</h3>
                    <span className="text-xs text-gray-500">{timeAgo}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{ev.summary}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                    {ev.actor && (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                                {ev.actor.avatar_url ? (
                                    <img src={ev.actor.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] text-white">{(ev.actor.full_name || '?').charAt(0)}</span>
                                )}
                            </div>
                            <span>{ev.actor.full_name || 'Bilinmeyen Kullanıcı'}</span>
                        </div>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700">
                        {ev.event_type}
                    </span>
                </div>
            </div>
        </div>
    )
})
EventCard.displayName = 'EventCard'


export default function ActivityPage() {
    const { user } = useAuthStore()
    const [events, setEvents] = useState<any[]>([])

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch] = useDebounce(searchQuery, 300)
    const [severity, setSeverity] = useState('ALL')
    const [eventType, setEventType] = useState('ALL')

    const fetchActivity = useCallback(async (isLoadMore = false, currentCursor: string | null = null) => {
        if (!user?.active_company_id) return

        if (!isLoadMore && !loading) setRefreshing(true)
        if (isLoadMore) setLoadingMore(true)

        try {
            const params = new URLSearchParams()
            params.set('limit', '25')
            if (currentCursor) params.set('cursor', currentCursor)
            if (debouncedSearch) params.set('q', debouncedSearch)
            if (severity && severity !== 'ALL') params.set('severity', severity)
            if (eventType && eventType !== 'ALL') params.set('type', eventType)

            const res = await fetch(`/api/activity?${params.toString()}`)
            const data = await res.json()
            if (data.events) {
                if (isLoadMore) {
                    setEvents(prev => [...prev, ...data.events])
                } else {
                    setEvents(data.events)
                }
                // If it returned exactly 50 it means there's potentially more
                setHasMore(data.events.length === 25)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
            setRefreshing(false)
            setLoadingMore(false)
        }
    }, [user, debouncedSearch, severity, eventType])

    useEffect(() => {
        // Reset and fetch when filters change
        fetchActivity(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, debouncedSearch, severity, eventType])

    const handleLoadMore = () => {
        if (events.length === 0 || loadingMore) return
        const lastEvent = events[events.length - 1]
        fetchActivity(true, lastEvent.created_at)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 relative">
            {refreshing && (
                <div className="absolute top-0 right-0 p-2 text-indigo-400 bg-indigo-500/10 rounded-full flex items-center justify-center shadow-lg z-10">
                    <div className="w-5 h-5 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-indigo-400" /> Hesap Hareketleri
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Hesabınız ve şirketinizdeki son operasyonel gelişmeler.
                    </p>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 bg-[#1a1a26] p-4 rounded-xl border border-gray-800">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Etkinlik ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#0f0f13] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="bg-[#0f0f13] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none min-w-[150px]"
                        >
                            <option value="ALL">Tüm Seviyeler</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                </div>
            ) : events.length === 0 ? (
                <div className="text-center p-12 bg-[#1a1a26] rounded-xl border border-gray-800">
                    <p className="text-gray-400">Belirtilen kriterlerde henüz bir etkinlik bulunmuyor.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.map((ev) => (
                        <EventCard key={ev.id} ev={ev} />
                    ))}

                    {hasMore && (
                        <div className="pt-4 text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-6 py-2.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-medium hover:bg-indigo-600/20 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                            >
                                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                                Daha Fazla Yükle
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
