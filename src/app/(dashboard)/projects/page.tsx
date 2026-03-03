'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useDebounce } from 'use-debounce'
import { formatDate, formatCurrency, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSkeleton } from '@/components/ui/loading'
import { logActivity, logAudit } from '@/lib/audit'
import toast from 'react-hot-toast'
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    FolderKanban,
    DollarSign,
    ExternalLink,
    Wand2,
    LayoutTemplate
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ProjectStatus } from '@/types/database'

interface Project {
    id: string
    company_id: string
    customer_id: string
    title: string
    description: string
    status: ProjectStatus
    budget: number
    created_at: string
    customers?: { name: string } | null
}

interface Customer {
    id: string
    name: string
}

const TEMPLATES = {
    web: {
        label: 'Web Sitesi Geliştirme',
        tasks: ['İhtiyaç Analizi', 'Tasarım Onayı', 'Frontend Kodlama', 'Backend Kodlama', 'Test ve Hata Giderme', 'Yayına Alma']
    },
    seo: {
        label: 'SEO Çalışması',
        tasks: ['Anahtar Kelime Analizi', 'Rakip Analizi', 'On-Page Optimizasyon', 'İçerik Stratejisi', 'Backlink Çalışması']
    },
    social: {
        label: 'Sosyal Medya Yönetimi',
        tasks: ['İçerik Takvimi Hazırlama', 'Görsel Tasarım', 'Paylaşım Planlama', 'Etkileşim Analizi', 'Aylık Raporlama']
    }
}

const PAGE_SIZE = 10

