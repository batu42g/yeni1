'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Loader2, XCircle, RefreshCw, Mail, Clock, CheckCircle, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import type { UserRole } from '@/types/database'

interface Invitation {
    id: string
    email: string
    role: UserRole
    status: 'pending' | 'accepted' | 'expired' | 'revoked' | 'rejected'
    created_at: string
    expires_at: string
}

export function InvitationsTable({ companyId }: { companyId: string }) {
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchInvitations()
    }, [])

    const fetchInvitations = async () => {
        try {
            const { data, error } = await supabase
                .from('invitations')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setInvitations(data as unknown as Invitation[])
        } catch (error) {
            console.error('Error fetching invitations:', error)
            toast.error('Davetler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const handleRevoke = async (id: string) => {
        if (!confirm('Daveti iptal etmek istediğinize emin misiniz?')) return
        setActionLoading(id)
        try {
            const { error } = await supabase.rpc('revoke_invitation', { invite_id: id })
            if (error) throw error
            toast.success('Davet iptal edildi')
            fetchInvitations()
        } catch (error: any) {
            toast.error(error.message || 'Hata oluştu')
        } finally {
            setActionLoading(null)
        }
    }

    const handleResend = async (id: string) => {
        if (!confirm('Daveti tekrar göndermek istiyor musunuz?')) return
        setActionLoading(id)
        try {
            const newToken = crypto.randomUUID()
            const newExpiry = new Date()
            newExpiry.setDate(newExpiry.getDate() + 7)

            const { error } = await supabase.rpc('resend_invitation', {
                invite_id: id,
                new_token_hash: newToken,
                new_expiry: newExpiry.toISOString()
            })

            if (error) throw error

            const link = `${window.location.origin}/join?token=${newToken}`
            console.log('Resent Invite Link:', link)

            toast.success('Davet yenilendi ve tekrar gönderildi')
            fetchInvitations()
        } catch (error: any) {
            toast.error(error.message || 'Hata oluştu')
        } finally {
            setActionLoading(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-xs border border-yellow-500/20"><Clock className="w-3 h-3" /> Bekliyor</span>
            case 'accepted': return <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-xs border border-green-500/20"><CheckCircle className="w-3 h-3" /> Kabul Edildi</span>
            case 'expired': return <span className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-xs border border-orange-500/20"><Clock className="w-3 h-3" /> Süresi Doldu</span>
            case 'revoked': return <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-xs border border-red-500/20"><Ban className="w-3 h-3" /> İptal Edildi</span>
            default: return <span className="text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded text-xs border border-gray-500/20">{status}</span>
        }
    }

    if (loading) return <div className="p-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>

    if (invitations.length === 0) return null

    return (
        <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5" style={{ color: 'var(--color-text-3)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-0)' }}>Davet Geçmişi</h3>
            </div>

            <div className="grid gap-3">
                {invitations.map((invite) => (
                    <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm"
                        style={{
                            backgroundColor: 'var(--color-surface-1)',
                            borderColor: 'var(--color-border)',
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0"
                                style={{
                                    backgroundColor: 'var(--color-info-dim)', // blue-50 match
                                    borderColor: 'var(--color-info-dim)',
                                    color: 'var(--color-info)'
                                }}
                            >
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-0)' }}>{invite.email}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs capitalize" style={{ color: 'var(--color-text-2)' }}>
                                        {invite.role === 'admin' ? 'Yönetici' : 'Personel'}
                                    </span>
                                    <span className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>•</span>
                                    <span className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>
                                        {new Date(invite.created_at).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {getStatusBadge(invite.status)}

                            <div className="flex items-center justify-end gap-1 w-20">
                                {(invite.status === 'pending' || invite.status === 'expired') && (
                                    <>
                                        <button
                                            onClick={() => handleResend(invite.id)}
                                            disabled={!!actionLoading}
                                            className="p-2 rounded-lg transition-colors hover:bg-blue-500/10 text-blue-500"
                                            title="Tekrar Gönder"
                                        >
                                            {actionLoading === invite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        </button>
                                        {invite.status === 'pending' && (
                                            <button
                                                onClick={() => handleRevoke(invite.id)}
                                                disabled={!!actionLoading}
                                                className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-red-500"
                                                title="İptal Et"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
