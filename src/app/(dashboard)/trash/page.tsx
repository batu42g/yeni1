'use client'

import { useEffect, useState, useCallback, memo, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import toast from 'react-hot-toast'
import {
    Trash2,
    RotateCcw,
    Users,
    FolderKanban,
    ListTodo,
    FileText,
    Loader2,
    Search,
    AlertTriangle,
} from 'lucide-react'

type EntityTab = 'customers' | 'projects' | 'tasks' | 'offers'

interface DeletedItem {
    id: string
    name?: string
    title?: string
    amount?: number
    status?: string
    deleted_at: string
    created_at: string
}

const TABS: { id: EntityTab; label: string; icon: any }[] = [
    { id: 'customers', label: 'Müşteriler', icon: Users },
    { id: 'projects', label: 'Projeler', icon: FolderKanban },
    { id: 'tasks', label: 'Görevler', icon: ListTodo },
    { id: 'offers', label: 'Teklifler', icon: FileText },
]

const TrashItemRow = memo(({
    item,
    i,
    restoring,
    permanentDeleteId,
    deleteConfirmText,
    setDeleteConfirmText,
    onRestore,
    onPermanentDelete,
    setPermanentDeleteId
}: {
    item: DeletedItem,
    i: number,
    restoring: string | null,
    permanentDeleteId: string | null,
    deleteConfirmText: string,
    setDeleteConfirmText: (val: string) => void,
    onRestore: (id: string) => void,
    onPermanentDelete: (id: string, name: string) => void,
    setPermanentDeleteId: (id: string | null) => void
}) => {
    const label = item.name || item.title || (item.amount ? `₺${item.amount.toLocaleString('tr-TR')}` : item.id.slice(0, 8))
    const isDeleting = permanentDeleteId === item.id

    return (
        <tr className="animate-fade-in" style={{ animationDelay: `${i * 10}ms` }}>
            <td>
                <span className="font-medium" style={{ color: 'var(--color-text-0)' }}>
                    {label}
                </span>
            </td>
            <td style={{ color: 'var(--color-text-2)' }}>
                {formatDate(item.deleted_at)}
            </td>
            <td>
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onRestore(item.id)}
                        disabled={restoring === item.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{
                            background: 'var(--color-accent-glow)',
                            color: 'var(--color-accent)',
                        }}
                    >
                        {restoring === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Geri Yükle
                    </button>
                    {isDeleting ? (
                        <div className="flex flex-col gap-2 items-end min-w-[200px]">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="DELETE yazın"
                                    value={deleteConfirmText}
                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                    className="input-field text-xs h-8 w-full border-red-500/50"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onPermanentDelete(item.id, label)}
                                    disabled={deleteConfirmText !== 'DELETE'}
                                    className="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                                    style={{ background: 'var(--color-danger)', color: '#fff' }}
                                >
                                    Eminim, Sil
                                </button>
                                <button
                                    onClick={() => setPermanentDeleteId(null)}
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ color: 'var(--color-text-3)' }}
                                >
                                    İptal
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setPermanentDeleteId(item.id);
                                setDeleteConfirmText('')
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                            style={{
                                background: 'rgba(239,68,68,0.1)',
                                color: 'var(--color-danger)',
                            }}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Kalıcı Sil
                        </button>
                    )}
                </div>
            </td>
        </tr>
    )
})
TrashItemRow.displayName = 'TrashItemRow'

