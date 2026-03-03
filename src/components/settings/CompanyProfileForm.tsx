'use client'

import { useState } from 'react'
import { uploadPublicFile } from '@/lib/storage'
import { Upload, Loader2, Building2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface CompanyProfileFormProps {
    companyId: string
    initialName: string
    initialLogoUrl: string | null
}

export function CompanyProfileForm({ companyId, initialName, initialLogoUrl }: CompanyProfileFormProps) {
    const [name, setName] = useState(initialName)
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Dosya boyutu 2MB\'dan küçük olmalı')
            return
        }

        setUploading(true)
        try {
            const url = await uploadPublicFile(file, 'logos')
            setLogoUrl(url)
            toast.success('Logo yüklendi')
        } catch (error: any) {
            toast.error('Logo yüklenemedi: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/settings/company', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, logo_url: logoUrl })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to update company')
            }

            toast.success('Şirket bilgileri güncellendi')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Logo Section */}
                <div className="w-full md:w-1/3 space-y-4">
                    <label className="block text-sm font-medium" style={{ color: 'var(--color-text-3)' }}>Şirket Logosu</label>
                    <div className="relative group">
                        <div
                            className="aspect-square w-full max-w-[200px] border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center relative transition-colors group-hover:border-indigo-500/50"
                            style={{
                                background: 'var(--color-surface-2)',
                                borderColor: 'var(--color-border)',
                            }}
                        >
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Company Logo"
                                    className="w-full h-full object-contain p-4"
                                />
                            ) : (
                                <Building2 className="w-16 h-16" style={{ color: 'var(--color-text-3)' }} />
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
                                onChange={handleLogoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                disabled={uploading}
                            />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                                PNG, JPG • Max 2MB
                            </p>
                            {logoUrl && (
                                <button
                                    type="button"
                                    onClick={() => { setLogoUrl(null); toast.success('Logo kaldırıldı. Kaydetmeyi unutmayın.') }}
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
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Şirket Adı</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg px-4 py-3 outline-none transition-all"
                                placeholder="Şirket Adı"
                                style={{
                                    backgroundColor: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-0)',
                                }}
                            />
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
