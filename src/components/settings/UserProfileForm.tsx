'use client'

import { useState, useEffect } from 'react'
import { uploadPublicFile } from '@/lib/storage'
import { Upload, Loader2, User as UserIcon, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

export function UserProfileForm() {
    const [fullName, setFullName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [emailMasked, setEmailMasked] = useState('')

    const [loadingData, setLoadingData] = useState(true)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await fetch('/api/settings/user')
                if (res.ok) {
                    const data = await res.json()
                    setFullName(data.full_name || '')
                    setAvatarUrl(data.avatar_url || null)
                    setEmailMasked(data.email_masked || '')
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoadingData(false)
            }
        }
        fetchUserData()
    }, [])

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Dosya boyutu 2MB\'dan küçük olmalı')
            return
        }

        setUploading(true)
        try {
            const url = await uploadPublicFile(file, 'avatars')
            setAvatarUrl(url)
            toast.success('Profil fotoğrafı yüklendi')
        } catch (error: any) {
            toast.error('Fotoğraf yüklenemedi: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/settings/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to update')
            }

            toast.success('Profil bilgileriniz güncellendi')
            // Refresh window slightly if navbar avatar relies on it
            setTimeout(() => window.location.reload(), 1500)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (loadingData) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar Section */}
                <div className="w-full md:w-1/3 space-y-4">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-3)' }}>Profil Fotoğrafı</label>
                    <div className="relative group">
                        <div
                            className="aspect-square w-full max-w-[200px] border-2 border-dashed rounded-full overflow-hidden flex items-center justify-center relative transition-colors group-hover:border-indigo-500/50"
                            style={{
                                background: 'var(--color-surface-2)',
                                borderColor: 'var(--color-border)',
                            }}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-16 h-16" style={{ color: 'var(--color-text-3)' }} />
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer z-10">
                                <Upload className="w-8 h-8 text-white" />
                                <span className="text-xs text-white font-medium">Değiştir</span>
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer z-20 rounded-full"
                                disabled={uploading}
                            />
                        </div>
                        <div className="flex items-center justify-center max-w-[200px] gap-3 mt-4">
                            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                                Max 2MB
                            </p>
                            {avatarUrl && (
                                <button
                                    type="button"
                                    onClick={() => { setAvatarUrl(null); toast.success('Fotoğraf kaldırıldı. Kaydetmeyi unutmayın.') }}
                                    className="flex items-center gap-1 text-xs transition-colors"
                                    style={{ color: 'var(--color-danger)' }}
                                >
                                    <X className="w-3 h-3" />
                                    Kaldır
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="w-full md:w-2/3 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Ad Soyad</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-lg px-4 py-3 outline-none transition-all"
                                placeholder="Adınız Soyadınız"
                                style={{
                                    backgroundColor: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-0)',
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-3)' }}>E-posta (Maskelenmiş)</label>
                            <input
                                type="text"
                                value={emailMasked}
                                disabled
                                className="w-full rounded-lg px-4 py-3 outline-none cursor-not-allowed opacity-60"
                                style={{
                                    backgroundColor: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-0)',
                                }}
                            />
                            <p className="text-xs mt-2" style={{ color: 'var(--color-text-3)' }}>Güvenlik politikası gereği destek ekibi olmadan hesap e-postasını değiştiremezsiniz.</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: 'var(--color-accent)',
                                color: '#000',
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Değişiklikleri Kaydet
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    )
}
