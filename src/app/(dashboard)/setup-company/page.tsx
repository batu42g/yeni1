'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, ChevronRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SetupCompanyPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        const supabase = createClient()

        try {
            const { data, error } = await supabase.rpc('create_company', {
                company_name: name.trim()
            })

            if (error) throw error

            toast.success('Şirket oluşturuldu!')

            // Force refresh to update sidebar context
            window.location.href = '/dashboard'

        } catch (error: any) {
            console.error('Error creating company:', error)
            toast.error('Şirket oluşturulurken bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-indigo-500" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Yeni Şirket Oluştur</h1>
                <p className="text-gray-400">
                    Yeni bir şirket oluşturarak projelerinizi, ekibinizi ve müşterilerinizi yönetmeye başlayın.
                </p>
            </div>

            <div className="bg-[#1a1a26] rounded-2xl border border-gray-800 p-8 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Şirket Adı
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#0f0f13] border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                            placeholder="Örn: Acme Inc."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Şirketi Oluştur
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
