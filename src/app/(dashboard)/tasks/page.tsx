'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { formatDate, getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSkeleton } from '@/components/ui/loading'
import { logAudit, logActivity } from '@/lib/audit'
import toast from 'react-hot-toast'
import {
    Plus,
    ListTodo,
    Clock,
    Loader2,
    CheckCircle2,
    GripVertical,
    Calendar,
    Edit3,
    Trash2,
} from 'lucide-react'
import type { TaskStatus } from '@/types/database'

interface Task {
    id: string
    company_id: string
    project_id: string
    assigned_to: string
    title: string
    status: TaskStatus
    due_date: string | null
    created_at: string
    projects?: { title: string } | null
    users?: { full_name: string } | null
}

interface ProjectOption {
    id: string
    title: string
}

interface UserOption {
    id: string
    full_name: string
}

const columns: { key: TaskStatus; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'todo', label: 'Yapılacak', icon: ListTodo, color: 'var(--color-text-2)' },
    { key: 'doing', label: 'Yapılıyor', icon: Loader2, color: 'var(--color-info)' },
    { key: 'done', label: 'Tamamlandı', icon: CheckCircle2, color: 'var(--color-accent)' },
]

export default function TasksPage() {
    const { user } = useAuthStore()
    const [tasks, setTasks] = useState<Task[]>([])
    const [projects, setProjects] = useState<ProjectOption[]>([])
    const [users, setUsers] = useState<UserOption[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const [formTitle, setFormTitle] = useState('')
    const [formProjectId, setFormProjectId] = useState('')
    const [formAssignedTo, setFormAssignedTo] = useState('')
    const [formStatus, setFormStatus] = useState<TaskStatus>('todo')
    const [formDueDate, setFormDueDate] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchTasks = useCallback(async (isRefresh = false) => {
        if (!user?.active_company_id) return
        const supabase = createClient()
        if (!isRefresh) setLoading(true)
        else setRefreshing(true)

        let query = supabase
            .from('tasks')
            .select('*, projects(title), users!tasks_assigned_to_fkey(full_name)')
            .eq('company_id', user.active_company_id)
            .order('created_at', { ascending: false })

        // Staff can only see their own tasks
        if (user.role === 'staff') {
            query = query.eq('assigned_to', user.id)
        }

        const { data, error } = await query
        if (error) {
            toast.error('Görevler yüklenemedi')
            console.error(error)
        } else {
            setTasks((data as Task[]) || [])
        }
        setLoading(false)
        if (isRefresh) setRefreshing(false)
    }, [user])

    const fetchMeta = useCallback(async () => {
        if (!user?.active_company_id) return
        const supabase = createClient()

        const [{ data: projectsData }, { data: usersData }] = await Promise.all([
            supabase.from('projects').select('id, title').eq('company_id', user.active_company_id).order('title'),
            supabase.from('users').select('id, full_name').eq('company_id', user.active_company_id).order('full_name'),
        ])

        setProjects(projectsData || [])
        setUsers(usersData || [])
    }, [user])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    // Realtime subscription
    useEffect(() => {
        if (!user) return
        const supabase = createClient()
        let mounted = true

        const fetchSingleTask = async (id: string) => {
            const { data } = await supabase
                .from('tasks')
                .select('*, projects(title), users!tasks_assigned_to_fkey(full_name)')
                .eq('id', id)
                .single()
            if (data && mounted) {
                setTasks(prev => {
                    const exists = prev.some(t => t.id === id)
                    if (exists) return prev.map(t => t.id === id ? data : t)
                    return [data, ...prev]
                })
            }
        }

        const channel = supabase
            .channel('tasks-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `company_id=eq.${user.active_company_id}`,
                },
                (payload) => {
                    if (!mounted) return
                    if (payload.eventType === 'DELETE') {
                        setTasks(prev => prev.filter(t => t.id !== payload.old.id))
                    } else if (payload.eventType === 'UPDATE') {
                        setTasks(prev => prev.map(t => {
                            if (t.id === payload.new.id) {
                                return { ...t, ...payload.new }
                            }
                            return t
                        }))
                    } else if (payload.eventType === 'INSERT') {
                        fetchSingleTask(payload.new.id)
                    }
                }
            )
            .subscribe()

        return () => {
            mounted = false
            channel.unsubscribe()
        }
    }, [user])

    const ensureMeta = async () => {
        if (projects.length === 0 || users.length === 0) {
            await fetchMeta()
        }
    }

    const openCreate = async () => {
        await ensureMeta()
        setEditingTask(null)
        setFormTitle('')
        setFormProjectId('') // Default to empty string 'Seçiniz' forcing the user to select
        setFormAssignedTo(user?.id || '')
        setFormStatus('todo')
        setFormDueDate('')
        setModalOpen(true)
    }

    const openEdit = async (t: Task) => {
        await ensureMeta()
        setEditingTask(t)
        setFormTitle(t.title)
        setFormProjectId(t.project_id)
        setFormAssignedTo(t.assigned_to)
        setFormStatus(t.status)
        setFormDueDate(t.due_date || '')
        setModalOpen(true)
    }

    const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        if (!user) return
        const supabase = createClient()
        const task = tasks.find(t => t.id === taskId)
        const oldStatus = task?.status || 'todo'
        const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
        if (error) {
            toast.error('Durum güncellenemedi')
        } else {
            // Optimistic update
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

            // Audit + Activity
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await logAudit({
                supabase: supabase as any,
                companyId: user.active_company_id!,
                actorUserId: user.id,
                action: 'TASK_UPDATED',
                targetType: 'task',
                targetId: taskId,
                metadata: {
                    context: {
                        title: task?.title || '',
                        project_id: task?.project_id || ''
                    },
                    changes: [
                        { field: 'status', old: oldStatus, new: newStatus }
                    ]
                }
            })

            await logActivity({
                supabase: supabase as any,
                companyId: user.active_company_id!,
                actorUserId: user.id,
                eventType: newStatus === 'done' ? 'TASK_COMPLETED' : 'TASK_UPDATED',
                title: newStatus === 'done' ? 'Görev Tamamlandı' : 'Görev Durumu Güncellendi',
                summary: `'${task?.title}' → ${getStatusLabel(newStatus)}`,
                entityType: 'task',
                entityId: taskId,
                severity: 'info'
            })

            // Check for recurring pattern if completed
            if (newStatus === 'done') {
                if (task) {
                    const lowerTitle = task.title.toLowerCase()
                    const isWeekly = lowerTitle.includes('(haftalık)') || lowerTitle.includes('(weekly)')
                    const isMonthly = lowerTitle.includes('(aylık)') || lowerTitle.includes('(monthly)')

                    if (isWeekly || isMonthly) {
                        let newDate = new Date()
                        if (task.due_date) {
                            const d = new Date(task.due_date)
                            if (d > newDate) newDate = d
                        }

                        if (isWeekly) newDate.setDate(newDate.getDate() + 7)
                        if (isMonthly) newDate.setMonth(newDate.getMonth() + 1)

                        const { error: recurError } = await supabase.from('tasks').insert({
                            company_id: user.active_company_id!,
                            project_id: task.project_id,
                            assigned_to: task.assigned_to,
                            title: task.title,
                            status: 'todo',
                            due_date: newDate.toISOString()
                        })

                        if (!recurError) {
                            toast.success('Tekrarlayan görev sırada: +1 ' + (isWeekly ? 'Hafta' : 'Ay') + ' 🔄', { duration: 4000 })
                        } else {
                            toast.success('Görev tamamlandı')
                        }
                    } else {
                        toast.success('Görev tamamlandı')
                    }
                }
            } else {
                toast.success(`Görev "${getStatusLabel(newStatus)}" olarak güncellendi`)
            }
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setSaving(true)
        const supabase = createClient()

        try {
            const payload = {
                title: formTitle,
                project_id: formProjectId,
                assigned_to: formAssignedTo,
                status: formStatus,
                due_date: formDueDate || null,
            }

            if (editingTask) {
                const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id)
                if (error) throw error

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const changes: any[] = []
                if (editingTask.title !== payload.title) changes.push({ field: 'title', old: editingTask.title, new: payload.title })
                if (editingTask.status !== payload.status) changes.push({ field: 'status', old: editingTask.status, new: payload.status })
                if (editingTask.project_id !== payload.project_id) changes.push({ field: 'project_id', old: editingTask.project_id, new: payload.project_id })
                if (editingTask.assigned_to !== payload.assigned_to) changes.push({ field: 'assigned_to', old: editingTask.assigned_to, new: payload.assigned_to })
                if ((editingTask.due_date || null) !== payload.due_date) changes.push({ field: 'due_date', old: editingTask.due_date, new: payload.due_date })

                if (changes.length > 0) {
                    await logAudit({
                        supabase: supabase as any,
                        companyId: user.active_company_id!,
                        actorUserId: user.id,
                        action: 'TASK_UPDATED',
                        targetType: 'task',
                        targetId: editingTask.id,
                        metadata: {
                            context: { title: editingTask.title, project_id: editingTask.project_id },
                            changes
                        }
                    })
                    await logActivity({
                        supabase: supabase as any,
                        companyId: user.active_company_id!,
                        actorUserId: user.id,
                        eventType: 'TASK_UPDATED',
                        title: 'Görev Güncellendi',
                        summary: `'${editingTask.title}' güncellendi`,
                        entityType: 'task',
                        entityId: editingTask.id,
                        severity: 'info'
                    })
                }

                toast.success('Görev güncellendi')
            } else {
                const { data, error } = await supabase.from('tasks').insert({
                    ...payload,
                    company_id: user.active_company_id!,
                }).select().single()
                if (error) throw error

                await logAudit({
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    action: 'TASK_CREATED',
                    targetType: 'task',
                    targetId: data?.id,
                    metadata: {
                        context: {
                            title: payload.title,
                            project_id: payload.project_id,
                            status: payload.status
                        }
                    }
                })
                await logActivity({
                    supabase: supabase as any,
                    companyId: user.active_company_id!,
                    actorUserId: user.id,
                    eventType: 'TASK_CREATED',
                    title: 'Yeni Görev Oluşturuldu',
                    summary: `'${payload.title}' oluşturuldu`,
                    entityType: 'task',
                    entityId: data?.id,
                    severity: 'info'
                })

                toast.success('Görev oluşturuldu')
            }
            setModalOpen(false)
            // Realtime will handle the list update automatically for inserts/updates
        } catch (err: any) {
            toast.error(err.message || 'Hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!user) return
        const supabase = createClient()
        const task = tasks.find(t => t.id === id)
        const { error } = await supabase.from('tasks').delete().eq('id', id)
        if (error) toast.error('Silinemedi')
        else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await logAudit({
                supabase: supabase as any,
                companyId: user.active_company_id!,
                actorUserId: user.id,
                action: 'TASK_DELETED',
                targetType: 'task',
                targetId: id,
                metadata: {
                    context: {
                        title: task?.title || '',
                        project_id: task?.project_id || ''
                    }
                }
            })
            await logActivity({
                supabase: supabase as any,
                companyId: user.active_company_id!,
                actorUserId: user.id,
                eventType: 'TASK_DELETED',
                title: 'Görev Silindi',
                summary: `'${task?.title}' silindi`,
                entityType: 'task',
                entityId: id,
                severity: 'warning'
            })
            toast.success('Görev silindi')
            // Realtime incremental deletion will remove it from the list
        }
        setDeleteConfirm(null)
    }

    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = { todo: [], doing: [], done: [] }
        tasks.forEach(t => {
            if (grouped[t.status]) {
                grouped[t.status].push(t)
            } else {
                grouped[t.status] = [t]
            }
        })
        return grouped
    }, [tasks])

    if (loading) return <div className="p-6"><LoadingSkeleton rows={4} cols={3} /></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-0)' }}>Görevler</h2>
                    <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        {tasks.length} görev • <span className="pulse-dot inline-block w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} /> Gerçek zamanlı
                        {refreshing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                    </p>
                </div>
                <button onClick={openCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Yeni Görev
                </button>
            </div>

            {tasks.length === 0 ? (
                <EmptyState
                    title="Henüz görev yok"
                    description="İlk görevinizi oluşturun ve takım çalışmanızı organize edin."
                    icon={<ListTodo className="w-7 h-7" style={{ color: 'var(--color-text-3)' }} />}
                    action={
                        <button onClick={openCreate} className="btn-primary">
                            <Plus className="w-4 h-4" /> Görev Oluştur
                        </button>
                    }
                />
            ) : (
                /* Kanban Board */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {columns.map((col) => {
                        const Icon = col.icon
                        const columnTasks = tasksByStatus[col.key] || []

                        return (
                            <div key={col.key}>
                                {/* Column Header */}
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Icon className="w-4 h-4" style={{ color: col.color }} />
                                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-0)' }}>
                                        {col.label}
                                    </span>
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full"
                                        style={{
                                            background: 'var(--color-surface-3)',
                                            color: 'var(--color-text-3)',
                                        }}
                                    >
                                        {columnTasks.length}
                                    </span>
                                </div>

                                {/* Cards */}
                                <div className="space-y-2 min-h-[200px]">
                                    {columnTasks.map((task, i) => {
                                        const isOverdue = task.due_date
                                            && task.status !== 'done'
                                            && new Date(task.due_date) < new Date()

                                        return (
                                            <div
                                                key={task.id}
                                                className="p-3.5 rounded-xl transition-all duration-200 cursor-pointer group animate-fade-in"
                                                style={{
                                                    background: 'var(--color-surface-1)',
                                                    border: isOverdue
                                                        ? '1px solid rgba(239,68,68,0.55)'
                                                        : '1px solid var(--color-border)',
                                                    boxShadow: isOverdue
                                                        ? '0 0 0 1px rgba(239,68,68,0.12)'
                                                        : 'none',
                                                    animationDelay: `${i * 40}ms`,
                                                }}
                                                onClick={() => openEdit(task)}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <GripVertical className="w-4 h-4 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--color-text-3)' }} />
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEdit(task) }}
                                                            className="p-1 rounded"
                                                            style={{ color: 'var(--color-text-3)' }}
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(task.id) }}
                                                            className="p-1 rounded"
                                                            style={{ color: 'var(--color-danger)' }}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-0)' }}>
                                                    {task.title}
                                                </h4>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>
                                                        {task.projects?.title || '—'}
                                                    </span>
                                                    {task.due_date && (
                                                        <span
                                                            className="flex items-center gap-1 text-[11px]"
                                                            style={{ color: isOverdue ? 'rgba(239,68,68,0.9)' : 'var(--color-text-3)' }}
                                                        >
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(task.due_date)}
                                                            {isOverdue && <span className="font-semibold">· Gecikti</span>}
                                                        </span>
                                                    )}
                                                </div>
                                                {task.users?.full_name && (
                                                    <div className="mt-2 pt-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
                                                        <div
                                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                                            style={{ background: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}
                                                        >
                                                            {task.users.full_name.charAt(0)}
                                                        </div>
                                                        <span className="text-[11px]" style={{ color: 'var(--color-text-2)' }}>
                                                            {task.users.full_name}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Quick status change */}
                                                <div className="flex gap-1 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--color-border)' }}>
                                                    {columns.filter((c) => c.key !== task.status).map((c) => (
                                                        <button
                                                            key={c.key}
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, c.key) }}
                                                            className="text-[10px] px-2 py-1 rounded-md flex-1 text-center transition-colors font-medium"
                                                            style={{
                                                                background: 'var(--color-surface-2)',
                                                                color: c.color,
                                                                border: '1px solid var(--color-border)',
                                                            }}
                                                        >
                                                            {c.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? 'Görev Düzenle' : 'Yeni Görev'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Başlık</label>
                        <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input-field" required />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Proje</label>
                        <select value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} className="input-field" required>
                            <option value="">Seçiniz</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Atanan Kişi</label>
                        <select value={formAssignedTo} onChange={(e) => setFormAssignedTo(e.target.value)} className="input-field" required>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Durum</label>
                            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as TaskStatus)} className="input-field">
                                <option value="todo">Yapılacak</option>
                                <option value="doing">Yapılıyor</option>
                                <option value="done">Tamamlandı</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-2)' }}>Bitiş Tarihi</label>
                            <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="input-field" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">İptal</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : editingTask ? 'Güncelle' : 'Oluştur'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Görevi Sil">
                <p className="text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>Bu görevi silmek istediğinize emin misiniz?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">İptal</button>
                    <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Sil</button>
                </div>
            </Modal>
        </div>
    )
}
