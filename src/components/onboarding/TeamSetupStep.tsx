'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, MailPlus, Loader2, Link } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth-store'

export default function TeamSetupStep({ onComplete, onSkip }: { onComplete: () => void, onSkip: () => void }) {
    const { user } = useAuthStore()
    const [invites, setInvites] = useState([{ email: '', role: 'staff' }])
    const [loading, setLoading] = useState(false)

    const addField = () => {
        if (invites.length >= 5) {
            toast.error('Tek seferde en fazla 5 davet gönderebilirsiniz.')
            return
        }
        setInvites([...invites, { email: '', role: 'staff' }])
    }

    const removeField = (index: number) => {
        const newInvites = [...invites]
        newInvites.splice(index, 1)
        setInvites(newInvites)
    }

    const handleChange = (index: number, key: string, value: string) => {
        const newInvites = [...invites]
        newInvites[index] = { ...newInvites[index], [key]: value }
        setInvites(newInvites)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const validEmails = invites.filter(inv => inv.email.trim().length > 0)

        if (validEmails.length === 0) {
            toast.error('Lütfen en az bir geçerli e-posta girin.')
            return
        }

        setLoading(true)

        try {
            // Need to call API route for proper webhook and token hashing functionality
            // We use the existing invite API
            let successCount = 0
            for (const inv of validEmails) {
                const response = await fetch('/api/invite/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: inv.email.trim(), role: inv.role })
                })

                if (response.ok) successCount++
            }

            if (successCount > 0) {
                toast.success(`${successCount} kişiye davet linkleri başarıyla gönderildi!`)
                onComplete()
            } else {
                toast.error('Davetler gönderilirken bir hata oluştu.')
            }

        } catch (err: any) {
            console.error('Invite error:', err)
            toast.error('İşlem başarısız oldu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Ekibinizi Davet Edin</h2>
                <p className="text-center mb-6 text-sm text-gray-400">
                    Sistem daha fazla kişiyle daha iyi çalışır. Ekip üyelerinize davet yollayın.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {invites.map((invite, index) => (
                    <div key={index} className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="email"
                                value={invite.email}
                                onChange={(e) => handleChange(index, 'email', e.target.value)}
                                className="w-full bg-[#0f0f13] border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                                placeholder="E-posta adresi (isim@sirket.com)"
                            />
                        </div>
                        <div className="w-1/3">
                            <select
                                value={invite.role}
                                onChange={(e) => handleChange(index, 'role', e.target.value)}
                                className="w-full bg-[#0f0f13] border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                            >
                                <option value="staff">Personel (Sınırlı)</option>
                                <option value="admin">Yönetici (Tam Yetki)</option>
                            </select>
                        </div>
                        {invites.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeField(index)}
                                className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/50 transition-colors"
                            >
                                Sil
                            </button>
                        )}
                    </div>
                ))}

                <div className="flex justify-between items-center px-1">
                    <button
                        type="button"
                        onClick={addField}
                        className="flex items-center text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                        <MailPlus className="w-4 h-4 mr-1" /> Yeni Kişi Ekle
                    </button>
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="w-1/3 py-3 px-4 rounded-xl font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm text-center"
                    >
                        Bu Adımı Atla
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Davetleri Gönder'}
                    </button>
                </div>
            </form>

            <div className="mt-6 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-sm text-gray-400 flex items-start">
                <Link className="min-w-4 w-4 h-4 mt-0.5 inline-block mr-2 text-indigo-400" />
                Sonradan panel ayarlarından toplu davetiye linki veya bireyseller atayabilirsiniz.
            </div>
        </div>
    )
}
