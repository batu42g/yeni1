'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useDebounce } from 'use-debounce'
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSkeleton } from '@/components/ui/loading'
import { logActivity } from '@/lib/audit'
import toast from 'react-hot-toast'
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Users,
    Mail,
    Phone,
    MessageCircle,
} from 'lucide-react'
import type { Database, CustomerStatus } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']

const PAGE_SIZE = 10

export default function CustomersPage() {
    const { user } = useAuthStore()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [debouncedSearch] = useDebounce(search, 300)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // Form state
    const [formName, setFormName] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formPhone, setFormPhone] = useState('')
    const [formStatus, setFormStatus] = useState<CustomerStatus>('lead')
    const [saving, setSaving] = useState(false)

    const fetchCustomers = useCallback(async (isRefresh = false) => {
        if (!user?.active_company_id) return
        const supabase = createClient()
        if (!isRefresh) setLoading(true)
        else setRefreshing(true)

        let query = supabase
            .from('customers')
            .select('id, name, email, phone, created_at, status', { count: 'exact' })
            .eq('company_id', user.active_company_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

        if (debouncedSearch) {
            query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`)
        }

        const { data, count, error } = await query

        if (error) {
            toast.error('Müşteriler yüklenemedi')
            console.error(error)
        } else {
            setCustomers(data as Customer[] || [])
            setTotalCount(count || 0)
        }
        setLoading(false)
        if (isRefresh) setRefreshing(false)
    }, [user, page, debouncedSearch])

    useEffect(() => {
        fetchCustomers()
    }, [fetchCustomers])

    // Realtime subscription
    useEffect(() => {
        if (!user) return
        const supabase = createClient()
        let mounted = true

        const fetchSingleCustomer = async (id: string) => {
            const { data } = await supabase
                .from('customers')
                .select('id, name, email, phone, created_at, status')
                .eq('id', id)
                .single()
            if (data && mounted) {
                setCustomers(prev => {
                    const exists = prev.some(c => c.id === id)
                    if (exists) return prev.map(c => c.id === id ? { ...c, ...data } : c)
                    return [data as Customer, ...prev].slice(0, PAGE_SIZE)
                })
            }
        }

        const channel = supabase
            .channel('customers-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'customers',
                    filter: `company_id=eq.${user.active_company_id}`,
                },
                (payload) => {
                    if (!mounted) return
                    if (payload.eventType === 'DELETE') {
                        setCustomers(prev => prev.filter(c => c.id !== payload.old.id))
                    } else if (payload.eventType === 'UPDATE') {
                        if (payload.new.deleted_at) {
                            setCustomers(prev => prev.filter(c => c.id !== payload.new.id))
                        } else {
                            fetchSingleCustomer(payload.new.id) // Get partial view
                        }
                    } else if (payload.eventType === 'INSERT') {
                        fetchSingleCustomer(payload.new.id)
                    }
                }
            )
            .subscribe()

        return () => {
            mounted = false
            channel.unsubscribe()
        }
    }, [user])

    const openCreate = () => {
        setEditingCustomer(null)
        setFormName('')
        setFormEmail('')
        setFormPhone('')
        setFormStatus('lead')
        setModalOpen(true)
    }

    const openEdit = (c: Customer) => {
        setEditingCustomer(c)
        setFormName(c.name)
        setFormEmail(c.email)
        setFormPhone(c.phone)
        setFormStatus(c.status)
        setModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setSaving(true)
        const supabase = createClient()

        try {
            if (editingCustomer) {
                const { error } = await supabase
                    .from('customers')
                    .update({ name: formName, email: formEmail, phone: formPhone, status: formStatus })
                    .eq('id', editingCustomer.id)

                if (error) throw error

                await logActivity({
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    eventType: 'CUSTOMER_UPDATED',
                    title: 'Müşteri Güncellendi',
                    summary: `${formName} isimli müşterinin bilgileri güncellendi.`,
                    entityType: 'customer',
                    entityId: editingCustomer.id,
                    severity: 'info'
                })
                toast.success('Müşteri güncellendi')
            } else {
                const { data: newCustomer, error } = await supabase.from('customers').insert({
                    company_id: user.active_company_id!,
                    name: formName,
                    email: formEmail,
                    phone: formPhone,
                    status: formStatus,
                }).select('id').single()

                if (error) throw error

                if (newCustomer) {
                    await logActivity({
                        supabase: supabase as any,
                        companyId: user.active_company_id!,
                        actorUserId: user.id,
                        eventType: 'CUSTOMER_CREATED',
                        title: 'Yeni Müşteri',
                        summary: `${formName} sisteme eklendi.`,
                        entityType: 'customer',
                        entityId: newCustomer.id,
                        severity: 'info'
                    })
                }
                toast.success('Müşteri eklendi')
            }
            setModalOpen(false)
            // Realtime will patch array
        } catch (err: any) {
            toast.error(err.message || 'Bir hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!user) return
        const supabase = createClient()

        // Get customer data before deleting for audit log
        const { data: customerToDelete } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single()

        const { error } = await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) {
            toast.error('Silinemedi: ' + error.message)
        } else {
            if (customerToDelete) {
                await logActivity({
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    eventType: 'CUSTOMER_DELETED',
                    title: 'Müşteri Silindi',
                    summary: `${customerToDelete.name} sistemden silindi.`,
                    entityType: 'customer',
                    entityId: id,
                    severity: 'warning'
                })
            }
            toast.success('Müşteri silindi')
            // Realtime will patch array
        }
        setDeleteConfirm(null)
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-0)' }}>
                        Müşteriler
                    </h2>
                    <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        {totalCount} müşteri kayıtlı
                        {refreshing && <span className="animate-spin inline-block w-3 h-3 border-2 border-[var(--color-text-3)] border-t-transparent rounded-full" />}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{
                            background: 'var(--color-surface-1)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        <Search className="w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
                        <input
                            type="text"
                            placeholder="Müşteri ara..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            className="bg-transparent border-none outline-none text-sm w-40"
                            style={{ color: 'var(--color-text-1)' }}
                        />
                    </div>
                    <button onClick={openCreate} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Yeni Müşteri
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <LoadingSkeleton rows={6} cols={5} />
            ) : customers.length === 0 ? (
                <EmptyState
                    title="Henüz müşteri yok"
                    description="İlk müşterinizi ekleyerek başlayın."
                    icon={<Users className="w-7 h-7" style={{ color: 'var(--color-text-3)' }} />}
                    action={
                        <button onClick={openCreate} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Müşteri Ekle
                        </button>
                    }
                />
            ) : (
                <div
                    className="rounded-xl overflow-hidden"
                    style={{
                        background: 'var(--color-surface-1)',
                        border: '1px solid var(--color-border)',
                    }}
                >
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ad</th>
                                    <th>E-posta</th>
                                    <th>Telefon</th>
                                    <th>Durum</th>
                                    <th>Eklenme Tarihi</th>
                                    <th className="text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((c, i) => (
                                    <tr key={c.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                    style={{
                                                        background: 'var(--color-accent-glow)',
                                                        color: 'var(--color-accent)',
                                                    }}
                                                >
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <Link href={`/customers/${c.id}`} className="font-medium hover:text-indigo-400 transition-colors" style={{ color: 'var(--color-text-0)' }}>
                                                    {c.name}
                                                </Link>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5" style={{ color: 'var(--color-text-3)' }} />
                                                {c.email}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--color-text-3)' }} />
                                                    {c.phone}
                                                </span>
                                                {c.phone && (
                                                    <a
                                                        href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 hover:bg-green-500/10 rounded-full transition-colors group"
                                                        title="WhatsApp ile Sohbet"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5 text-green-500 opacity-70 group-hover:opacity-100" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(c.status)}`}>
                                                {getStatusLabel(c.status)}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-text-2)' }}>{formatDate(c.created_at)}</td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(c)} className="btn-ghost p-2" title="Düzenle">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                {user?.role === 'admin' && (
                                                    <button
                                                        onClick={() => setDeleteConfirm(c.id)}
                                                        className="btn-ghost p-2"
                                                        style={{ color: 'var(--color-danger)' }}
                                                        title="Sil"
                                                    >
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

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                            Ad Soyad
                        </label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="input-field"
                            placeholder="Müşteri adı"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                            E-posta
                        </label>
                        <input
                            type="email"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            className="input-field"
                            placeholder="ornek@mail.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                            Telefon
                        </label>
                        <input
                            type="tel"
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            className="input-field"
                            placeholder="+90 555 123 4567"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>
                            Durum
                        </label>
                        <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value as CustomerStatus)}
                            className="input-field"
                        >
                            <option value="lead">Aday</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Pasif</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                            İptal
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? 'Kaydediliyor...' : editingCustomer ? 'Güncelle' : 'Ekle'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Müşteriyi Sil"
            >
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>
                    Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
                        İptal
                    </button>
                    <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">
                        Sil
                    </button>
                </div>
            </Modal>
        </div>
    )
}
