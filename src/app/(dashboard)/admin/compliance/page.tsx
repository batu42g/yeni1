'use client'

import { useEffect, useState, useCallback } from 'react'
import { Shield, Clock, AlertTriangle, CheckCircle2, Database, Loader2, Lock, FileWarning, Play } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import toast from 'react-hot-toast'

interface ComplianceStats {
    totalAuditLogs: number
    last24hCritical: number
    last24hWarning: number
    failedLogins24h: number
    permissionDenied24h: number
    auditRetention: string
    activityRetention: string
    immutablePolicy: boolean
    piiSanitized: boolean
    exportSanitized: boolean
}

export default function CompliancePage() {
    const { user } = useAuthStore()
    const [stats, setStats] = useState<ComplianceStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [retentionRunning, setRetentionRunning] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [retentionResult, setRetentionResult] = useState<any>(null)

    useEffect(() => {
        if (!user) return
        fetchStats()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/compliance/stats')
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (e) {
            console.error('Compliance stats fetch error:', e)
        } finally {
            setLoading(false)
        }
    }

    const runRetentionCleanup = useCallback(async () => {
        if (retentionRunning) return
        setRetentionRunning(true)
        try {
            const res = await fetch('/api/compliance/retention/run', { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                setRetentionResult(data)
                toast.success('Retention job tamamlandı')
            } else {
                toast.error(data.error || 'Retention çalıştırılamadı')
            }
        } catch {
            toast.error('Bir hata oluştu')
        } finally {
            setRetentionRunning(false)
        }
    }, [retentionRunning])

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        )
    }

    const policies = [
        {
            label: 'Immutable Audit Log',
            description: 'Audit kayıtları değiştirilemez ve silinemez. DB trigger ile korunuyor.',
            active: stats?.immutablePolicy ?? true,
            icon: Lock
        },
        {
            label: 'PII Sanitization',
            description: 'Kişisel veriler (email, IP, UUID) maskeleniyor. Hassas alanlar denylist ile engelleniyor.',
            active: stats?.piiSanitized ?? true,
            icon: Shield
        },
        {
            label: 'Export Sanitization',
            description: 'CSV export sanitize edilmiş veri içerir. Export işlemi audit\'e loglanır.',
            active: stats?.exportSanitized ?? true,
            icon: FileWarning
        }
    ]

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Shield className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Güvenlik & Uyumluluk</h1>
                    <p className="text-sm text-gray-400">Enterprise compliance durumu ve politikalar</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs uppercase font-semibold text-gray-500">Toplam Audit Kaydı</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats?.totalAuditLogs?.toLocaleString() || '0'}</p>
                </div>

                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-xs uppercase font-semibold text-gray-500">Son 24s Kritik</span>
                    </div>
                    <p className={`text-3xl font-bold ${(stats?.last24hCritical || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {stats?.last24hCritical || 0}
                    </p>
                </div>

                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs uppercase font-semibold text-gray-500">Başarısız Giriş (24s)</span>
                    </div>
                    <p className={`text-3xl font-bold ${(stats?.failedLogins24h || 0) > 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {stats?.failedLogins24h || 0}
                    </p>
                </div>

                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-orange-400" />
                        <span className="text-xs uppercase font-semibold text-gray-500">İzin Reddi (24s)</span>
                    </div>
                    <p className={`text-3xl font-bold ${(stats?.permissionDenied24h || 0) > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                        {stats?.permissionDenied24h || 0}
                    </p>
                </div>
            </div>

            {/* Retention Policy */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-semibold text-white">Saklama Politikası</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg mt-0.5">
                            <Shield className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Audit Log Saklama Süresi</p>
                            <p className="text-2xl font-bold text-indigo-400 mt-1">{stats?.auditRetention || '2 Yıl'}</p>
                            <p className="text-xs text-gray-500 mt-1">Immutable — silinemez, değiştirilemez</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg mt-0.5">
                            <Clock className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Activity Event Saklama Süresi</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-1">{stats?.activityRetention || '180 Gün'}</p>
                            <p className="text-xs text-gray-500 mt-1">Yapılandırmaya göre temizlenir</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Retention Actions */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Play className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-semibold text-white">Retention Yönetimi</h2>
                    </div>
                    <button
                        onClick={runRetentionCleanup}
                        disabled={retentionRunning}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        {retentionRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {retentionRunning ? 'Çalıştırılıyor...' : 'Retention Çalıştır'}
                    </button>
                </div>
                {retentionResult && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Silinen Activity</p>
                            <p className="text-xl font-bold text-emerald-400 mt-1">{retentionResult.result?.activity_events_deleted ?? 0}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase font-semibold">2+ Yıl Audit Kayıt</p>
                            <p className="text-xl font-bold text-blue-400 mt-1">{retentionResult.result?.audit_logs_archived_count ?? 0}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Son Çalışma</p>
                            <p className="text-sm font-mono text-gray-300 mt-1">{retentionResult.ran_at ? new Date(retentionResult.ran_at).toLocaleString('tr-TR') : '—'}</p>
                        </div>
                    </div>
                )}
                {!retentionResult && (
                    <p className="text-sm text-gray-500">
                        {stats?.activityRetention?.includes('Otomatik')
                            ? 'Etkinlik kayıtları arka planda otomatik olarak yapılandırılan süreye göre temizlenir.'
                            : 'Otomatik cron aktif değil. Kayıtları temizlemek için manuel olarak "Retention Çalıştır" butonunu kullanın.'}
                    </p>
                )}
            </div>

            {/* Policy Status */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h2 className="text-lg font-semibold text-white">Güvenlik Politikaları</h2>
                </div>
                <div className="space-y-4">
                    {policies.map((policy, i) => {
                        const Icon = policy.icon
                        return (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${policy.active ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                        <Icon className={`w-4 h-4 ${policy.active ? 'text-green-400' : 'text-red-400'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{policy.label}</p>
                                        <p className="text-xs text-gray-500">{policy.description}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${policy.active
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {policy.active ? (policy.label.includes('Sanitization') ? 'Uygulama Seviyesi' : 'Aktif') : 'Devre Dışı'}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
