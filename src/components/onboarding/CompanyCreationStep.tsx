'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, ChevronRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CompanyCreationStep({ onComplete }: { onComplete: () => void }) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError('')
        const supabase = createClient()

        try {
            const { error } = await supabase.rpc('create_company', {
                company_name: name.trim()
            })

            if (error) throw error

            toast.success('Şirket oluşturuldu!')
            onComplete()

        } catch (err: any) {
            console.error('Error creating company:', err)
            setError('Şirket oluşturulurken bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-center text-white">Yeni Şirket Oluştur</h2>
                <p className="text-center mb-6 text-sm text-gray-400">
                    Ekibinizi ve projelerinizi yönetmeye başlamak için şirketinizi kurun.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Şirket Adı</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#0f0f13] border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                        placeholder="Örn: Acme Inc."
                        required
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Şirketi Kur
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
