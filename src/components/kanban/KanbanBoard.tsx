'use client'

import { useState } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, defaultDropAnimationSideEffects, DropAnimation } from '@dnd-kit/core'
import { createPortal } from 'react-dom'
import { updateTaskStatus, createTask } from '@/actions/tasks'
import { User, Calendar, GripVertical, CheckCircle2, Circle, Clock, Plus, X } from 'lucide-react'
import type { Database, TaskStatus } from '@/types/database'
import toast from 'react-hot-toast'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    users?: { full_name: string, avatar_url: string | null } | null
}

interface KanbanBoardProps {
    tasks: Task[]
    projectId: string
    users: { id: string, full_name: string, avatar_url: string | null }[]
    currentUserId: string
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'Yapılacaklar', color: 'text-yellow-500' },
    { id: 'doing', title: 'Üzerinde Çalışılanlar', color: 'text-blue-500' },
    { id: 'done', title: 'Tamamlananlar', color: 'text-green-500' },
]

export function KanbanBoard({ tasks: initialTasks, projectId, users, currentUserId }: KanbanBoardProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [activeId, setActiveId] = useState<string | null>(null)

    // Handle Drag Start
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    // Handle Drag End
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const taskId = active.id as string
        const newStatus = over.id as TaskStatus

        const task = tasks.find(t => t.id === taskId)
        if (!task || task.status === newStatus) return

        // Optimistic Update
        const previousTasks = [...tasks]
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: newStatus } : t
        ))

        try {
            await updateTaskStatus(taskId, newStatus, projectId)
            toast.success('Durum güncellendi', { id: 'status-update' })
        } catch (error) {
            setTasks(previousTasks)
            toast.error('Geri alındı: Durum güncellenemedi')
        }
    }

    // Handle Create Task
    const handleCreateTask = async (title: string, status: TaskStatus) => {
        const tempId = crypto.randomUUID()
        const currentUser = users.find(u => u.id === currentUserId)

        // Optimistic Add
        const optimisticTask: Task = {
            id: tempId,
            title,
            status,
            project_id: projectId,
            company_id: '',
            assigned_to: currentUserId,
            created_at: new Date().toISOString(),
            due_date: null,
            deleted_at: null,
            users: currentUser ? { full_name: currentUser.full_name, avatar_url: currentUser.avatar_url } : null
        }

        setTasks(prev => [optimisticTask, ...prev])

        try {
            await createTask(projectId, title, status, currentUserId)
            toast.success('Görev oluşturuldu')
        } catch (error) {
            setTasks(prev => prev.filter(t => t.id !== tempId))
            toast.error('Görev oluşturulamadı')
        }
    }

    const activeTask = tasks.find(t => t.id === activeId)

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: { opacity: '0.5' },
            },
        }),
    }

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
                {COLUMNS.map(col => (
                    <Column
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        colorClass={col.color}
                        tasks={tasks.filter(t => t.status === col.id)}
                        onAddTask={(title) => handleCreateTask(title, col.id)}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    )
}

// --- Sub Components ---

function Column({ id, title, colorClass, tasks, onAddTask }: {
    id: string,
    title: string,
    colorClass: string,
    tasks: Task[],
    onAddTask: (title: string) => void
}) {
    const { setNodeRef, isOver } = useDroppable({ id })
    const [isAdding, setIsAdding] = useState(false)
    const [newTitle, setNewTitle] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTitle.trim()) return
        onAddTask(newTitle)
        setNewTitle('')
        setIsAdding(false)
    }

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col rounded-xl border-2 transition-colors h-full`}
            style={{
                background: isOver ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
                borderColor: isOver ? 'var(--color-accent)' : 'var(--color-border)',
            }}
        >
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between`} style={{ borderColor: 'var(--color-border)' }}>
                <h3 className={`font-bold flex items-center gap-2 ${colorClass}`}>
                    {id === 'done' ? <CheckCircle2 className="w-5 h-5" /> :
                        id === 'doing' ? <Clock className="w-5 h-5" /> :
                            <Circle className="w-5 h-5" />}
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }}>{tasks.length}</span>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--color-text-2)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-text-0)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-2)'; }}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Add Task Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="p-3 border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                    <input
                        autoFocus
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Görev adı..."
                        className="w-full rounded p-2 text-sm outline-none mb-2"
                        style={{
                            background: 'var(--color-surface-3)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-0)',
                        }}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="text-xs px-2 py-1"
                            style={{ color: 'var(--color-text-3)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-0)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-3)'}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="text-xs px-3 py-1 rounded transition-colors"
                            style={{
                                background: 'var(--color-accent)',
                                color: '#000',
                            }}
                        >
                            Ekle
                        </button>
                    </div>
                </form>
            )}

            {/* Task List */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px] scrollbar-thin">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                ))}
                {tasks.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-sm border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-3)' }}>
                        {id === 'done' ? 'Henüz tamamlanan yok' : 'Görev yok'}
                    </div>
                )}
            </div>
        </div>
    )
}

function TaskCard({ task, isOverlay }: { task: Task, isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    })

    const isOverdue = task.due_date
        && task.status !== 'done'
        && new Date(task.due_date) < new Date()

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined

    const borderColor = isOverlay
        ? 'rgb(99,102,241)'
        : isOverdue
            ? 'rgba(239,68,68,0.6)'   // ince kırmızı
            : 'var(--color-border)'

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                background: 'var(--color-surface-2)',
                borderColor,
                opacity: isDragging ? 0.3 : 1,
                zIndex: isOverlay ? 50 : 'auto',
                boxShadow: isOverlay
                    ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                    : isOverdue
                        ? '0 0 0 1px rgba(239,68,68,0.15)'
                        : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            }}
            {...listeners}
            {...attributes}
            className={`
                border p-4 rounded-lg shadow-sm group transition-all cursor-grab active:cursor-grabbing
                ${isOverlay ? 'rotate-2 scale-105' : ''}
            `}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = isOverdue ? 'rgba(239,68,68,0.9)' : 'var(--color-text-3)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = borderColor
            }}
        >
            <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${task.status === 'done' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    task.status === 'doing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    }`}>
                    {task.status === 'todo' ? 'Yapılacak' : task.status === 'doing' ? 'Sürüyor' : 'Bitti'}
                </span>
                <GripVertical className="w-4 h-4 transition-opacity opacity-0 group-hover:opacity-100" style={{ color: 'var(--color-text-3)' }} />
            </div>

            <h4 className="font-medium text-sm mb-3 line-clamp-2 leading-relaxed" style={{ color: 'var(--color-text-0)' }}>
                {task.title}
            </h4>

            <div className="flex items-center justify-between border-t pt-3 mt-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                    {task.users?.avatar_url ? (
                        <img src={task.users.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                    ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-2)' }}>
                            {task.users?.full_name?.charAt(0) || '?'}
                        </div>
                    )}
                    <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--color-text-3)' }}>
                        {task.users?.full_name || 'Atanmamış'}
                    </span>
                </div>

                {task.due_date && (
                    <div
                        className="flex items-center gap-1 text-xs"
                        style={{ color: isOverdue ? 'rgba(239,68,68,0.9)' : 'var(--color-text-3)' }}
                    >
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                        {isOverdue && <span className="font-semibold">· Gecikti</span>}
                    </div>
                )}
            </div>
        </div>
    )
}
