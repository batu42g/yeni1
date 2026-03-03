'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { ShieldCheck, Lock, Smartphone, RefreshCw, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react'

export default function SecurityPage() {
    const { user } = useAuthStore()
    const [initialLoading, setInitialLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)
    const [enrollFactorId, setEnrollFactorId] = useState('')
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const [secret, setSecret] = useState('')
    const [verifyCode, setVerifyCode] = useState('')
    const [showEnroll, setShowEnroll] = useState(false)
    const [copied, setCopied] = useState(false)

    // Session info state
    const [sessionInfo, setSessionInfo] = useState<{
        created_at: string | null
        last_sign_in_at: string | null
        user_agent: string | null
        ip: string | null
    } | null>(null)

    useEffect(() => {
        checkMfaStatus()
        loadSessionInfo()
    }, [user])

    const loadSessionInfo = async () => {
        const supabase = createClient()
        try {
            // Mevcut oturum bilgisi
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                // user metadata'dan last_sign_in_at al
                const { data: { user } } = await supabase.auth.getUser()
                setSessionInfo({
                    created_at: session.user?.created_at || null,
                    last_sign_in_at: user?.last_sign_in_at || null,
                    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                    ip: null, // Client-side IP alınamaz, ileride API route ile eklenebilir
                })
            }
        } catch (e) {
            console.error('Session info error:', e)
        }
    }

    const checkMfaStatus = async () => {
        if (!user) return
        const supabase = createClient()
        try {
            const { data, error } = await supabase.auth.mfa.listFactors()
            if (error) throw error

            const totpFactor = data.totp.find(f => f.status === 'verified')
            setIsEnabled(!!totpFactor)
        } catch (error) {
            console.error('MFA Check Error:', error)
        } finally {
            setInitialLoading(false)
        }
    }

    const startEnrollment = async () => {
        setActionLoading(true)
        const supabase = createClient()
        try {
            // Cleanup previous unverified attempts sequentially to prevent limits/race-conditions
            const { data: listData, error: listError } = await supabase.auth.mfa.listFactors()
            if (!listError && listData && listData.totp) {
                // @ts-ignore
                const unverified = listData.totp.filter(f => f.status === 'unverified')
                for (const f of unverified) {
                    await supabase.auth.mfa.unenroll({ factorId: f.id })
                }
            }

            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            })

            if (error) throw error

            setEnrollFactorId(data.id)
            setSecret(data.totp.secret)

            if (data.totp.uri) {
                const url = await QRCode.toDataURL(data.totp.uri)
                setQrCodeUrl(url)
            }

            setShowEnroll(true)
        } catch (error: any) {
            toast.error(error.message || 'MFA başlatılamadı')
        } finally {
            setActionLoading(false)
        }
    }

    const verifyAndActivate = async () => {
        if (!verifyCode || verifyCode.length !== 6) {
            toast.error('Lütfen 6 haneli kodu girin')
            return
        }
        setActionLoading(true)
        const supabase = createClient()

        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: enrollFactorId,
                code: verifyCode,
            })

            if (error) throw error

            toast.success('2FA Başarıyla Aktifleştirildi! 🎉')
            setIsEnabled(true)
            setShowEnroll(false)
            setVerifyCode('')
        } catch (error: any) {
            console.error('Verify Error:', error)
            toast.error(error.message || 'Kod doğrulanamadı. Tekrar deneyin.')
        } finally {
            setActionLoading(false)
        }
    }

    const disableMFA = async () => {
        if (!confirm('2FA korumasını kaldırmak istediğinize emin misiniz?')) return

        setActionLoading(true)
        const supabase = createClient()

        try {
            const { data } = await supabase.auth.mfa.listFactors()
            const factor = data?.totp.find(f => f.status === 'verified')

            if (!factor) return

            const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
            if (error) throw error

            toast.success('2FA devre dışı bırakıldı')
            setIsEnabled(false)
        } catch (error: any) {
            toast.error(error.message || 'İşlem başarısız')
        } finally {
            setActionLoading(false)
        }
    }

    const copySecret = () => {
        navigator.clipboard.writeText(secret)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success('Secret kopyalandı')
    }

    if (initialLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="w-8 h-8 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-0)' }}>Hesap Güvenliği</h1>
                <p className="text-sm mt-2" style={{ color: 'var(--color-text-3)' }}>
                    Hesabınızı korumak için güvenlik ayarlarınızı yönetin.
                </p>
            </div>

            <div className="p-6 rounded-2xl border bg-opacity-50" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-0)' }}>
                                İki Aşamalı Doğrulama (2FA)
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 max-w-lg">
                                Hesabınıza giriş yaparken şifrenize ek olarak telefonunuzdaki uygulamadan üretilen geçici bir kod ister.
                                Bu, hesabınızın çalınmasını neredeyse imkansız hale getirir.
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${isEnabled ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                                    {isEnabled ? 'AKTİF' : 'PASİF'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!showEnroll && (
                        <button
                            onClick={isEnabled ? disableMFA : startEnrollment}
                            disabled={actionLoading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isEnabled
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                : 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20'
                                }`}
                        >
                            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEnabled ? 'Devre Dışı Bırak' : 'Kurulumu Başlat'}
                        </button>
                    )}
                </div>

                {/* Enrollment Flow */}
                {showEnroll && (
                    <div className="mt-8 pt-8 border-t border-gray-800 animation-expand">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl relative">
                                {qrCodeUrl ? (
                                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 rounded" />
                                ) : (
                                    <div className="w-48 h-48 bg-gray-800 animate-pulse rounded flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 mt-4 text-center">
                                    Google Authenticator veya Authy uygulamasıyla taratın.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-white mb-2">1. QR Kodu Taratın</h4>
                                    <p className="text-sm text-gray-400">
                                        Telefonunuzdaki Authenticator uygulamasını açın ve soldaki QR kodu taratın.
                                    </p>
                                    <div className="mt-4 p-3 bg-black/20 rounded-lg border border-gray-800 flex items-center justify-between">
                                        <code className="text-xs font-mono text-gray-300">{secret}</code>
                                        <button onClick={copySecret} className="text-gray-400 hover:text-white transition-colors">
                                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-white mb-2">2. Doğrulama Kodunu Girin</h4>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000 000"
                                            className="bg-[#0f0f13] border border-gray-700 rounded-lg px-4 py-2 text-white w-32 text-center tracking-widest text-lg focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                        <button
                                            onClick={verifyAndActivate}
                                            disabled={verifyCode.length !== 6 || actionLoading}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all w-40 justify-center"
                                        >
                                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Onayla'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowEnroll(false)}
                                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    İptal Et
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Security Log */}
            <div className="p-6 rounded-2xl border bg-opacity-50" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-6">
                    <Smartphone className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-0)' }}>Giriş Cihazları</h3>
                </div>

                {sessionInfo ? (
                    <div className="space-y-3">
                        {/* Bu Cihaz Kartı */}
                        <div
                            className="flex items-start justify-between gap-4 p-4 rounded-xl border transition-colors"
                            style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
                        >
                            <div className="flex items-start gap-4">
                                {/* Cihaz İkonu */}
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    <Smartphone className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-0)' }}>
                                            {parseUserAgent(sessionInfo.user_agent)}
                                        </p>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                            Bu Cihaz
                                        </span>
                                    </div>
                                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                                        {parseOS(sessionInfo.user_agent)}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2">
                                        {sessionInfo.last_sign_in_at && (
                                            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                                                <span style={{ color: 'var(--color-text-2)' }}>Son giriş: </span>
                                                {new Date(sessionInfo.last_sign_in_at).toLocaleString('tr-TR', {
                                                    day: '2-digit', month: 'long', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        )}
                                    </div>
                                    {sessionInfo.created_at && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                                            <span style={{ color: 'var(--color-text-2)' }}>Hesap oluşturuldu: </span>
                                            {new Date(sessionInfo.created_at).toLocaleDateString('tr-TR', {
                                                day: '2-digit', month: 'long', year: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Aktif Badge */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-xs text-green-400 font-medium">Aktif</span>
                            </div>
                        </div>

                        <p className="text-xs pt-2" style={{ color: 'var(--color-text-3)' }}>
                            Tanımadığınız bir cihaz görürseniz şifrenizi hemen değiştirin.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 py-4" style={{ color: 'var(--color-text-3)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Oturum bilgisi yükleniyor...</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// User-Agent parse yardımcıları
function parseUserAgent(ua: string | null): string {
    if (!ua) return 'Bilinmeyen Tarayıcı'
    if (ua.includes('Edg/')) return 'Microsoft Edge'
    if (ua.includes('Chrome')) return 'Google Chrome'
    if (ua.includes('Firefox')) return 'Mozilla Firefox'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
    return 'Web Tarayıcısı'
}

function parseOS(ua: string | null): string {
    if (!ua) return ''
    if (ua.includes('Windows NT 10.0')) return 'Windows 10/11'
    if (ua.includes('Windows NT 6.1')) return 'Windows 7'
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac OS X')) return 'macOS'
    if (ua.includes('iPhone')) return 'iOS (iPhone)'
    if (ua.includes('iPad')) return 'iPadOS'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('Linux')) return 'Linux'
    return 'Bilinmeyen İşletim Sistemi'
}
