'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { LoadingSkeleton } from '@/components/ui/loading'
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import {
    FolderKanban,
    FileText,
    Phone,
    Mail,
    User,
    Clock,
    Calendar,
    ArrowLeft,
    ExternalLink,
    MessageCircle
} from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'

export default function CustomerDetailPage() {
    const params = useParams()
    const id = params?.id as string
    const { user } = useAuthStore()
    const router = useRouter()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [customer, setCustomer] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [projects, setProjects] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [offers, setOffers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'offers'>('overview')

    useEffect(() => {
        if (!user || !id) return

        const fetchData = async () => {
            setLoading(true)
            const supabase = createClient()

            // Fetch Customer
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single()

            if (customerError || !customerData) {
                // toast.error('Müşteri bulunamadı')
                router.push('/customers')
                return
            }

            setCustomer(customerData)

            // Fetch Projects
            const { data: projectsData } = await supabase
                .from('projects')
                .select('*')
                .eq('customer_id', id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            setProjects(projectsData || [])

            // Fetch Offers
            const { data: offersData } = await supabase
                .from('offers')
                .select('*')
                .eq('customer_id', id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            setOffers(offersData || [])
            setLoading(false)
        }

        fetchData()
    }, [user, id, router])

    if (loading) return <div className="p-6"><LoadingSkeleton rows={5} cols={3} /></div>

    if (!customer) return null

    const totalProjectBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const totalOfferAmount = offers.reduce((sum, o) => sum + (o.amount || 0), 0)

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1 text-xs mb-4 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--color-text-2)' }}
                >
                    <ArrowLeft className="w-3 h-3" />
                    Listeye Dön
                </button>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
                            style={{
                                background: 'var(--color-surface-1)',
                                color: 'var(--color-accent)',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-0)' }}>
                                {customer.name}
                            </h1>
                            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-2)' }}>
                                <span className={`badge ${getStatusBadgeClass(customer.status)}`}>
                                    {getStatusLabel(customer.status)}
                                </span>
                                <span className="opacity-40">•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 opacity-60" />
                                    Eklenme: {formatDate(customer.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {customer.phone && (
                            <a
                                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary flex items-center gap-2"
                                title="WhatsApp ile Sohbet"
                            >
                                <MessageCircle className="w-4 h-4 text-green-500" />
                                WhatsApp
                            </a>
                        )}
                        <button
                            className="btn-primary"
                            onClick={() => toast('Düzenleme işlemi şimdilik Müşteri Listesi üzerinden yapılmaktadır.', { icon: 'ℹ️' })}
                        >
                            Düzenle
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Info Card */}
                <div className="space-y-6">
                    <div className="card p-5 space-y-4">
                        <h3 className="font-semibold text-sm border-b pb-2 mb-2" style={{ borderColor: 'var(--color-border)' }}>İletişim Bilgileri</h3>

                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs opacity-60">E-posta</p>
                                <a href={`mailto:${customer.email}`} className="text-sm font-medium hover:underline">
                                    {customer.email}
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs opacity-60">Telefon</p>
                                <a href={`tel:${customer.phone}`} className="text-sm font-medium hover:underline">
                                    {customer.phone || '—'}
                                </a>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs opacity-60">Müşteri Temsilcisi</p>
                                <p className="text-sm font-medium">
                                    {/* Aslında user join yapılabilirdi ama şimdilik statik veya current user */}
                                    Sen
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card p-5">
                        <h3 className="font-semibold text-sm border-b pb-2 mb-4" style={{ borderColor: 'var(--color-border)' }}>Finansal Özet</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs opacity-60 mb-1">Toplam Proje Bütçesi</p>
                                <p className="text-lg font-bold" style={{ color: 'var(--color-text-0)' }}>
                                    {formatCurrency(totalProjectBudget)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs opacity-60 mb-1">Toplam Teklif Tutarı</p>
                                <p className="text-lg font-bold" style={{ color: 'var(--color-text-0)' }}>
                                    {formatCurrency(totalOfferAmount)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Tabs & Lists */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            Genel Bakış
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'projects' ? 'border-indigo-500 text-indigo-400' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            Projeler ({projects.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('offers')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'offers' ? 'border-indigo-500 text-indigo-400' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            Teklifler ({offers.length})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[300px]">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="card p-4 hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => setActiveTab('projects')}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded bg-blue-500/10 text-blue-400"><FolderKanban className="w-5 h-5" /></div>
                                            <h4 className="font-semibold">Projeler</h4>
                                        </div>
                                        <p className="text-2xl font-bold">{projects.length}</p>
                                        <p className="text-xs opacity-60">Aktif ve tamamlanan</p>
                                    </div>
                                    <div className="card p-4 hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => setActiveTab('offers')}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded bg-purple-500/10 text-purple-400"><FileText className="w-5 h-5" /></div>
                                            <h4 className="font-semibold">Teklifler</h4>
                                        </div>
                                        <p className="text-2xl font-bold">{offers.length}</p>
                                        <p className="text-xs opacity-60">Bekleyen ve onaylanan</p>
                                    </div>
                                </div>

                                <div className="card p-5">
                                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 opacity-60" />
                                        Son Aktiviteler (Timeline)
                                    </h3>
                                    {/* Placeholder for Timeline - could be audit logs filtered by customer */}
                                    <div className="space-y-4 pl-2 border-l-2" style={{ borderColor: 'var(--color-border)' }}>
                                        {projects.slice(0, 3).map(p => (
                                            <div key={p.id} className="relative pl-4 pb-1">
                                                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-[var(--color-surface-1)] bg-blue-500" />
                                                <p className="text-sm font-medium">Proje Oluşturuldu: {p.title}</p>
                                                <p className="text-xs opacity-50">{formatDate(p.created_at)}</p>
                                            </div>
                                        ))}
                                        {offers.slice(0, 3).map(o => (
                                            <div key={o.id} className="relative pl-4 pb-1">
                                                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-[var(--color-surface-1)] bg-purple-500" />
                                                <p className="text-sm font-medium">Teklif Verildi: {formatCurrency(o.amount)}</p>
                                                <p className="text-xs opacity-50">{formatDate(o.created_at)}</p>
                                            </div>
                                        ))}
                                        {projects.length === 0 && offers.length === 0 && (
                                            <p className="text-sm opacity-50 pl-4">Henüz aktivite yok.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="space-y-3">
                                {projects.length === 0 ? (
                                    <EmptyState title="Proje Yok" description="Bu müşteriye ait proje bulunmuyor." icon={<FolderKanban className="w-8 h-8 opacity-20" />} />
                                ) : (
                                    projects.map(p => (
                                        <Link key={p.id} href={`/projects/${p.id}`} className="card p-4 flex items-center justify-between hover:border-indigo-500/50 transition-colors group">
                                            <div>
                                                <h4 className="font-bold group-hover:text-indigo-400 transition-colors">{p.title}</h4>
                                                <p className="text-xs opacity-60 line-clamp-1">{p.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`badge ${getStatusBadgeClass(p.status)} mb-1 inline-block`}>{getStatusLabel(p.status)}</span>
                                                <p className="text-sm font-semibold">{formatCurrency(p.budget)}</p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'offers' && (
                            <div className="space-y-3">
                                {offers.length === 0 ? (
                                    <EmptyState title="Teklif Yok" description="Bu müşteriye ait teklif bulunmuyor." icon={<FileText className="w-8 h-8 opacity-20" />} />
                                ) : (
                                    offers.map(o => (
                                        <div key={o.id} className="card p-4 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold">Teklif #{o.id.slice(0, 8)}</h4>
                                                <p className="text-xs opacity-60">
                                                    {formatDate(o.created_at)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`badge ${getStatusBadgeClass(o.status)} mb-1 inline-block`}>{getStatusLabel(o.status)}</span>
                                                <p className="text-sm font-semibold">{formatCurrency(o.amount)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
