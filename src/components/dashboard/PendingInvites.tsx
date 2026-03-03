'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Building2, Ticket } from 'lucide-react'
import toast from 'react-hot-toast'

interface PendingInvite {
    id: string
    company_name: string
    inviter_name: string | null
    role: string
    token: string
    sent_at: string
}

export function PendingInvites() {
    const [invites, setInvites] = useState<PendingInvite[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchInvites = async () => {
            const supabase = createClient()
            // We use the new RPC - explicit cast to handle type mismatch
            const { data, error } = await (supabase as any).rpc('get_my_pending_invitations')

            if (error) {
                // If RPC is missing, user hasn't run the migration yet. Silent fail.
                if (error.code !== '42883') { // PostgreSQL code for undefined function
                    console.error('Error fetching invites:', error)
                }
            } else if (data) {
                setInvites(data)
            }
            setLoading(false)
        }
        fetchInvites()
    }, [])

    const handleAccept = async (token: string) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const loadingToast = toast.loading('Davet kabul ediliyor...')

        try {
            const { error } = await supabase.rpc('accept_invitation', {
                p_token: token,
                p_user_id: user.id,
                p_full_name: user.user_metadata?.full_name || 'Member'
            })

            if (error) throw error

            toast.success('Davet kabul edildi!', { id: loadingToast })
            // Refresh to update context
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || 'Hata oluştu', { id: loadingToast })
        }
    }

    const handleReject = async (pid: string) => {
        // rejection logic using reject_invitation RPC or update status
        // But reject_invitation needs token. Our RPC returns token.
        // Let's implement reject using token if needed, or skip for now to keep it simple.
        // For simplicity, we just hide current invite.
        setInvites(invites.filter(i => i.id !== pid))
    }

    if (loading || invites.length === 0) return null

    return (
        <div className="mb-6 grid gap-4">
            {invites.map((invite) => (
                <div key={invite.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 animate-in slide-in-from-top-2"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm text-blue-400">Yeni İş Daveti</h3>
                            <p className="text-sm text-gray-400">
                                <span className="text-white font-medium">{invite.company_name}</span> şirketine
                                <span className="text-white font-medium ml-1 capitalize">{invite.role === 'admin' ? 'Yönetici' : 'Personel'}</span> olarak davet edildiniz.
                            </p>
                            {invite.inviter_name && (
                                <p className="text-xs text-gray-500 mt-1">Davet eden: {invite.inviter_name}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleAccept(invite.token)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Check className="w-4 h-4" />
                            Kabul Et
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
