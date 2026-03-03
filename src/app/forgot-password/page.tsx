'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Zap, Mail, ArrowRight, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            })

            if (error) throw error

            setSent(true)
            toast.success('Sıfırlama bağlantısı gönderildi!')
        } catch (error: any) {
            console.error('Reset error:', error)
            toast.error(error.message || 'Bir hata oluştu')
        } finally {
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
            </div>

            {/* Left branding panel */}
            <div className="hidden lg:flex flex-col justify-between flex-1 p-12 relative noise-overlay">
                <div className="relative z-10">
                    <Link href="/login" className="flex items-center gap-3 mb-16 hover:opacity-80 transition-opacity">
                        <div
                            className="flex items-center justify-center w-11 h-11 rounded-xl"
                            style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #00b8d4 100%)' }}
                        >
                            <Zap className="w-6 h-6 text-black" strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-bold" style={{ color: 'var(--color-text-0)' }}>
                            CRM<span style={{ color: 'var(--color-accent)' }}>Panel</span>
                        </span>
                    </Link>

                    <h2
                        className="text-5xl font-bold leading-tight mb-6"
                        style={{ color: 'var(--color-text-0)' }}
                    >
                        Hesabınızı<br />
                        <span className="gradient-accent">kurtarın</span>.
                    </h2>
                    <p className="text-lg max-w-md" style={{ color: 'var(--color-text-2)' }}>
                        Endişelenmeyin, hesabınıza tekrar erişmenizi sağlayacağız.
                    </p>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md">
                    <div className="lg:hidden mb-8">
                        <Link href="/login" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>
                            <ArrowLeft className="w-4 h-4" />
                            Giriş'e dön
                        </Link>
                    </div>

                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-0)' }}>
                        Şifrenizi mi unuttunuz?
                    </h1>
                    <p className="text-sm mb-8" style={{ color: 'var(--color-text-3)' }}>
                        E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                    </p>

                    {sent ? (
                        <div className="text-center p-6 rounded-xl border border-dashed animate-fade-in" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}>
                            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--color-accent-glow)' }}>
                                <Mail className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                            </div>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-0)' }}>E-posta Gönderildi!</h3>
                            <p className="text-sm mb-6" style={{ color: 'var(--color-text-3)' }}>
                                Lütfen <strong>{email}</strong> adresini kontrol edin. Gelen kutunuzda bulamazsanız spam klasörüne bakmayı unutmayın.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                                style={{ color: 'var(--color-accent)' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Giriş sayfasına dön
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                                    E-posta Adresi
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
                                        className="input-field pl-10 w-full"
                                        placeholder="ornek@sirket.com"
                                        required
                                        autoFocus
                                    />
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
                                        Sıfırlama Linki Gönder
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="text-sm hover:underline"
                                    style={{ color: 'var(--color-text-3)' }}
                                >
                                    Giriş sayfasına dön
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
