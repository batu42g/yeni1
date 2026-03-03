'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useDebounce } from 'use-debounce'
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSkeleton } from '@/components/ui/loading'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const OfferPdfExport = dynamic(() => import('@/components/offers/OfferPdfExport').then(mod => mod.OfferPdfExport), { ssr: false })
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    FolderPlus,
    ArrowRight,
    Calculator,
    Wand2
} from 'lucide-react'
import type { OfferStatus, ProjectStatus } from '@/types/database'

interface Offer {
    id: string
    company_id: string
    customer_id: string
    amount: number
    status: OfferStatus
    created_at: string
    customers?: { name: string; email: string; phone: string } | null
}

interface CustomerOption {
    id: string
    name: string
}

const PAGE_SIZE = 10

export default function OffersPage() {
    const router = useRouter()
    const { user } = useAuthStore()
    const [offers, setOffers] = useState<Offer[]>([])
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [debouncedSearch] = useDebounce(search, 300)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const [formCustomerId, setFormCustomerId] = useState('')
    const [formAmount, setFormAmount] = useState('')
    const [formStatus, setFormStatus] = useState<OfferStatus>('pending')
    const [saving, setSaving] = useState(false)

    // Calculator States
    const [showCalculator, setShowCalculator] = useState(false)
    const [calcPrice, setCalcPrice] = useState('')
    const [calcQty, setCalcQty] = useState('1')
    const [calcVat, setCalcVat] = useState('20')

    // Convert Project States
    const [convertModalOpen, setConvertModalOpen] = useState(false)
    const [convertingOffer, setConvertingOffer] = useState<Offer | null>(null)
    const [projectTitle, setProjectTitle] = useState('')
    const [convertDescription, setConvertDescription] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)

    const calculateTotal = () => {
        const price = Number(calcPrice) || 0
        const qty = Number(calcQty) || 1
        const vat = Number(calcVat) || 0
        const subtotal = price * qty
        const total = subtotal + (subtotal * vat / 100)
        setFormAmount(total.toFixed(2))
    }

    // Auto-calculate effect
    useEffect(() => {
        if (showCalculator) {
            calculateTotal()
        }
    }, [calcPrice, calcQty, calcVat, showCalculator])

    const fetchOffers = useCallback(async (isRefresh = false) => {
        if (!user?.active_company_id) return
        const supabase = createClient()
        if (!isRefresh) setLoading(true)
        else setRefreshing(true)

        let query = supabase
            .from('offers')
            .select(`*, customers${debouncedSearch ? '!inner' : ''}(name, email, phone)`, { count: 'exact' })
            .eq('company_id', user.active_company_id)
            .order('created_at', { ascending: false })
            .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

        if (debouncedSearch) {
            query = query.ilike('customers.name', `%${debouncedSearch}%`)
        }

        const { data, count, error } = await query
        if (error) {
            toast.error('Teklifler yüklenemedi')
        } else {
            setOffers((data as Offer[]) || [])
            setTotalCount(count || 0)
        }
        setLoading(false)
        if (isRefresh) setRefreshing(false)
    }, [user, page, debouncedSearch])

    const fetchCustomers = useCallback(async () => {
        if (!user?.active_company_id) return
        const supabase = createClient()
        const { data } = await supabase
            .from('customers')
            .select('id, name')
            .eq('company_id', user.active_company_id)
            .order('name')
        setCustomers(data || [])
    }, [user])

    useEffect(() => {
        fetchOffers()
    }, [fetchOffers])

    const ensureCustomers = async () => {
        if (customers.length === 0) {
            await fetchCustomers()
        }
    }

    const openCreate = async () => {
        await ensureCustomers()
        setEditingOffer(null)
        setFormCustomerId(customers[0]?.id || '')
        setFormAmount('')
        setFormStatus('pending')
        setModalOpen(true)
    }

    const openEdit = async (o: Offer) => {
        await ensureCustomers()
        setEditingOffer(o)
        setFormCustomerId(o.customer_id)
        setFormAmount(String(o.amount))
        setFormStatus(o.status)
        setModalOpen(true)
    }

    const openConvert = (o: Offer) => {
        setConvertingOffer(o)
        setProjectTitle(`Proje - ${o.customers?.name || 'Yeni'}`)
        setConvertDescription(`Tekliften oluşturuldu. Teklif Tutarı: ${formatCurrency(o.amount)}`)
        setConvertModalOpen(true)
    }

    const handleGenerateDesc = () => {
        if (!convertingOffer) return
        setIsGenerating(true)
        // Simulated AI generation
        setTimeout(() => {
            const desc = `PROJE KAPSAM BELGESİ\n\n` +
                `Müşteri: ${convertingOffer.customers?.name}\n` +
                `Proje Bütçesi: ${formatCurrency(convertingOffer.amount)}\n` +
                `Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                `1. PROJE ÖZETİ\n` +
                `Bu proje, ${convertingOffer.customers?.name} firmasının ihtiyaçları doğrultusunda hazırlanan teklifin kabulü üzerine başlatılmıştır. ` +
                `Temel amaç, belirlenen süre ve bütçe dahilinde taahhüt edilen teslimatları gerçekleştirmektir.\n\n` +
                `2. HEDEFLER\n` +
                `- Kaliteli ve sürdürülebilir kod yapısı oluşturmak\n` +
                `- Müşteri memnuniyetini en üst düzeyde tutmak\n` +
                `- Zamanında teslimat sağlamak\n\n` +
                `3. TESLİMATLAR\n` +
                `- Kaynak Kodlar\n` +
                `- Dokümantasyon\n` +
                `- Kullanıcı Eğitimi`;

            setConvertDescription(desc)
            setIsGenerating(false)
            toast.success('Proje açıklaması AI ile oluşturuldu ✨')
        }, 1500)
    }

    const handleConvertSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!convertingOffer || !user) return
        setSaving(true)

        try {
            const supabase = createClient()
            const { data, error } = await supabase.from('projects').insert({
                company_id: user.active_company_id!,
                title: projectTitle,
                customer_id: convertingOffer.customer_id,
                budget: convertingOffer.amount,
                status: 'pending' as ProjectStatus, // Correct status
                description: convertDescription
            }).select().single()

            if (error) throw error

            toast.success('Proje başarıyla oluşturuldu!')
            setConvertModalOpen(false)
            router.push(`/projects/${data.id}`)
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Proje oluşturulamadı')
        } finally {
            setSaving(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setSaving(true)
        const supabase = createClient()

        try {
            const payload = {
                customer_id: formCustomerId,
                amount: Number(formAmount),
                status: formStatus,
            }

            if (editingOffer) {
                const { error } = await supabase.from('offers').update(payload).eq('id', editingOffer.id)
                if (error) throw error
                toast.success('Teklif güncellendi')
            } else {
                const { error } = await supabase.from('offers').insert({
                    ...payload,
                    company_id: user.active_company_id!,
                })
                if (error) throw error
                toast.success('Teklif oluşturuldu')
            }
            setModalOpen(false)
            fetchOffers(true)
        } catch (err: any) {
            toast.error(err.message || 'Hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleStatusUpdate = async (id: string, status: OfferStatus) => {
        const supabase = createClient()
        const { error } = await supabase.from('offers').update({ status }).eq('id', id)
        if (error) toast.error('Güncellenemedi')
        else {
            toast.success(`Teklif ${getStatusLabel(status)} olarak güncellendi`)
            setOffers(prev => prev.map(o => o.id === id ? { ...o, status } : o))
        }
    }

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase.from('offers').delete().eq('id', id)
        if (error) toast.error('Silinemedi')
        else {
            toast.success('Teklif silindi')
            fetchOffers(true)
        }
        setDeleteConfirm(null)
    }

    // Stats
    const { totalAmount, pendingCount, approvedCount } = useMemo(() => {
        return {
            totalAmount: offers.reduce((sum, o) => sum + o.amount, 0),
            pendingCount: offers.filter(o => o.status === 'pending').length,
            approvedCount: offers.filter(o => o.status === 'approved').length
        }
    }, [offers])

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Convert Modal */}
            <Modal
                isOpen={convertModalOpen}
                onClose={() => setConvertModalOpen(false)}
                title="Projeye Dönüştür"
            >
                <form onSubmit={handleConvertSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-2)' }}>Proje Başlığı</label>
                        <input
                            type="text"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            className="input-field w-full"
                            placeholder="Proje adı giriniz"
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>Proje Açıklaması</label>
                            <button
                                type="button"
                                onClick={handleGenerateDesc}
                                disabled={isGenerating}
                                className="text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
                                style={{
                                    background: isGenerating ? 'transparent' : 'rgba(var(--color-accent-rgb), 0.1)',
                                    color: 'var(--color-accent)',
                                    opacity: isGenerating ? 0.7 : 1
                                }}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                        Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-3 h-3" />
                                        AI ile Oluştur
                                    </>
                                )}
                            </button>
                        </div>
                        <textarea
                            value={convertDescription}
                            onChange={(e) => setConvertDescription(e.target.value)}
                            className="input-field w-full h-32 resize-none"
                            placeholder="Proje detayları..."
                        />
                    </div>

                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>Aktarılacak Tutar:</span>
                            <span className="font-bold" style={{ color: 'var(--color-text-0)' }}>{convertingOffer ? formatCurrency(convertingOffer.amount) : 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>İlgili Müşteri:</span>
                            <span className="font-bold" style={{ color: 'var(--color-text-0)' }}>{convertingOffer?.customers?.name}</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setConvertModalOpen(false)}
                            className="btn-ghost"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary"
                        >
                            {saving ? 'Oluşturuluyor...' : 'Projeyi Oluştur'}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-0)' }}>Teklifler</h2>
                    <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        {totalCount} teklif kayıtlı
                        {refreshing && <span className="animate-spin inline-block w-3 h-3 border-2 border-[var(--color-text-3)] border-t-transparent rounded-full" />}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <Search className="w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
                        <input
                            type="text"
                            placeholder="Teklif ara..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            className="bg-transparent border-none outline-none text-sm w-40"
                            style={{ color: 'var(--color-text-1)' }}
                        />
                    </div>
                    {user?.role === 'admin' && (
                        <button onClick={openCreate} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Yeni Teklif
                        </button>
                    )}
                </div>
            </div>

            {/* Mini Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { label: 'Toplam Tutar', value: formatCurrency(totalAmount), icon: FileText, color: 'var(--color-accent)', bg: 'var(--color-accent-glow)' },
                    { label: 'Bekleyen', value: pendingCount, icon: Clock, color: 'var(--color-warn)', bg: 'var(--color-warn-dim)' },
                    { label: 'Onaylanan', value: approvedCount, icon: CheckCircle2, color: 'var(--color-accent)', bg: 'var(--color-accent-glow)' },
                ].map((stat) => {
                    const Icon = stat.icon
                    return (
                        <div key={stat.label} className="stat-card flex items-center gap-3">
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: stat.bg }}>
                                <Icon className="w-4 h-4" style={{ color: stat.color }} />
                            </div>
                            <div>
                                <p className="text-lg font-bold" style={{ color: 'var(--color-text-0)' }}>{stat.value}</p>
                                <p className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>{stat.label}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {loading ? (
                <LoadingSkeleton rows={5} cols={4} />
            ) : offers.length === 0 ? (
                <EmptyState
                    title="Henüz teklif yok"
                    description="Müşterilerinize teklif gönderin."
                    icon={<FileText className="w-7 h-7" style={{ color: 'var(--color-text-3)' }} />}
                    action={user?.role === 'admin' ? (
                        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Teklif Oluştur</button>
                    ) : undefined}
                />
            ) : (
                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Müşteri</th>
                                    <th>Tutar</th>
                                    <th>Durum</th>
                                    <th>Tarih</th>
                                    <th className="text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {offers.map((o, i) => (
                                    <tr key={o.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                                        <td>
                                            <span className="font-medium" style={{ color: 'var(--color-text-0)' }}>
                                                {o.customers?.name || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                                                {formatCurrency(o.amount)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(o.status)}`}>
                                                {getStatusLabel(o.status)}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-2)' }}>{formatDate(o.created_at)}</td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1">
                                                {o.status === 'approved' && user?.role === 'admin' && (
                                                    <button
                                                        onClick={() => openConvert(o)}
                                                        className="btn-ghost p-2"
                                                        title="Projeye Dönüştür"
                                                        style={{ color: 'var(--color-success)' }}
                                                    >
                                                        <FolderPlus className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {o.status === 'pending' && user?.role === 'admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(o.id, 'approved')}
                                                            className="btn-ghost p-2"
                                                            title="Onayla"
                                                            style={{ color: 'var(--color-accent)' }}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(o.id, 'rejected')}
                                                            className="btn-ghost p-2"
                                                            title="Reddet"
                                                            style={{ color: 'var(--color-danger)' }}
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => openEdit(o)} className="btn-ghost p-2" title="Düzenle">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <OfferPdfExport offer={{ ...o, customers: o.customers || null }} companyName="CRM Panel" />
                                                {user?.role === 'admin' && (
                                                    <button onClick={() => setDeleteConfirm(o.id)} className="btn-ghost p-2" style={{ color: 'var(--color-danger)' }} title="Sil">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingOffer ? 'Teklif Düzenle' : 'Yeni Teklif'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Müşteri</label>
                        <select value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} className="input-field" required>
                            <option value="">Seçiniz</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-medium" style={{ color: 'var(--color-text-2)' }}>Tutar (₺)</label>
                            <button
                                type="button"
                                onClick={() => setShowCalculator(!showCalculator)}
                                className="text-[10px] flex items-center gap-1 hover:underline transition-colors"
                                style={{ color: showCalculator ? 'var(--color-accent)' : 'var(--color-text-3)' }}
                            >
                                <Calculator className="w-3 h-3" />
                                {showCalculator ? 'Hesaplayıcıyı Kapat' : 'Hesaplayıcı Aç'}
                            </button>
                        </div>

                        {showCalculator && (
                            <div className="mb-3 p-3 rounded-lg animate-fade-in" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-3)' }}>Birim Fiyat</label>
                                        <input
                                            type="number"
                                            value={calcPrice}
                                            onChange={(e) => setCalcPrice(e.target.value)}
                                            className="input-field text-sm py-1.5 w-full"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-3)' }}>Adet</label>
                                        <input
                                            type="number"
                                            value={calcQty}
                                            onChange={(e) => setCalcQty(e.target.value)}
                                            className="input-field text-sm py-1.5 w-full"
                                            placeholder="1"
                                        />
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--color-text-3)' }}>KDV (%)</label>
                                    <div className="flex gap-2">
                                        {[0, 10, 20].map(rate => (
                                            <button
                                                key={rate}
                                                type="button"
                                                onClick={() => setCalcVat(String(rate))}
                                                className={`px-3 py-1 text-xs rounded border transition-colors flex-1`}
                                                style={{
                                                    borderColor: Number(calcVat) === rate ? 'var(--color-accent)' : 'var(--color-border)',
                                                    background: Number(calcVat) === rate ? 'rgba(var(--color-accent-rgb), 0.1)' : 'transparent',
                                                    color: Number(calcVat) === rate ? 'var(--color-accent)' : 'var(--color-text-3)'
                                                }}
                                            >
                                                %{rate}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <input
                            type="number"
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                            className="input-field w-full"
                            required
                            min={0}
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Durum</label>
                        <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as OfferStatus)} className="input-field">
                            <option value="pending">Beklemede</option>
                            <option value="approved">Onaylandı</option>
                            <option value="rejected">Reddedildi</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : editingOffer ? 'Güncelle' : 'Oluştur'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Teklifi Sil">
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>Bu teklifi silmek istediğinize emin misiniz?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">İptal</button>
                    <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Sil</button>
                </div>
            </Modal>
        </div>
    )
}
