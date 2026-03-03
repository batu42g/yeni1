'use client'

import { useState } from 'react'
import { CreditCard, Rocket, Loader2 } from 'lucide-react'

export default function BillingSetupStep({ onComplete }: { onComplete: () => void }) {
    const [loading, setLoading] = useState(false)

    // Örnek ödeme simülasyonu
    const handleContinue = async () => {
        setLoading(true)
        try {
            // Ödeme entegrasyonu (Stripe/Iyzico vb) buraya gelecek
            // Şimdilik sadece adımı geçiyoruz
            await new Promise(resolve => setTimeout(resolve, 1000))
            onComplete()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                    <CreditCard className="h-6 w-6 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Abonelik Başlatın</h2>
                <p className="text-center mb-6 text-sm text-gray-400">
                    Özelliklerin sınırlarını kaldırmak için bir plana geçiş yapın.
                </p>
            </div>

            <div className="space-y-4">
                <div className="p-6 border-2 border-purple-500 bg-purple-500/5 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        ÖNERİLEN
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <Rocket className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold text-white">Pro Plan</h3>
                    </div>
                    <div className="text-2xl font-bold text-white mb-4">
                        ₺99
                        <span className="text-sm font-normal text-gray-400">/ay</span>
                    </div>
                    <ul className="text-sm text-gray-400 space-y-2 mb-6">
                        <li className="flex items-center">• Sınırsız kullanıcılı şirket</li>
                        <li className="flex items-center">• Özel webhook limitleri</li>
                        <li className="flex items-center">• Gelişmiş veri izolasyonu</li>
                    </ul>
                    <button
                        onClick={handleContinue}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Denemeyi Başlat ve Devam Et'}
                    </button>

                    <div className="mt-4 text-center">
                        <button
                            onClick={onComplete}
                            className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                            Şimdilik devam et (Ücretsiz Plan)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
