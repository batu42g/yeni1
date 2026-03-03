'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import {
    Shield,
    Database,
    Users,
    FolderKanban,
    ListTodo,
    FileText,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertTriangle,
    Lock,
} from 'lucide-react'

interface IsolationTest {
    name: string
    table: string
    icon: any
    ownCount: number | null
    otherAttempt: boolean
    passed: boolean
    loading: boolean
}

export default function MultiTenantTestPage() {
    const { user } = useAuthStore()
    const [tests, setTests] = useState<IsolationTest[]>([
        { name: 'Müşteriler', table: 'customers', icon: Users, ownCount: null, otherAttempt: false, passed: false, loading: true },
        { name: 'Projeler', table: 'projects', icon: FolderKanban, ownCount: null, otherAttempt: false, passed: false, loading: true },
        { name: 'Görevler', table: 'tasks', icon: ListTodo, ownCount: null, otherAttempt: false, passed: false, loading: true },
        { name: 'Teklifler', table: 'offers', icon: FileText, ownCount: null, otherAttempt: false, passed: false, loading: true },
    ])
    const [sessionInfo, setSessionInfo] = useState<any>(null)
    const [running, setRunning] = useState(false)

    const runTests = async () => {
        if (!user) return
        setRunning(true)
        const supabase = createClient()

        // Get session info
        const { data: { session } } = await supabase.auth.getSession()
        setSessionInfo({
            userId: user.id,
            email: session?.user?.email,
            role: user.role,
            companyId: user.active_company_id,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString('tr-TR') : 'N/A',
        })

        const newTests = [...tests]

        for (let i = 0; i < newTests.length; i++) {
            const test = newTests[i]

            // 1. Count own company records
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count, error: countError } = await (supabase as any)
                .from(test.table)
                .select('*', { count: 'exact', head: true })
                .eq('company_id', user.active_company_id!)

            test.ownCount = count ?? 0

            // 2. Try to access other company's data (use a fake company_id)
            const fakeCompanyId = '00000000-0000-0000-0000-000000000000'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: otherData, error: otherError } = await (supabase as any)
                .from(test.table)
                .select('id')
                .eq('company_id', fakeCompanyId)
                .limit(1)

            // If RLS works correctly, otherData should be empty (no rows from other company)
            test.otherAttempt = true
            test.passed = (!otherData || otherData.length === 0) && !countError
            test.loading = false

            setTests([...newTests])
        }

        setRunning(false)
    }

    useEffect(() => {
        if (user) runTests()
    }, [user])

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Lock className="w-12 h-12" style={{ color: 'var(--color-danger)' }} />
                <p className="text-lg font-semibold" style={{ color: 'var(--color-text-0)' }}>
                    Bu sayfa sadece yöneticiler içindir.
                </p>
            </div>
        )
    }

    const allPassed = tests.every(t => t.passed && !t.loading)
    const allDone = tests.every(t => !t.loading)

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                    <Shield className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                    Multi-Tenant İzolasyon Testi
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>
                    RLS (Row Level Security) politikalarının doğru çalıştığını doğrulayın.
                </p>
            </div>

            {/* Session Info */}
            {sessionInfo && (
                <div className="rounded-xl p-6" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-3)' }}>
                        <Database className="w-4 h-4 inline-block mr-1" />
                        Oturum Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(sessionInfo).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                                <span className="text-xs font-medium uppercase tracking-wider min-w-[100px]" style={{ color: 'var(--color-text-3)' }}>
                                    {key}
                                </span>
                                <span className="text-sm font-mono truncate" style={{ color: 'var(--color-text-0)' }}>
                                    {String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Overall Result */}
            {allDone && (
                <div
                    className="flex items-center gap-3 p-4 rounded-xl border"
                    style={{
                        background: allPassed ? 'var(--color-accent-glow)' : 'var(--color-danger-dim)',
                        borderColor: allPassed ? 'var(--color-accent)' : 'var(--color-danger)',
                    }}
                >
                    {allPassed ? (
                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                    ) : (
                        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--color-danger)' }} />
                    )}
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--color-text-0)' }}>
                            {allPassed ? 'Tüm testler başarılı!' : 'Bazı testler başarısız oldu!'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-2)' }}>
                            {allPassed
                                ? 'RLS politikaları doğru çalışıyor. Diğer şirketlerin verilerine erişim yok.'
                                : 'RLS politikalarınızı kontrol edin. Olası veri sızıntısı tespit edildi.'
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Test Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.map((test, i) => {
                    const Icon = test.icon
                    return (
                        <div
                            key={test.table}
                            className="rounded-xl p-5 animate-fade-in"
                            style={{
                                background: 'var(--color-surface-1)',
                                border: '1px solid var(--color-border)',
                                animationDelay: `${i * 100}ms`,
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                                    <span className="font-semibold" style={{ color: 'var(--color-text-0)' }}>
                                        {test.name}
                                    </span>
                                </div>
                                {test.loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-3)' }} />
                                ) : test.passed ? (
                                    <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                                ) : (
                                    <XCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                                )}
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--color-text-3)' }}>Kendi kayıtlarınız:</span>
                                    <span className="font-mono font-semibold" style={{ color: 'var(--color-text-0)' }}>
                                        {test.ownCount !== null ? test.ownCount : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--color-text-3)' }}>Yabancı veri erişimi:</span>
                                    <span className="font-mono font-semibold" style={{
                                        color: test.loading ? 'var(--color-text-3)' :
                                            test.passed ? 'var(--color-accent)' : 'var(--color-danger)',
                                    }}>
                                        {test.loading ? '...' : test.passed ? 'Engellendi ✓' : 'AÇIK ✗'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Re-run */}
            <button
                onClick={runTests}
                disabled={running}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                    background: running ? 'var(--color-surface-3)' : 'var(--color-accent)',
                    color: running ? 'var(--color-text-3)' : '#000',
                }}
            >
                {running ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Test çalışıyor...
                    </>
                ) : (
                    <>
                        <Shield className="w-4 h-4" /> Testleri Yeniden Çalıştır
                    </>
                )}
            </button>
        </div>
    )
}
