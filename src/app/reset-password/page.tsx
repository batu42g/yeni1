'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Zap, Lock, ArrowRight, Check, X, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Password requirements
    const requirements = [
        { label: 'En az 8 karakter', valid: password.length >= 8 },
        { label: 'Büyük harf', valid: /[A-Z]/.test(password) },
        { label: 'Küçük harf', valid: /[a-z]/.test(password) },
        { label: 'Rakam', valid: /[0-9]/.test(password) },
    ]

    const allValid = requirements.every(r => r.valid)
    const passwordsMatch = password === confirmPassword && password.length > 0

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!allValid || !passwordsMatch) return

        setLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password })

            if (error) throw error

            toast.success('Şifreniz başarıyla güncellendi!')
            setTimeout(() => router.push('/dashboard'), 1500)
        } catch (error: any) {
            console.error('Update error:', error)
            toast.error(error.message || 'Şifre güncellenemedi')
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
                        Yeni bir<br />
                        <span className="gradient-accent">başlangıç</span>.
                    </h2>
                    <p className="text-lg max-w-md" style={{ color: 'var(--color-text-2)' }}>
                        Güçlü bir şifre seçerek hesabınızı güvende tutun.
                    </p>
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md">
                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-0)' }}>
                        Yeni Şifre Belirleyin
                    </h1>
                    <p className="text-sm mb-8" style={{ color: 'var(--color-text-3)' }}>
                        Lütfen yeni şifrenizi girin.
                    </p>

                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* New Password */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                                Yeni Şifre
                            </label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: 'var(--color-text-3)' }}
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-10 pr-10 w-full"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 outline-none"
                                    style={{ color: 'var(--color-text-3)' }}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Requirements List */}
                        <div className="grid grid-cols-2 gap-2">
                            {requirements.map((req, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs transition-colors duration-200"
                                    style={{ color: req.valid ? 'var(--color-accent)' : 'var(--color-text-3)' }}
                                >
                                    {req.valid ? (
                                        <Check className="w-3 h-3 shrink-0" />
                                    ) : (
                                        <div className="w-3 h-3 rounded-full border border-current opacity-50 shrink-0" />
                                    )}
                                    <span className={req.valid ? 'line-through opacity-70' : ''}>{req.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                                Şifre Tekrarı
                            </label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                    style={{ color: 'var(--color-text-3)' }}
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-field pl-10 w-full"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            {password && confirmPassword && (
                                <p className="text-xs mt-1 transition-all flex items-center gap-1"
                                    style={{ color: passwordsMatch ? 'var(--color-accent)' : 'var(--color-danger)' }}
                                >
                                    {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {passwordsMatch ? 'Şifreler eşleşiyor' : 'Şifreler eşleşmiyor'}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !allValid || !passwordsMatch}
                            className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="inline-block w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    Şifreyi Güncelle
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
