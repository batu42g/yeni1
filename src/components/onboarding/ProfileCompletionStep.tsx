'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogIn } from 'lucide-react'

export default function ProfileCompletionStep({ onComplete }: { onComplete: () => void }) {
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fullName.trim() || fullName.trim().length < 3) {
            setError('Lütfen geçerli bir ad soyad giriniz')
            return
        }
        setLoading(true)
        setError('')

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('Kullanıcı bulunamadı')

            const { error: updateError } = await supabase
                .from('users')
                .update({ full_name: fullName.trim() })
                .eq('id', user.id)

            if (updateError) throw updateError

            onComplete()
        } catch (err: any) {
            console.error('Profile completion error:', err)
            setError('Profil güncellenirken bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-center">Hoş Geldiniz</h2>
            <p className="text-center mb-6 text-sm" style={{ color: 'var(--color-text-2)' }}>
                Sistemi kullanmaya başlamadan önce profil bilgilerinizi tamamlayalım.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Adınız Soyadınız</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
                        style={{
                            background: 'var(--color-surface-2)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-1)',
                        }}
                        placeholder="Örn: Ahmet Yılmaz"
                        required
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                    type="submit"
                    disabled={loading || !fullName.trim()}
                    className="w-full py-3 px-4 rounded-xl font-medium transition-colors flex justify-center items-center disabled:opacity-50"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-accent) 0%, #00b8d4 100%)',
                        color: 'black',
                    }}
                >
                    {loading ? 'Kaydediliyor...' : (
                        <>
                            Devam Et <LogIn className="ml-2 w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