export default function ProjectsPage() {
    const { user } = useAuthStore()
    const [projects, setProjects] = useState<Project[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [debouncedSearch] = useDebounce(search, 300)
    const [page, setPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formCustomerId, setFormCustomerId] = useState('')
    const [formStatus, setFormStatus] = useState<ProjectStatus>('pending')
    const [formBudget, setFormBudget] = useState('')
    const [saving, setSaving] = useState(false)

    // Template & AI States
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)

    const fetchProjects = useCallback(async (isRefresh = false) => {
        if (!user?.active_company_id) return
        const supabase = createClient()
        if (!isRefresh) setLoading(true)
        else setRefreshing(true)

        let query = supabase
            .from('projects')
            .select('id, title, description, status, budget, created_at, customer_id, customers(name)', { count: 'exact' })
            .eq('company_id', user.active_company_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

        if (debouncedSearch) {
            query = query.ilike('title', `%${debouncedSearch}%`)
        }

        const { data, count, error } = await query
        if (error) {
            toast.error('Projeler yüklenemedi')
        } else {
            setProjects((data as Project[]) || [])
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
        fetchProjects()
    }, [fetchProjects])

    // Realtime subscription
    useEffect(() => {
        if (!user) return
        const supabase = createClient()
        let mounted = true

        const fetchSingleProject = async (id: string) => {
            const { data } = await supabase
                .from('projects')
                .select('id, title, description, status, budget, created_at, customer_id, customers(name)')
                .eq('id', id)
                .single()
            if (data && mounted) {
                setProjects(prev => {
                    const exists = prev.some(p => p.id === id)
                    if (exists) return prev.map(p => p.id === id ? { ...p, ...data } : p)
                    return [data as Project, ...prev].slice(0, PAGE_SIZE)
                })
            }
        }

        const channel = supabase
            .channel('projects-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'projects',
                    filter: `company_id=eq.${user.active_company_id}`,
                },
                (payload) => {
                    if (!mounted) return
                    if (payload.eventType === 'DELETE') {
                        setProjects(prev => prev.filter(p => p.id !== payload.old.id))
                    } else if (payload.eventType === 'UPDATE') {
                        if (payload.new.deleted_at) {
                            setProjects(prev => prev.filter(p => p.id !== payload.new.id))
                        } else {
                            fetchSingleProject(payload.new.id)
                        }
                    } else if (payload.eventType === 'INSERT') {
                        fetchSingleProject(payload.new.id)
                    }
                }
            )
            .subscribe()

        return () => {
            mounted = false
            channel.unsubscribe()
        }
    }, [user])

    const ensureCustomers = async () => {
        if (customers.length === 0) {
            await fetchCustomers()
        }
    }

    const openCreate = async () => {
        if (user?.role !== 'admin') {
            toast.error('Sadece yöneticiler proje oluşturabilir')
            return
        }
        await ensureCustomers()
        setEditingProject(null)
        setFormTitle('')
        setFormDescription('')
        setFormCustomerId('') // Instead of picking [0] immediately, ensures placeholder
        setFormStatus('pending')
        setFormBudget('')
        setSelectedTemplate('')
        setModalOpen(true)
    }

    const openEdit = async (p: Project) => {
        if (user?.role !== 'admin') {
            toast.error('Sadece yöneticiler proje düzenleyebilir')
            return
        }
        await ensureCustomers()

        // Önce mevcut veriyle formu doldur (anlık açılsın)
        setEditingProject(p)
        setFormTitle(p.title)
        setFormDescription(p.description || '')
        setFormCustomerId(p.customer_id)
        setFormStatus(p.status)
        setFormBudget(String(p.budget))
        setSelectedTemplate('')
        setModalOpen(true)

        // Açıklama list query'de gelmeyebilir (cache'li veri) → DB'den tam veriyi çek
        // ve formu güncelle (modal zaten açık)
        const supabase = createClient()
        const { data: fullProject } = await supabase
            .from('projects')
            .select('id, title, description, status, budget, customer_id')
            .eq('id', p.id)
            .single()

        if (fullProject) {
            setFormDescription(fullProject.description || '')
            // Diğer alanları da güncelle (başka bir sekme değiştirmiş olabilir)
            setFormTitle(fullProject.title)
            setFormStatus(fullProject.status)
            setFormBudget(String(fullProject.budget))
            setFormCustomerId(fullProject.customer_id)
            // editingProject'i de tam veriyle güncelle (description diff için)
            setEditingProject(prev => prev ? { ...prev, description: fullProject.description } : prev)
        }
    }

    const handleGenerateDesc = () => {
        if (!formTitle) return toast.error('Lütfen önce proje başlığı girin')
        setIsGenerating(true)
        setTimeout(() => {
            const customerName = customers.find(c => c.id === formCustomerId)?.name || 'Müşteri'
            const desc = `PROJE DETAYLARI\n\n` +
                `Proje: ${formTitle}\n` +
                `Müşteri: ${customerName}\n` +
                `Başlangıç: ${new Date().toLocaleDateString('tr-TR')}\n\n` +
                `Kapsam:\n` +
                `- ${formTitle} için gerekli altyapının kurulması\n` +
                `- Tasarım ve geliştirme süreçlerinin tamamlanması\n` +
                `- Test ve yayına alma işlemleri\n\n` +
                `Hedefler:\n` +
                `- Yüksek performans ve güvenilirlik\n` +
                `- Kullanıcı dostu arayüz`

            setFormDescription(desc)
            setIsGenerating(false)
            toast.success('Proje kapsamı oluşturuldu ✨')
        }, 1500)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setSaving(true)
        const supabase = createClient()

        try {
            const payload = {
                title: formTitle,
                description: formDescription,
                customer_id: formCustomerId,
                status: formStatus,
                budget: Number(formBudget),
            }

            if (editingProject) {
                const { error } = await supabase.from('projects').update(payload).eq('id', editingProject.id)
                if (error) throw error

                // Optimistic state patch — realtime'ı bekleme
                setProjects(prev => prev.map(p =>
                    p.id === editingProject.id
                        ? { ...p, ...payload, customers: customers.find(c => c.id === payload.customer_id) ? { name: customers.find(c => c.id === payload.customer_id)!.name } : p.customers }
                        : p
                ))

                const customerName = customers.find(c => c.id === payload.customer_id)?.name || 'Bilinmiyor'

                await logActivity({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    eventType: 'PROJECT_UPDATED',
                    title: `Proje Güncellendi: ${payload.title || editingProject.title}`,
                    summary: `Müşteri: ${customerName} • Bütçe: ${payload.budget} • Durum: ${payload.status}`,
                    entityType: 'project',
                    entityId: editingProject.id,
                    severity: 'info'
                })

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const changes: any[] = []
                if (editingProject.title !== payload.title) changes.push({ field: 'title', old: editingProject.title, new: payload.title })
                if (editingProject.customer_id !== payload.customer_id) changes.push({ field: 'customer_id', old: editingProject.customer_id, new: payload.customer_id })
                if (editingProject.status !== payload.status) changes.push({ field: 'status', old: editingProject.status, new: payload.status })
                if (editingProject.budget !== payload.budget) changes.push({ field: 'budget', old: editingProject.budget, new: payload.budget })
                if (editingProject.description !== payload.description) changes.push({ field: 'description', old: '(redacted)', new: '(redacted)' })

                if (changes.length > 0) {
                    await logAudit({
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        supabase: supabase as any,
                        companyId: user.active_company_id!,
                        actorUserId: user.id,
                        action: 'PROJECT_UPDATED',
                        targetType: 'project',
                        targetId: editingProject.id,
                        metadata: {
                            context: {
                                project_id: editingProject.id,
                                title: editingProject.title,
                                customer_id: editingProject.customer_id,
                                customer_name: customers.find(c => c.id === editingProject.customer_id)?.name || 'Bilinmiyor'
                            },
                            changes
                        }
                    })
                }

                toast.success('Proje güncellendi')
            } else {
                const { data, error } = await supabase.from('projects').insert({
                    ...payload,
                    company_id: user.active_company_id!,
                }).select().single()

                if (error) throw error

                // Create tasks from template if selected
                if (selectedTemplate && data) {
                    const templateKey = selectedTemplate as keyof typeof TEMPLATES
                    if (TEMPLATES[templateKey]) {
                        const taskTitles = TEMPLATES[templateKey].tasks
                        const taskRows = taskTitles.map(title => ({
                            company_id: user.active_company_id!,
                            project_id: data.id,
                            title,
                            status: 'todo' as const,
                            assigned_to: user.id
                        }))

                        const { data: insertedTasks, error: taskError } = await supabase
                            .from('tasks')
                            .insert(taskRows)
                            .select('id, title')

                        if (!taskError && insertedTasks) {
                            toast.success(`${taskTitles.length} adet görev oluşturuldu`)

                            // 1) Genel "şablon uygulandı" bildirimi
                            await logActivity({
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                supabase: supabase as any,
                                companyId: user.active_company_id!,
                                actorUserId: user.id,
                                eventType: 'TASKS_CREATED_FROM_TEMPLATE',
                                title: `Şablon Görevleri Oluşturuldu: ${TEMPLATES[templateKey].label}`,
                                summary: `${taskTitles.length} görev "${payload.title}" projesine eklendi`,
                                entityType: 'project',
                                entityId: data.id,
                                severity: 'info',
                            })

                            // 2) Her görev için ayrı TASK_CREATED eventi
                            //    Promise.all ile parallel — bloklamayalım
                            await Promise.all(
                                insertedTasks.map(task =>
                                    logActivity({
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        supabase: supabase as any,
                                        companyId: user.active_company_id!,
                                        actorUserId: user.id,
                                        eventType: 'TASK_CREATED',
                                        title: `Görev Oluşturuldu: ${task.title}`,
                                        summary: `Proje: ${payload.title} • Şablondan otomatik oluşturuldu`,
                                        entityType: 'task',
                                        entityId: task.id,
                                        severity: 'info',
                                    })
                                )
                            )
                        } else if (taskError) {
                            console.error('Template task insert error:', taskError)
                            toast.error('Şablon görevleri oluşturulurken hata oluştu')
                        }
                    }
                }
                const customerName = customers.find(c => c.id === payload.customer_id)?.name || 'Bilinmiyor'

                await logActivity({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    eventType: 'PROJECT_CREATED',
                    title: `Yeni Proje Oluşturuldu: ${payload.title}`,
                    summary: `Müşteri: ${customerName} • Bütçe: ${payload.budget} • Durum: ${payload.status}`,
                    entityType: 'project',
                    entityId: data.id,
                    severity: 'info'
                })

                await logAudit({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    action: 'PROJECT_CREATED',
                    targetType: 'project',
                    targetId: data.id,
                    metadata: {
                        context: {
                            project_id: data.id,
                            title: payload.title,
                            customer_id: payload.customer_id,
                            customer_name: customerName,
                            budget: payload.budget,
                            status: payload.status
                        }
                    }
                })

                toast.success('Proje oluşturuldu')
            }
            setModalOpen(false)
            // Realtime will catch insert/update
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error(err.message || 'Hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!user) return
        const supabase = createClient()

        const { data: projectToDelete } = await supabase.from('projects').select('title, status').eq('id', id).single()

        const { error } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id)
        if (error) toast.error('Silinemedi')
        else {
            if (projectToDelete) {
                await logActivity({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    eventType: 'PROJECT_DELETED',
                    title: `Proje Silindi: ${projectToDelete.title}`,
                    summary: `Durum: ${projectToDelete.status}`,
                    entityType: 'project',
                    entityId: id,
                    severity: 'warning'
                })

                await logAudit({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    action: 'PROJECT_DELETED',
                    targetType: 'project',
                    targetId: id,
                    metadata: {
                        context: {
                            project_id: id,
                            title: projectToDelete.title
                        }
                    }
                })
            }
            toast.success('Proje silindi')
            // Realtime will catch the deletion
        }
        setDeleteConfirm(null)
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-0)' }}>Projeler</h2>
                    <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        {totalCount} proje kayıtlı
                        {refreshing && <span className="animate-spin inline-block w-3 h-3 border-2 border-[var(--color-text-3)] border-t-transparent rounded-full" />}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <Search className="w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
                        <input
                            type="text"
                            placeholder="Proje ara..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            className="bg-transparent border-none outline-none text-sm w-40"
                            style={{ color: 'var(--color-text-1)' }}
                        />
                    </div>
                    {user?.role === 'admin' && (
                        <button onClick={openCreate} className="btn-primary">
                            <Plus className="w-4 h-4" />
                            Yeni Proje
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <LoadingSkeleton rows={5} cols={5} />
            ) : projects.length === 0 ? (
                <EmptyState
                    title="Henüz proje yok"
                    description="İlk projenizi oluşturun."
                    icon={<FolderKanban className="w-7 h-7" style={{ color: 'var(--color-text-3)' }} />}
                    action={user?.role === 'admin' ? (
                        <button onClick={openCreate} className="btn-primary">
                            <Plus className="w-4 h-4" /> Proje Oluştur
                        </button>
                    ) : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {projects.map((p, i) => (
                        <Link
                            key={p.id}
                            href={`/projects/${p.id}`}
                            className="stat-card cursor-pointer group animate-fade-in block hover:border-indigo-500/50 transition-colors"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className={`badge ${getStatusBadgeClass(p.status)}`}>
                                    {getStatusLabel(p.status)}
                                </span>
                                {user?.role === 'admin' && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(p) }}
                                            className="btn-ghost p-1.5"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm(p.id) }}
                                            className="btn-ghost p-1.5"
                                            style={{ color: 'var(--color-danger)' }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-base mb-1" style={{ color: 'var(--color-text-0)' }}>
                                {p.title}
                            </h3>
                            <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--color-text-3)' }}>
                                {p.description}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                                    {p.customers?.name || '—'}
                                </span>
                                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>
                                    <DollarSign className="w-3.5 h-3.5" />
                                    {formatCurrency(p.budget)}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProject ? 'Proje Düzenle' : 'Yeni Proje'}>
                <form onSubmit={handleSave} className="space-y-4">
                    {!editingProject && (
                        <div className="p-3 mb-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: 'var(--color-accent)' }}>
                                <LayoutTemplate className="w-3 h-3" />
                                Hızlı Başlangıç Şablonu (Opsiyonel)
                            </label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                className="input-field w-full text-xs"
                            >
                                <option value="">Boş Proje - Şablon Yok</option>
                                <option value="web">Web Sitesi Geliştirme (6 Görev)</option>
                                <option value="seo">SEO Çalışması (5 Görev)</option>
                                <option value="social">Sosyal Medya Yönetimi (5 Görev)</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Başlık</label>
                        <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input-field" required />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-medium" style={{ color: 'var(--color-text-2)' }}>Açıklama</label>
                            <button
                                type="button"
                                onClick={handleGenerateDesc}
                                disabled={isGenerating || !formTitle}
                                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors"
                                style={{
                                    background: isGenerating ? 'transparent' : 'rgba(var(--color-accent-rgb), 0.1)',
                                    color: 'var(--color-accent)',
                                    opacity: isGenerating ? 0.7 : 1
                                }}
                            >
                                {isGenerating ? <div className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" /> : <Wand2 className="w-2.5 h-2.5" />}
                                AI ile Yaz
                            </button>
                        </div>
                        <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="input-field" rows={4} placeholder="Proje açıklaması..." />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Müşteri</label>
                        <select value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} className="input-field" required>
                            <option value="">Seçiniz</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Durum</label>
                            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as ProjectStatus)} className="input-field">
                                <option value="pending">Beklemede</option>
                                <option value="in_progress">Devam Ediyor</option>
                                <option value="completed">Tamamlandı</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Bütçe (₺)</label>
                            <input type="number" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} className="input-field" required min={0} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : editingProject ? 'Güncelle' : 'Oluştur'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Projeyi Sil">
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>Bu projeyi silmek istediğinize emin misiniz?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">İptal</button>
                    <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Sil</button>
                </div>
            </Modal>
        </div>
    )
}
