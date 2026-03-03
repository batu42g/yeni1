'use client'

import { useEffect, useState, useMemo, memo, useCallback } from 'react'
import { FileText, Download, Shield, Loader2, ChevronDown, Search, Filter } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { format } from 'date-fns'
import { parseUTCDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import toast from 'react-hot-toast'

const fieldMap: Record<string, string> = {
    title: 'Başlık',
    name: 'İsim',
    customer_id: 'Müşteri Kimliği',
    customer_name: 'Müşteri',
    budget: 'Bütçe',
    status: 'Durum',
    project_id: 'Proje Kimliği',
    email: 'E-posta',
    role: 'Yetki',
    description: 'Açıklama',
    logo_url: 'Logo Adresi',
    current_step: 'Aşama',
    invite_id: 'Davet Kimliği',
    expires_at: 'Geçerlilik Süresi',
    assigned_to: 'Atanan Kişi',
    due_date: 'Bitiş Tarihi',
    format: 'Format',
    row_count: 'Kayıt Sayısı',
    step: 'Adım',
    user_id: 'Kullanıcı Kimliği'
}

const statusMap: Record<string, string> = {
    pending: 'Beklemede',
    in_progress: 'Devam Ediyor',
    done: 'Tamamlandı',
    todo: 'Yapılacak',
    doing: 'Yapılıyor',
    active: 'Aktif',
    archived: 'Arşivlendi',
    deleted: 'Silindi',
    revoked: 'İptal Edildi',
    accepted: 'Kabul Edildi',
    draft: 'Taslak',
    sent: 'Gönderildi',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
    cancelled: 'İptal',
    completed: 'Tamamlandı'
}

const translateField = (f: string) => fieldMap[f] || f.replace(/_/g, ' ')
const translateValue = (field: string, val: unknown): string => {
    if (val === null) return '—'
    if (field === 'status' && typeof val === 'string' && statusMap[val]) return statusMap[val]
    return typeof val === 'string' ? val : JSON.stringify(val)
}

// Subcomponent for Audit Row that handles its own expanded state to prevent full-table rerenders
const AuditRow = memo(({ log }: { log: any }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    const toggleExpand = useCallback(() => {
        setIsExpanded(prev => !prev)
    }, [])

    return (
        <>
            <tr className="border-b border-gray-800 hover:bg-[#1f1f2e] transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                    {format(parseUTCDate(log.created_at), 'dd.MM.yyyy HH:mm:ss')}
                </td>
                <td className="px-6 py-4">
                    {log.actor ? (
                        <div className="flex flex-col">
                            <span className="text-white font-medium">{log.actor.full_name || 'Bilinmeyen'}</span>
                            <span className="text-xs text-gray-500">{log.actor.email}</span>
                        </div>
                    ) : (
                        <span className="text-gray-500 italic">Sistem / Silinmiş Kullanıcı</span>
                    )}
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md font-mono text-xs text-indigo-300">
                            {log.action}
                        </span>
                        {log.severity === 'critical' && (
                            <span className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold text-red-400 uppercase">Kritik</span>
                        )}
                        {log.severity === 'warning' && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] font-bold text-yellow-400 uppercase">Uyarı</span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-gray-300 capitalize">
                            {log.target_type}
                            {log.metadata?.context?.title || log.metadata?.title ? ` - ${log.metadata?.context?.title || log.metadata?.title}` : (log.metadata?.context?.name || log.metadata?.name ? ` - ${log.metadata?.context?.name || log.metadata?.name}` : '')}
                        </span>
                        {log.target_id && (
                            <span className="text-xs text-gray-500 font-mono" title={log.target_id}>
                                ID: {log.target_id.split('-')[0]}...
                                {log.metadata?.context?.customer_name || log.metadata?.customer_name ? ` • ${log.metadata?.context?.customer_name || log.metadata?.customer_name}` : ''}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <button
                        onClick={toggleExpand}
                        className="p-1 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800 inline-flex items-center gap-1"
                    >
                        İncele
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-[#0f0f13] border-b border-gray-800">
                    <td colSpan={5} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Detaylar</h4>
                                <div className="bg-[#1a1a26] p-4 rounded-lg text-sm text-gray-300 border border-gray-800 space-y-2">
                                    {log.metadata ? (
                                        (() => {
                                            const itemsToRender: React.ReactNode[] = [];
                                            const contextObj = log.metadata.context || {};

                                            // Render Context Fields
                                            Object.entries(contextObj).forEach(([key, val]) => {
                                                if (val === null || val === undefined) return;
                                                itemsToRender.push(
                                                    <div key={`context-${key}`} className="flex border-b border-gray-800/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                                                        <span className="w-1/3 min-w-[120px] font-medium text-gray-500 capitalize">{translateField(key)}</span>
                                                        <span className="w-2/3 text-gray-300 break-all">
                                                            {String(val)}
                                                        </span>
                                                    </div>
                                                );
                                            });

                                            // Render other top-level non-object fields (legacy support)
                                            Object.entries(log.metadata).forEach(([key, val]) => {
                                                if (key === 'context' || key === 'changes' || val === null || val === undefined || typeof val === 'object') return;
                                                itemsToRender.push(
                                                    <div key={`legacy-${key}`} className="flex border-b border-gray-800/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                                                        <span className="w-1/3 min-w-[120px] font-medium text-gray-500 capitalize">{translateField(key)}</span>
                                                        <span className="w-2/3 text-gray-300 break-all">
                                                            {String(val)}
                                                        </span>
                                                    </div>
                                                );
                                            });

                                            // Render changes diff
                                            if (Array.isArray(log.metadata.changes) && log.metadata.changes.length > 0) {
                                                itemsToRender.push(
                                                    <div key="changes-table" className="flex flex-col mt-4 bg-[#0f0f13] border border-gray-800 rounded-lg p-3">
                                                        <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Değişen Alanlar</h5>
                                                        {log.metadata.changes.map((change: any, i: number) => (
                                                            <div key={i} className="flex flex-col mb-2 pb-2 border-b border-gray-800/50 last:border-0 last:mb-0 last:pb-0">
                                                                <span className="font-medium text-gray-300 mb-1">{translateField(change.field)}:</span>
                                                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                                                    <span className={`${change.old === null ? 'text-gray-500' : 'line-through text-red-400 opacity-70'} px-1.5 py-0.5 ${change.old === null ? 'bg-gray-800/50' : 'bg-red-400/10'} rounded max-w-xs truncate`} title={change.old === null ? '—' : String(change.old)}>{translateValue(change.field, change.old)}</span>
                                                                    <span className="text-gray-500">→</span>
                                                                    <span className={`${change.new === null ? 'text-gray-500' : 'text-green-400'} px-1.5 py-0.5 ${change.new === null ? 'bg-gray-800/50' : 'bg-green-400/10'} rounded max-w-[200px] truncate`} title={change.new === null ? '—' : String(change.new)}>{translateValue(change.field, change.new)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return itemsToRender.length > 0 ? itemsToRender : (
                                                <>{Object.entries(log.metadata).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
                                                    <div key={`fb-${k}`} className="flex border-b border-gray-800/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                                                        <span className="w-1/3 min-w-[120px] font-medium text-gray-500 capitalize">{translateField(k)}</span>
                                                        <span className="w-2/3 text-gray-300 break-all text-xs">
                                                            {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                                                        </span>
                                                    </div>
                                                ))}</>
                                            );
                                        })()
                                    ) : (
                                        <span className="text-gray-500 italic">Detay bulunmuyor</span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Log ID</h4>
                                    <p className="text-sm font-mono text-gray-300">{log.id}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">IP Adresi & Cihaz</h4>
                                    <p className="text-sm font-mono text-gray-300">{log.ip ? log.ip.replace(/\.\d+\.\d+$/, '.xxx.xxx') : '\u2014'} / {log.user_agent ? (log.user_agent.length > 40 ? log.user_agent.substring(0, 40) + '\u2026' : log.user_agent) : '\u2014'}</p>
                                </div>
                                {log.request_id && (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">İstek Kimliği (Correlation)</h4>
                                        <p className="text-sm font-mono text-indigo-300">{log.request_id}</p>
                                    </div>
                                )}
                                {log.severity && log.severity !== 'info' && (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Önem Derecesi</h4>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                            }`}>{log.severity === 'critical' ? 'Kritik' : 'Uyarı'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
})
AuditRow.displayName = 'AuditRow'

export default function AuditLogsPage() {
    const { user } = useAuthStore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)

    // Filters
    const [filterAction, setFilterAction] = useState('ALL')
    const [filterSeverity, setFilterSeverity] = useState('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch] = useDebounce(searchQuery, 300)

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (filterAction !== 'ALL' && log.action !== filterAction) return false
            if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false

            if (debouncedSearch) {
                const query = debouncedSearch.toLowerCase()

                // Construct a targeted search string (much faster than full JSON stringify)
                const searchString = `
                    ${log.action || ''} 
                    ${log.actor?.email || ''} 
                    ${log.actor?.full_name || ''} 
                    ${log.target_id || ''} 
                    ${log.request_id || ''} 
                    ${log.ip || ''} 
                    ${log.metadata?.context?.title || ''} 
                    ${log.metadata?.context?.customer_name || ''} 
                    ${log.metadata?.context?.email || ''} 
                    ${log.metadata?.context?.reason || ''}
                `.toLowerCase()

                if (!searchString.includes(query)) return false
            }
            return true
        })
    }, [logs, filterAction, filterSeverity, debouncedSearch])

    useEffect(() => {
        const fetchAudit = async () => {
            if (!user) return
            if (user.role !== 'admin' && user.role !== 'owner') {
                setLoading(false)
                return
            }
            try {
                const res = await fetch('/api/audit')
                const data = await res.json()
                if (data.logs) {
                    setLogs(data.logs)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        if (user?.active_company_id) {
            fetchAudit()
        }
    }, [user])

    const handleExport = async () => {
        setDownloading(true)
        try {
            const res = await fetch('/api/audit/export', { method: 'POST' })
            if (!res.ok) throw new Error('Export failed')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `audit_export_${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            a.remove()
            toast.success('Dışa aktarma başarılı!')
        } catch (err) {
            console.error(err)
            toast.error('Dışa aktarılırken bir hata oluştu.')
        } finally {
            setDownloading(false)
        }
    }

    if (user && user.role !== 'admin' && user.role !== 'owner') {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <Shield className="w-16 h-16 text-red-500/50 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Erişim Engellendi</h2>
                <p className="text-gray-400">Bu sayfayı görüntülemek için Yönetici (Admin) yetkisine sahip olmalısınız.</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-purple-400" /> Audit Log (Denetim Kayıtları)
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Şirketinizdeki tüm güvenlik ve sistem eylemlerinin değiştirilemez (immutable) kayıtları.
                    </p>
                </div>

                <button
                    onClick={handleExport}
                    disabled={downloading || logs.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                >
                    {downloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    CSV İndir
                </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-4 bg-[#1a1a26] p-4 rounded-xl border border-gray-800">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="IP, Event ID veya e-posta ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0f0f13] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="bg-[#0f0f13] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none min-w-[150px]"
                        >
                            <option value="ALL">Tüm İşlemler (Action)</option>
                            {Array.from(new Set(logs.map(log => log.action))).sort().map(action => (
                                <option key={action} value={action as string}>{action as string}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                            className="bg-[#0f0f13] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none min-w-[130px]"
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
                    <div className="w-8 h-8 rounded-full border-t-2 border-purple-500 animate-spin"></div>
                </div>
            ) : (
                <div className="bg-[#1a1a26] border border-gray-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="text-xs uppercase bg-[#0f0f13] text-gray-400 border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4">Kullanıcı (Aktör)</th>
                                    <th className="px-6 py-4">İşlem (Action)</th>
                                    <th className="px-6 py-4">Hedef (Target)</th>
                                    <th className="px-6 py-4 text-right">Detaylar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            Denetim kaydı bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <AuditRow key={log.id} log={log} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
