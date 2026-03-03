'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CompanyProfileForm } from '@/components/settings/CompanyProfileForm'
import { UserProfileForm } from '@/components/settings/UserProfileForm'
import { DangerZone } from '@/components/settings/DangerZone'
import { BackupExport } from '@/components/settings/BackupExport'
import { User, Building, ShieldAlert, Loader2, Download } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Derived from URL so users can link directly, client-side switch for speed
    const defaultTab = searchParams.get('tab') || 'company'
    const [activeTab, setActiveTab] = useState(defaultTab)

    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [companyDetails, setCompanyDetails] = useState<any>(null)

    // Sync state with URL without triggering full loads
    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        window.history.replaceState(null, '', `?tab=${tab}`)
    }

    useEffect(() => {
        const init = async () => {
            if (!user) return
            try {
                const supabase = createClient()
                const { data: prof } = await supabase.rpc('ensure_user_context').single()
                if (prof) {
                    setProfile(prof)
                    // Base data needed for DangerZone labels
                    if (prof.company_id) {
                        const { data: comp } = await supabase.from('companies').select('name').eq('id', prof.company_id).single()
                        setCompanyDetails(comp)
                    }
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [user])

    if (!user) {
        return null // Middleware handles redirect
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
            </div>
        )
    }

    if (!profile || !profile.company_id) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="text-red-500">Şirket bilgisi bulunamadı.</div>
                <p className="text-sm text-gray-500">Hesabınız bir şirkete bağlı değil veya silinmiş.</p>
            </div>
        )
    }

    const isOwner = profile.role === 'owner'
    const isAdmin = profile.role === 'owner' || profile.role === 'admin'

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-0)' }}>Ayarlar</h1>
                <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
                    Profil, erişim ve şirket parametrelerinizi merkezi olarak yönetin.
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <button
                    onClick={() => handleTabChange('company')}
                    className="flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2"
                    style={{
                        borderColor: activeTab === 'company' ? 'var(--color-accent)' : 'transparent',
                        color: activeTab === 'company' ? 'var(--color-text-0)' : 'var(--color-text-3)',
                    }}
                >
                    <Building className="w-4 h-4" />
                    Şirket Ayarları
                </button>
                <button
                    onClick={() => handleTabChange('user')}
                    className="flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2"
                    style={{
                        borderColor: activeTab === 'user' ? 'var(--color-accent)' : 'transparent',
                        color: activeTab === 'user' ? 'var(--color-text-0)' : 'var(--color-text-3)',
                    }}
                >
                    <User className="w-4 h-4" />
                    Kullanıcı Ayarları
                </button>
                {(isAdmin) && (
                    <button
                        onClick={() => handleTabChange('danger')}
                        className="flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ml-md-auto"
                        style={{
                            borderColor: activeTab === 'danger' ? 'var(--color-danger)' : 'transparent',
                            color: activeTab === 'danger' ? 'var(--color-text-0)' : 'var(--color-text-3)',
                        }}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        Tehlikeli Bölge
                    </button>
                )}
            </div>

            {/* Content Area - Lazy initialized organically since children components fetch their own dedicated endpoints now */}
            <div className="min-h-[400px]">
                {activeTab === 'company' && (
                    <div className="rounded-xl p-6 md:p-8" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <CompanySettingsTab />
                    </div>
                )}

                {activeTab === 'user' && (
                    <div className="rounded-xl p-6 md:p-8" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <UserProfileForm />
                    </div>
                )}

                {activeTab === 'danger' && isAdmin && (
                    <div className="rounded-xl p-6 md:p-8" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <DangerZone
                            companyId={profile.company_id}
                            companyName={companyDetails?.name || 'Şirket'}
                            currentUserId={user.id}
                            currentUserRole={profile.role}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

function CompanySettingsTab() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        fetch('/api/settings/company')
            .then(res => res.json())
            .then(res => {
                if (res.company) setData(res.company)
                setLoading(false)
            })
    }, [])

    if (loading) {
        return <div className="flex py-10 justify-center"><Loader2 className="animate-spin w-6 h-6 text-gray-500" /></div>
    }

    return (
        <div className="space-y-8">
            <CompanyProfileForm
                companyId={data?.id}
                initialName={data?.name || ''}
                initialLogoUrl={data?.logo_url || null}
            />
            <div className="mt-4 pt-1" style={{ color: 'var(--color-text-3)' }}>
                <p className="text-xs">Mevcut Lisans Durumu: {data?.status === 'active' ? 'Aktif' : 'Pasif'}. Limit: {data?.seat_limit || 0} Kullanıcı</p>
            </div>

            {/* Veri Yedeği */}
            <div className="pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                    <Download className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                    Veri Yedeği
                </h3>
                <BackupExport />
            </div>
        </div>
    )
}
