'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2, UserX, PauseCircle, Loader2, ShieldAlert, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface DangerZoneProps {
    companyId: string | null
    companyName: string | null
    currentUserId: string
    currentUserRole: string
}

export function DangerZone({ companyId, companyName, currentUserId, currentUserRole }: DangerZoneProps) {
    const router = useRouter()
    const supabase = createClient()

    const [loadingAction, setLoadingAction] = useState<string | null>(null)

    const handleDeactivateUser = async () => {
        const reason = prompt('Hesabınızı dondurma sebebiniz (opsiyonel):')
        if (reason === null) return

        if (!confirm('Hesabınızı dondurmak istediğinize emin misiniz? Oturumunuz kapatılacak.')) return

        setLoadingAction('deactivate_user')
        try {
            const res = await fetch('/api/settings/danger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deactivate_user', reason })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'İşlem engellendi')
            }

            toast.success('Hesabınız donduruldu. Çıkış yapılıyor...')
            await supabase.auth.signOut()
            router.push('/login')
        } catch (err: any) {
            toast.error(err.message)
            setLoadingAction(null)
        }
    }

    const handleHardDeleteUser = async () => {
        if (!confirm('BU İŞLEM GERİ ALINAMAZ! Hesabınızı ve tüm verilerinizi kalıcı olarak silmek istediğinize emin misiniz?')) return
        if (!confirm('SON UYARI: Bu işlemden dönüş yoktur. Onaylıyor musunuz?')) return

        setLoadingAction('delete_user')
        try {
            const res = await fetch('/api/settings/danger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_user' })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'İşlem engellendi')
            }

            toast.success('Hesabınız silindi. Güle güle...')
            await supabase.auth.signOut()
            router.push('/register')
        } catch (err: any) {
            toast.error(err.message)
            setLoadingAction(null)
        }
    }

    const handleArchiveCompany = async () => {
        if (!confirm(`${companyName} şirketini arşivlemek istediğinize emin misiniz? Veriler salt okunur olacak.`)) return
        setLoadingAction('archive_company')
        try {
            const res = await fetch('/api/settings/danger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'archive_company', companyId })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'İşlem engellendi')
            }
            toast.success('Şirket arşivlendi.')
            window.location.reload()
        } catch (err: any) {
            toast.error(err.message)
            setLoadingAction(null)
        }
    }

    const handleHardDeleteCompany = async () => {
        const confirmName = prompt(`"${companyName}" şirketini KALICI OLARAK silmek üzeresiniz. Onaylamak için şirket adını yazınız:`)
        if (confirmName !== companyName) {
            if (confirmName !== null) toast.error('Şirket ismi eşleşmiyor.')
            return
        }

        setLoadingAction('delete_company')
        try {
            const res = await fetch('/api/settings/danger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_company', companyId })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'İşlem engellendi')
            }

            // Sign out to prevent auto-redirect back to dashboard
            await supabase.auth.signOut()

            toast.success('Şirket silindi.')
            window.location.href = '/login'
        } catch (err: any) {
            toast.error(err.message)
            setLoadingAction(null)
        }
    }

    return (
        <div className="mt-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-danger)' }}>
                <ShieldAlert className="w-6 h-6" />
                Tehlikeli Bölge
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
                {/* User Deactivation */}
                <div
                    className="p-6 rounded-xl border transition-colors group"
                    style={{
                        backgroundColor: 'var(--color-danger-dim)',
                        borderColor: 'rgba(255, 56, 96, 0.2)'
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                                <PauseCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                                Hesabı Dondur
                            </h3>
                            <p className="text-sm mt-2" style={{ color: 'var(--color-text-2)' }}>
                                Hesabınızı geçici olarak devre dışı bırakın. İstediğiniz zaman geri dönebilirsiniz.
                            </p>
                        </div>
                        <button
                            onClick={handleDeactivateUser}
                            disabled={!!loadingAction}
                            className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
                            style={{
                                backgroundColor: 'var(--color-surface-1)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-0)'
                            }}
                        >
                            {loadingAction === 'deactivate_user' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Dondur'}
                        </button>
                    </div>
                </div>

                {/* User Deletion */}
                <div
                    className="p-6 rounded-xl border transition-colors group"
                    style={{
                        backgroundColor: 'var(--color-danger-dim)',
                        borderColor: 'rgba(255, 56, 96, 0.2)'
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                                <UserX className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                                Hesabı Sil
                            </h3>
                            <p className="text-sm mt-2" style={{ color: 'var(--color-text-2)' }}>
                                Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.
                            </p>
                        </div>
                        <button
                            onClick={handleHardDeleteUser}
                            disabled={!!loadingAction}
                            className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            style={{
                                backgroundColor: 'var(--color-danger)'
                            }}
                        >
                            {loadingAction === 'delete_user' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Hesabı Sil'}
                        </button>
                    </div>
                </div>

                {/* Company Actions (Owner Only) */}
                {currentUserRole === 'owner' && companyId && (
                    <div
                        className="p-6 rounded-xl border transition-colors md:col-span-2"
                        style={{
                            backgroundColor: 'var(--color-warn-dim)',
                            borderColor: 'rgba(255, 107, 53, 0.2)'
                        }}
                    >
                        <div className="flex flex-col gap-6">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                                    <Trash2 className="w-5 h-5" style={{ color: 'var(--color-warn)' }} />
                                    Şirket Yönetimi ({companyName})
                                </h3>
                                <p className="text-sm mt-2" style={{ color: 'var(--color-text-2)' }}>
                                    Şirket verilerini arşivleyin veya kalıcı olarak silin.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleArchiveCompany}
                                    disabled={!!loadingAction}
                                    className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    style={{
                                        backgroundColor: 'var(--color-surface-1)',
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text-0)'
                                    }}
                                >
                                    {loadingAction === 'archive_company' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                    Şirketi Arşivle
                                </button>

                                <button
                                    onClick={handleHardDeleteCompany}
                                    disabled={!!loadingAction}
                                    className="px-4 py-2 bg-red-600 text-white border border-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ml-auto"
                                    style={{
                                        backgroundColor: 'var(--color-danger)',
                                        borderColor: 'var(--color-danger)'
                                    }}
                                >
                                    {loadingAction === 'delete_company' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Şirketi Kalıcı Sil
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
