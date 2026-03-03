'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Zap, Mail, Lock, ArrowRight, Sparkles, ShieldCheck, Loader2 } from 'lucide-react'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const inviteToken = searchParams.get('invite')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'login' | 'mfa'>('login')
    const [mfaCode, setMfaCode] = useState('')
    const [mfaFactorId, setMfaFactorId] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                // Fire-and-forget: log failed login
                fetch('/api/auth/audit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, success: false, errorMessage: error.message })
                }).catch(() => { })

                toast.error(error.message)
                setLoading(false)
                return
            }

            // Fire-and-forget: log successful login
            fetch('/api/auth/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, success: true })
            }).catch(() => { })

            // Check if MFA is enabled (AAL check)
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

            if (mfaError) {
                console.error('MFA Check Error:', mfaError)
                router.push('/dashboard')
                return
            }

            if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
                // MFA is required (AAL2)
                const { data: factors } = await supabase.auth.mfa.listFactors()
                const totpFactor = factors?.totp.find(f => f.status === 'verified')

                if (totpFactor) {
                    setMfaFactorId(totpFactor.id)
                    setStep('mfa')
                    toast('Lütfen doğrulama kodunu girin', { icon: '🔒' })
                    setLoading(false)
                    return
                }
            }

            toast.success('Giriş başarılı!')

            // Redirect to invite page if token exists
            if (inviteToken) {
                router.push(`/join?token=${inviteToken}`)
            } else {
                router.push('/dashboard')
            }
            router.refresh()
        } catch (error: any) {
            console.error('Login error:', error)
            toast.error('Bir hata oluştu')
            setLoading(false)
        }
    }

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: mfaFactorId,
                code: mfaCode,
            })

            if (error) {
                toast.error('Kod hatalı veya süresi dolmuş')
                setLoading(false)
                return
            }

            toast.success('Güvenli giriş başarılı!')
            if (inviteToken) {
                router.push(`/join?token=${inviteToken}`)
            } else {
                router.push('/dashboard')
            }
            router.refresh()
        } catch (error) {
            toast.error('Doğrulama hatası')
            setLoading(false)
        }
    }

    const handleDemoLogin = async () => {
        setLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({
                email: 'demo@crmpanel.dev',
                password: 'demo123456',
            })

            if (error) {
                toast.error('Demo hesabı bulunamadı. Lütfen önce kayıt olun.')
                setLoading(false)
                return
            }

            toast.success('Demo hesabıyla giriş yapıldı!')
            router.push('/dashboard')
            router.refresh()
        } catch {
            toast.error('Bir hata oluştu')
            setLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen flex relative overflow-hidden"
            style={{ background: 'var(--color-surface-0)' }}
        >
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(0, 184, 212, 0.08) 0%, transparent 70%)',
                        filter: 'blur(80px)',
                    }}
                />
            </div>

            {/* Left branding panel */}
            <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative noise-overlay">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div
                            className="flex items-center justify-center w-11 h-11 rounded-xl"
                            style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #00b8d4 100%)' }}
                        >
                            <Zap className="w-6 h-6 text-black" strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-bold" style={{ color: 'var(--color-text-0)' }}>
                            CRM<span style={{ color: 'var(--color-accent)' }}>Panel</span>
                        </span>
                    </div>

                    <h2
                        className="text-5xl font-bold leading-tight mb-6"
                        style={{ color: 'var(--color-text-0)' }}
                    >
                        İşinizi<br />
                        <span className="gradient-accent">yönetmenin</span><br />
                        modern yolu.
                    </h2>
                    <p className="text-lg max-w-md" style={{ color: 'var(--color-text-2)' }}>
                        Multi-tenant CRM sistemi ile müşterilerinizi, projelerinizi ve ekibinizi tek bir panelden yönetin.
                    </p>
                </div>

                <div className="relative z-10 flex gap-6">
                    {[
                        { label: 'Güvenli', desc: 'RLS korumalı' },
                        { label: 'Hızlı', desc: 'Realtime sync' },
                        { label: 'Modern', desc: 'Next.js 15' },
                    ].map((item) => (
                        <div key={item.label} className="flex flex-col">
                            <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                                {item.label}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                                {item.desc}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md animate-fade-in">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 mb-8 lg:hidden">
                        <div
                            className="flex items-center justify-center w-10 h-10 rounded-xl"
                            style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #00b8d4 100%)' }}
                        >
                            <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-bold" style={{ color: 'var(--color-text-0)' }}>
                            CRM<span style={{ color: 'var(--color-accent)' }}>Panel</span>
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-0)' }}>
                        {step === 'login' ? 'Tekrar hoşgeldiniz' : 'Güvenlik Doğrulaması'}
                    </h1>
                    <p className="text-sm mb-8" style={{ color: 'var(--color-text-3)' }}>
                        {step === 'login'
                            ? 'Hesabınıza giriş yapın ve yönetim panelinize erişin.'
                            : 'Lütfen Authenticator uygulamanızdaki 6 haneli kodu girin.'}
                    </p>

                    {step === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                                    E-posta
                                </label>
                                <div className="relative">
                                    <Mail
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                        style={{ color: 'var(--color-text-3)' }}
                                    />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field pl-10"
                                        placeholder="ornek@sirket.com"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                                    Şifre
                                </label>
                                <div className="relative">
                                    <Lock
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                        style={{ color: 'var(--color-text-3)' }}
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field pl-10"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="flex justify-end mt-1">
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs hover:underline"
                                        style={{ color: 'var(--color-accent)' }}
                                    >
                                        Şifremi unuttum?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="inline-block w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Giriş Yap
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center gap-3 my-6">
                                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                                <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>veya</span>
                                <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                            </div>

                            <button
                                type="button"
                                onClick={handleDemoLogin}
                                disabled={loading}
                                className="btn-secondary w-full justify-center py-3 disabled:opacity-50"
                            >
                                <Sparkles className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                                Demo Hesabıyla Giriş Yap
                            </button>

                            <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-3)' }}>
                                Hesabınız yok mu?{' '}
                                <Link href="/register" className="font-semibold hover:underline" style={{ color: 'var(--color-accent)' }}>
                                    Kayıt Olun
                                </Link>
                            </p>
                        </form>
                    ) : (
                        <form onSubmit={handleMfaVerify} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center animate-pulse">
                                    <ShieldCheck className="w-8 h-8 text-indigo-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-center text-sm font-medium mb-3" style={{ color: 'var(--color-text-2)' }}>
                                    Doğrulama Kodu
                                </label>
                                <input
                                    type="text"
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="input-field text-center text-2xl tracking-[0.5em] font-mono h-14"
                                    placeholder="000000"
                                    required
                                    autoFocus
                                    maxLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || mfaCode.length !== 6}
                                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Doğrula
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('login')}
                                className="w-full text-sm text-center hover:underline mt-4"
                                style={{ color: 'var(--color-text-3)' }}
                            >
                                Geri Dön
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

import { Suspense } from 'react'

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
