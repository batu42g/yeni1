'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ChevronRight, Loader2, Building2, User, Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react'

function RegisterContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const inviteToken = searchParams.get('invite')
    const { setUser } = useAuthStore()

    // Steps: credentials -> company -> profile
    // If invite flow: credentials -> profile (company step skipped)
    const [step, setStep] = useState<'credentials' | 'company' | 'profile'>('credentials')

    // Form Data
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [fullName, setFullName] = useState('')

    // Loading & Validation
    const [loading, setLoading] = useState(false)
    const [isValidatingInvite, setIsValidatingInvite] = useState(!!inviteToken)
    const [inviteData, setInviteData] = useState<{ companyName: string, email: string, role: string } | null>(null)

    // Validate Invite Token on Load
    useEffect(() => {
        async function validateInvite() {
            if (!inviteToken) return

            const supabase = createClient()
            const { data, error } = await supabase
                .rpc('get_invitation_by_token', { p_token: inviteToken })

            if (error || !data || data.length === 0 || !data[0].is_valid) {
                toast.error('Geçersiz veya süresi dolmuş davet bağlantısı.')
                router.push('/register') // Remove query param
                setIsValidatingInvite(false)
                return
            }

            const invite = data[0]
            setInviteData({
                companyName: invite.company_name,
                email: invite.email,
                role: invite.role
            })
            setEmail(invite.email) // Auto-fill email
            setIsValidatingInvite(false)
            toast.success(`${invite.company_name} ekibine davet edildiniz!`)
        }

        if (inviteToken) {
            validateInvite()
        }
    }, [inviteToken, router])

    const handleNext = () => {
        if (step === 'credentials') {
            if (!email || !password) return toast.error('E-posta ve şifre zorunludur')
            if (password.length < 6) return toast.error('Şifre en az 6 karakter olmalıdır')

            // If invite flow, skip company step
            if (inviteData) {
                setStep('profile')
            } else {
                setStep('company')
            }
        } else if (step === 'company') {
            if (!companyName) return toast.error('Şirket adı zorunludur')
            setStep('profile')
        }
    }

    const handleSubmit = async () => {
        if (!fullName) return toast.error('Ad Soyad zorunludur')
        setLoading(true)

        const supabase = createClient()

        try {
            // 1. Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            })

            if (authError) {
                // If user already exists, maybe redirect to login?
                if (authError.message.includes('already registered')) {
                    toast.error('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.')
                    // TODO: Redirect to login with invite param?
                } else {
                    toast.error(authError.message)
                }
                setLoading(false)
                return
            }

            if (!authData.user) {
                toast.error('Kayıt işlemi başarısız oldu.')
                setLoading(false)
                return
            }

            // Wait for auth record propagation to avoid FK race conditions
            await new Promise(resolve => setTimeout(resolve, 1500))

            // 2. Create Profile & Company OR Accept Invitation
            if (inviteData && inviteToken) {
                // Accept Invitation Flow
                const { error: rpcError } = await supabase.rpc('accept_invitation', {
                    p_token: inviteToken,
                    p_user_id: authData.user.id,
                    p_full_name: fullName
                })

                if (rpcError) throw rpcError

                toast.success('Davet kabul edildi! Yönlendiriliyorsunuz...')
            } else {
                // New Company Registration Flow
                const { error: rpcError } = await supabase.rpc('handle_registration', {
                    p_user_id: authData.user.id,
                    p_company_name: companyName,
                    p_full_name: fullName,
                })

                if (rpcError) throw rpcError

                toast.success('Hesap oluşturuldu! Yönlendiriliyorsunuz...')
            }

            // 3. Set User to Store & Redirect
            // Wait a bit for trigger/RPC to finish ensuring data consistency
            setTimeout(async () => {
                // Fetch fresh user data including company_id and role
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authData.user!.id)
                    .single()

                if (userData) {
                    setUser({
                        ...authData.user!,
                        role: userData.role,
                        company_id: userData.company_id,
                    } as any)
                    router.push('/dashboard')
                } else {
                    // Fallback if data is not ready yet
                    router.push('/login')
                }
            }, 1000)

        } catch (error: any) {
            console.error('Registration error:', error)
            toast.error('Bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
            setLoading(false)
        }
    }

    if (isValidatingInvite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                    <p className="text-gray-400">Davetiniz doğrulanıyor...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Sol taraf - Görsel Alan */}
            <div className="hidden lg:flex flex-col justify-between p-12 relative bg-[#1a1a26] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/5"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Building2 className="text-white w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                            SaaS CRM
                        </span>
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <h1 className="text-4xl font-bold leading-tight">
                        {inviteData ? (
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                                {inviteData.companyName} ekibine katılın.
                            </span>
                        ) : (
                            <>
                                İşinizi yönetmenin <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                                    modern yolu.
                                </span>
                            </>
                        )}
                    </h1>
                    <p className="text-lg text-gray-400 max-w-md">
                        {inviteData
                            ? 'Ekip arkadaşlarınız sizi bekliyor. Hemen hesabınızı oluşturun ve iş birliğine başlayın.'
                            : 'Müşterilerinizi, projelerinizi ve finansal süreçlerinizi tek bir yerden, profesyonelce yönetin.'
                        }
                    </p>
                </div>

                <div className="relative z-10 flex gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        <span>Kolay Kurulum</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        <span>7/24 Destek</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        <span>Güvenli Altyapı</span>
                    </div>
                </div>
            </div>

            {/* Sağ taraf - Form */}
            <div className="flex items-center justify-center p-6 bg-[#0f0f13]">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {inviteData ? 'Daveti Kabul Et' : 'Hesap Oluşturun'}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {inviteData
                                ? `${inviteData.email} adresi ile kayıt oluyorsunuz.`
                                : '30 saniyede ücretsiz hesabınızı oluşturun.'}
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mb-8">
                        {['credentials', !inviteData && 'company', 'profile'].filter(Boolean).map((s, i) => (
                            <div key={s as string} className="flex items-center gap-2">
                                <div className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-indigo-500' : 'w-2 bg-gray-700'
                                    }`} />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-6">
                        {step === 'credentials' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">E-posta</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={!!inviteData}
                                            className="w-full bg-[#1a1a26] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            placeholder="ornek@sirket.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Şifre</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-[#1a1a26] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="En az 6 karakter"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleNext}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
                                >
                                    Devam Et
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        )}

                        {step === 'company' && !inviteData && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Şirket Adı</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            className="w-full bg-[#1a1a26] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="Şirketinizin adı"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleNext}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
                                >
                                    Devam Et
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        )}

                        {step === 'profile' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Ad Soyad</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-[#1a1a26] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="Adınız ve Soyadınız"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {inviteData ? 'Daveti Kabul Et' : 'Hesabı Oluştur'}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {!inviteData && (
                            <div className="text-center">
                                <p className="text-sm text-gray-400">
                                    Zaten hesabınız var mı?{' '}
                                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                        Giriş Yap
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0f0f13]">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        }>
            <RegisterContent />
        </Suspense>
    )
}