export default function TrashPage() {
    const { user } = useAuthStore()
    const [activeTab, setActiveTab] = useState<EntityTab>('customers')
    const [items, setItems] = useState<DeletedItem[]>([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)

    const [restoring, setRestoring] = useState<string | null>(null)
    const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery)
        }, 300)
        return () => clearTimeout(handler)
    }, [searchQuery])

    const [cursor, setCursor] = useState<string>('')

    const fetchDeleted = useCallback(async (isLoadMore = false) => {
        if (!user) return

        if (!isLoadMore) {
            setInitialLoading(true)
            setItems([])
            setCursor('')
        } else {
            setLoadingMore(true)
        }

        try {
            let url = `/api/trash?type=${activeTab}&limit=50`
            if (isLoadMore && cursor) url += `&cursor=${encodeURIComponent(cursor)}`
            if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`

            const res = await fetch(url)
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}))
                throw new Error(errBody.error || `HTTP ${res.status}`)
            }
            const { items: fetchedItems } = await res.json()

            setItems(prev => isLoadMore ? [...prev, ...(fetchedItems || [])] : (fetchedItems || []))

            if (fetchedItems && fetchedItems.length > 0) {
                setCursor(fetchedItems[fetchedItems.length - 1].deleted_at)
            }
            setHasMore((fetchedItems?.length || 0) === 50)
        } catch (error: any) {
            console.error('Fetch error:', error)
            toast.error(error.message || 'Geri dönüşüm kutusu yüklenirken hata oluştu')
        } finally {
            setInitialLoading(false)
            setRefreshing(false)
            setLoadingMore(false)
        }
    }, [user, activeTab, debouncedQuery, cursor])

    // Fetch on tab or search change (not on cursor change)
    useEffect(() => {
        fetchDeleted(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, debouncedQuery, user])

    const handleRestore = useCallback(async (id: string) => {
        setRestoring(id)
        try {
            const res = await fetch('/api/trash/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: activeTab, id })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Network error')
            }

            toast.success('Öğe geri yüklendi', { icon: '🔄' })
            setItems(prev => prev.filter(i => i.id !== id))
        } catch (error: any) {
            console.error('Restore error:', error)
            toast.error(error.message || 'Geri yükleme başarısız')
        } finally {
            setRestoring(null)
        }
    }, [activeTab])

    const handlePermanentDelete = useCallback(async (id: string, name: string) => {
        if (deleteConfirmText !== 'DELETE') return

        const loadingToast = toast.loading('Kalıcı olarak siliniyor...')
        try {
            const res = await fetch(`/api/trash/hard-delete?type=${activeTab}&id=${id}`, {
                method: 'DELETE'
            })

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Decline permanent delete request')
            }

            toast.success('Kalıcı olarak silindi', { id: loadingToast })
            setItems(prev => prev.filter(i => i.id !== id))
            setPermanentDeleteId(null)
            setDeleteConfirmText('')
        } catch (error: any) {
            console.error('Delete error:', error)
            toast.error(error.message || 'Kalıcı silme başarısız', { id: loadingToast })
        }
    }, [activeTab, deleteConfirmText])

    // Derived memo mapping
    const renderedItems = useMemo(() => items, [items])

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                    <Trash2 className="w-5 h-5 line-height" style={{ color: 'var(--color-danger)' }} />
                    Çöp Kutusu
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>
                    Silinen öğeleri geri yükleyin veya kalıcı olarak silin.
                </p>
            </div>

            {/* Quick Summary Filters & Search Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    setSearchQuery('')
                                }}
                                disabled={initialLoading}
                                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap"
                                style={{
                                    borderColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--color-text-0)' : 'var(--color-text-3)',
                                    opacity: refreshing && activeTab !== tab.id ? 0.5 : 1
                                }}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Search - Visible entirely without restrictions since it works fast */}
                <div className="relative md:max-w-xs w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-3)' }} />
                    <input
                        type="search"
                        placeholder="Öğe ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="input-field pl-9 pr-4 py-2 w-full text-sm h-10"
                    />
                    {refreshing && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-3)' }} />
                    )}
                </div>
            </div>

            {/* Content */}
            {initialLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-text-3)' }} />
                </div>
            ) : renderedItems.length === 0 ? (
                <EmptyState
                    title={debouncedQuery ? "Sonuç bulunamadı" : "Çöp kutusu boş"}
                    description={debouncedQuery ? `"${debouncedQuery}" için eşleşen kayıt yok.` : `Silinen ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()} bulunamadı.`}
                    icon={<Trash2 className="w-7 h-7" style={{ color: 'var(--color-text-3)' }} />}
                />
            ) : (
                <div className="space-y-4">
                    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <colgroup>
                                    <col style={{ width: '30%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '50%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>Kimlik/Ad</th>
                                        <th>Silinme Tarihi</th>
                                        <th style={{ textAlign: 'right' }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renderedItems.map((item, i) => (
                                        <TrashItemRow
                                            key={item.id}
                                            item={item}
                                            i={i}
                                            restoring={restoring}
                                            permanentDeleteId={permanentDeleteId}
                                            deleteConfirmText={deleteConfirmText}
                                            setDeleteConfirmText={setDeleteConfirmText}
                                            onRestore={handleRestore}
                                            onPermanentDelete={handlePermanentDelete}
                                            setPermanentDeleteId={setPermanentDeleteId}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {hasMore && (
                        <div className="flex justify-center pt-4 pb-8">
                            <button
                                onClick={() => fetchDeleted(true)}
                                disabled={loadingMore}
                                className="btn-secondary px-6 py-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Yükleniyor...
                                    </>
                                ) : (
                                    'Daha Fazla Yükle'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
