'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, UserPlus, Building, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth-store'

export default function CompanySelectionStep({ onComplete }: { onComplete: () => void }) {
    const { user } = useAuthStore()
    const [invites, setInvites] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        const fetchInvites = async () => {
            if (!user) return
            try {
                const supabase = createClient()
                const { data } = await supabase
                    .from('invitations')
                    .select('*, companies(name, logo_url)')
                    .eq('email', user.email)
                    .eq('accepted', false)

                setInvites(data || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchInvites()
    }, [user])

    const handleAccept = async (token: string, inviteId: string) => {
        setActionLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.rpc('accept_invitation', {
                p_token: token,
                p_user_id: user!.id,
                p_full_name: user!.full_name
            })
            if (error) throw error

            toast.success('Davet kabul edildi!')
            onComplete()

        } catch (err: any) {
            console.error(err)
            toast.error('Davet kabul edilirken hata oluştu.')
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) return (
        <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
    )

    return (
        <div>
            <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                    <UserPlus className="h-6 w-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Bekleyen Davetler</h2>
                <p className="text-center mb-6 text-sm text-gray-400">
                    Şu anda şirketsiz görünüyorsunuz ancak sizi bekleyen davetler var.
                </p>
            </div>

            <div className="space-y-4">
                {invites.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-700 rounded-xl">
                        <p className="text-gray-400">Davetiniz bulunmamaktadır.</p>
                        <button
                            onClick={onComplete} // Forces re-evaluating the flow, likely going to creation
                            className="text-indigo-400 mt-2 text-sm hover:underline"
                        >
                            Yeni şirket oluşturmaya geç {'>'}
                        </button>
                    </div>
                ) : (
                    invites.map((invite) => (
                        <div key={invite.id} className="p-4 bg-[#0f0f13] border border-gray-800 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-800 rounded-lg">
                                    <Building className="w-5 h-5 text-gray-300" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-medium text-white">{invite.companies?.name || 'Bilinmeyen Şirket'}</h4>
                                    <p className="text-xs text-gray-400">Rol: {invite.role}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleAccept(invite.token_hash, invite.id)}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Kabul Et
                            </button>
                        </div>
                    ))
                )}
            </div>

            {invites.length > 0 && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => onComplete()}
                        className="text-gray-500 hover:text-white text-sm transition-colors"
                    >
                        Davetleri yoksay ve kendi şirketimi kur
                    </button>
                </div>
            )}
        </div>
    )
}
