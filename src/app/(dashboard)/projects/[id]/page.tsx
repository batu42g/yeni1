import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectFiles } from '@/components/projects/ProjectFiles'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { ActivityTimeline } from '@/components/projects/ActivityTimeline'
import { ArrowLeft, User, DollarSign, Briefcase, LayoutDashboard, FileText, CheckSquare, Activity } from 'lucide-react'
import Link from 'next/link'
import type { ProjectStatus } from '@/types/database'

// Helper to format currency
const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    // Varsayılan TRY
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)
}

export default async function ProjectDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ tab?: string }>
}) {
    const { id } = await params
    const { tab } = await searchParams
    const activeTab = tab || 'overview'

    const supabase = await createClient()

    // 1. Proje Detaylarını Çek
    const { data: project, error } = await supabase
        .from('projects')
        .select(`
            *,
            customers (id, name, email)
        `)
        .eq('id', id)
        .single()

    if (error || !project) {
        notFound()
    }

    // Auth user ID for permissions
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Tab'a göre ek verileri çek
    let tasks: any[] = []
    let companyUsers: any[] = []

    if (activeTab === 'tasks' && user) {
        // Görevleri Çek
        const { data: tasksData } = await supabase
            .from('tasks')
            .select(`
                *,
                users:assigned_to (id, full_name, avatar_url)
            `)
            .eq('project_id', id)
            .order('created_at', { ascending: false })
        tasks = tasksData || []

        const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()

        if (profile && profile.company_id) {
            const { data: usersData } = await supabase
                .from('users')
                .select('id, full_name, avatar_url')
                .eq('company_id', profile.company_id)
            companyUsers = usersData || []
        }
    }

    // Status label map
    const statusLabels: Record<ProjectStatus, string> = {
        pending: 'Beklemede',
        in_progress: 'Devam Ediyor',
        completed: 'Tamamlandı'
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/projects"
                    className="flex items-center gap-2 text-sm w-fit group transition-colors"
                    style={{ color: 'var(--color-text-3)' }}
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Projeler Listesine Dön
                </Link>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-0)' }}>{project.title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--color-text-3)' }}>
                            {project.customers && (
                                <div className="flex items-center gap-1.5">
                                    <User className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                                    <span>{project.customers.name}</span>
                                </div>
                            )}
                            <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${project.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                project.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                }`}>
                                {statusLabels[project.status as ProjectStatus] || project.status}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
                <Link
                    href={`/projects/${id}?tab=overview`}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap"
                    style={{
                        borderColor: activeTab === 'overview' ? 'var(--color-accent)' : 'transparent',
                        color: activeTab === 'overview' ? 'var(--color-text-0)' : 'var(--color-text-3)',
                    }}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Genel Bakış
                </Link>
                <Link
                    href={`/projects/${id}?tab=tasks`}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap"
                    style={{
                        borderColor: activeTab === 'tasks' ? 'var(--color-accent)' : 'transparent',
                        color: activeTab === 'tasks' ? 'var(--color-text-0)' : 'var(--color-text-3)',
                    }}
                >
                    <CheckSquare className="w-4 h-4" />
                    Görevler
                </Link>
                <Link
                    href={`/projects/${id}?tab=files`}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap"
                    style={{
                        borderColor: activeTab === 'files' ? 'var(--color-accent)' : 'transparent',
                        color: activeTab === 'files' ? 'var(--color-text-0)' : 'var(--color-text-3)',
                    }}
                >
                    <FileText className="w-4 h-4" />
                    Dosyalar
                </Link>
                <Link
                    href={`/projects/${id}?tab=activity`}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap"
                    style={{
                        borderColor: activeTab === 'activity' ? 'var(--color-accent)' : 'transparent',
                        color: activeTab === 'activity' ? 'var(--color-text-0)' : 'var(--color-text-3)',
                    }}
                >
                    <Activity className="w-4 h-4" />
                    Aktivite
                </Link>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-300">
                        {/* Left Column: Details */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="rounded-xl p-6 relative overflow-hidden group" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-colors" style={{ background: 'var(--color-accent-glow)' }}></div>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                                    <Briefcase className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                                    Proje Açıklaması
                                </h2>
                                <p className="leading-relaxed whitespace-pre-wrap text-sm" style={{ color: 'var(--color-text-2)' }}>
                                    {project.description || 'Açıklama girilmemiş.'}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Meta Info */}
                        <div className="space-y-6">
                            <div className="rounded-xl p-6 space-y-6" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                                <h3 className="font-semibold border-b pb-2" style={{ color: 'var(--color-text-0)', borderColor: 'var(--color-border)' }}>Proje Detayları</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-3)' }}>Bütçe</label>
                                        <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--color-text-0)' }}>
                                            <DollarSign className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                                            {formatCurrency(project.budget)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-3)' }}>Oluşturulma</label>
                                        <div className="text-sm" style={{ color: 'var(--color-text-2)' }}>
                                            {new Date(project.created_at).toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {project.customers && (
                                <div className="rounded-xl p-6" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                                    <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-0)' }}>Müşteri</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}>
                                            {project.customers.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-0)' }}>{project.customers.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>{project.customers.email}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="rounded-xl p-6 animate-in fade-in zoom-in-95 duration-300" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <ProjectFiles
                            projectId={project.id}
                            companyId={project.company_id}
                            userId={user?.id || ''}
                        />
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 h-[calc(100vh-250px)]">
                        <KanbanBoard
                            projectId={project.id}
                            tasks={tasks}
                            users={companyUsers}
                            currentUserId={user?.id || ''}
                        />
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="rounded-xl p-6 animate-in fade-in zoom-in-95 duration-300" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                            <Activity className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
                            Proje Aktivitesi
                        </h2>
                        <ActivityTimeline projectId={id} />
                    </div>
                )}
            </div>
        </div>
    )
}
