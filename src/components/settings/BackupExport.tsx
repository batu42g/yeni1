'use client'

import { useState } from 'react'
import { exportCompanyData } from '@/actions/export'
import { Download, Loader2, Database, FileJson } from 'lucide-react'
import toast from 'react-hot-toast'

export function BackupExport() {
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        setLoading(true)
        try {
            const data = await exportCompanyData()

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `crm-backup-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast.success('Yedek dosyası indirildi')
        } catch (error: any) {
            toast.error(error.message || 'Dışa aktarma başarısız')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-glow)' }}>
                    <Database className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold" style={{ color: 'var(--color-text-0)' }}>Veri Yedeği</h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-2)' }}>
                        Tüm şirket verilerinizi (müşteriler, projeler, görevler, teklifler) JSON formatında indirin.
                    </p>
                </div>
            </div>

            <button
                onClick={handleExport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#000',
                }}
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Hazırlanıyor...
                    </>
                ) : (
                    <>
                        <FileJson className="w-4 h-4" />
                        JSON olarak İndir
                    </>
                )}
            </button>
        </div>
    )
}
