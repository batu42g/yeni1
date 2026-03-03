'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowRight, Shield, User, Building2, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface InvitationDetails {
    id: string
    company_name: string
    invited_by_name: string | null
    role: string
    email: string
    inviter_email: string | null
    is_valid: boolean
}

import { Suspense } from 'react'

function JoinContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [loading, setLoading] = useState(true)
    const [invite, setInvite] = useState<InvitationDetails | null>(null)
    const [accepting, setAccepting] = useState(false)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const init = async () => {
            if (!token) {
                setLoading(false)
                return
            }

            const supabase = createClient()

            // Check auth status
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            // Fetch invitation
            const { data, error } = await supabase.rpc('get_invitation_by_token', { p_token: token })

            if (error || !data || data.length === 0) {
                console.error('Invite fetch error:', error)
                toast.error('Davet bulunamadı')
            } else {
                setInvite(data[0] as unknown as InvitationDetails)
            }
            setLoading(false)
        }
        init()
    }, [token])

    const handleAccept = async () => {
        if (!invite || !user) return // Should not happen if button is visible
        setAccepting(true)
        const supabase = createClient()

        try {
            // Check if email matches (Case insensitive)
            if (user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
                toast.error(`Bu davet ${invite.email} hesabı içindir. Lütfen doğru hesapla giriş yapın.`)
                setAccepting(false)
                return
            }

            const { error } = await supabase.rpc('accept_invitation', {
                p_token: token!,
                p_user_id: user.id,
                p_full_name: user.user_metadata?.full_name || 'New Member'
            })

            if (error) throw error

            toast.success('Davet kabul edildi!')
            // Force reload to update company context
            window.location.href = '/dashboard'
        } catch (error: any) {
            console.error('Accept error:', error)
            toast.error(error.message || 'Hata oluştu')
            setAccepting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (!token || !invite || !invite.is_valid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white p-4">
                <div className="bg-[#18181b] border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Davet Geçersiz</h1>
                    <p className="text-gray-400">Bu davet bağlantısının süresi dolmuş veya iptal edilmiş.</p>
                    <Link href="/" className="inline-block bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                        Ana Sayfaya Dön
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:50px_50px]" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg">
                <div className="bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl space-y-8">

                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30 transform rotate-3">
                            <Building2 className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h2 className="text-gray-400 font-medium tracking-wide uppercase text-xs">Ekip Daveti</h2>
                            <h1 className="text-3xl md:text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                {invite.company_name}
                            </h1>
                        </div>
                    </div>

                    {/* Details Card */}
                    <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <User className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Davet Eden</p>
                                <p className="font-medium">{invite.invited_by_name || 'Yetkili'}</p>
                            </div>
                        </div>
                        <div className="h-px bg-white/10" />
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Atanan Rol</p>
                                <p className="font-medium capitalize">{invite.role === 'admin' ? 'Yönetici' : 'Personel'}</p>
                            </div>
                        </div>
                        {invite.inviter_email && (
                            <div className="text-xs text-gray-500 text-right mt-1">
                                (Yönetici İletişim: {invite.inviter_email})
                            </div>
                        )}
                    </div>

                    {/* Action Area */}
                    <div className="space-y-4">
                        {user ? (
                            <div className="space-y-4">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    </div>
                                    <div className="text-sm">
                                        <p className="text-green-400 font-medium">Oturum Açık: {user.email}</p>
                                        <p className="text-gray-400 text-xs">Bu hesaba bağlanılacak.</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAccept}
                                    disabled={accepting}
                                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {accepting ? <Loader2 className="animate-spin" /> : 'Daveti Kabul Et'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!confirm('Bu daveti reddetmek istediğinize emin misiniz?')) return;
                                        const { error } = await createClient().rpc('reject_invitation', { p_token: token! })
                                        if (error) toast.error('Hata oluştu')
                                        else {
                                            toast.success('Davet reddedildi')
                                            router.push('/')
                                        }
                                    }}
                                    className="w-full bg-transparent text-gray-400 font-medium py-3 rounded-xl hover:text-white transition-all text-sm"
                                >
                                    Daveti Reddet
                                </button>

                                {user.email !== invite.email && (
                                    <p className="text-center text-xs text-red-400">
                                        Uyarı: Davet edilen e-posta ({invite.email}) ile giriş yapılan e-posta eşleşmiyor.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                <Link
                                    href={`/login?invite=${token}`}
                                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-center"
                                >
                                    Giriş Yap ve Kabul Et
                                </Link>
                                <Link
                                    href={`/register?invite=${token}`}
                                    className="w-full bg-white/10 text-white font-medium py-4 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-center border border-white/10"
                                >
                                    Hesap Oluştur
                                </Link>
                            </div>
                        )}

                        <p className="text-center text-xs text-gray-500">
                            {invite.email} adresi için gönderilmiştir.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        }>
            <JoinContent />
        </Suspense>
    )
}
