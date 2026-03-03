'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useRouter } from 'next/navigation'
import { Search, X, Users, FolderKanban, FileText, ListTodo, ArrowRight, Command } from 'lucide-react'

interface SearchResult {
    id: string
    title: string
    subtitle: string
    type: 'customer' | 'project' | 'task' | 'offer'
    url: string
}

const typeConfig = {
    customer: { icon: Users, label: 'Müşteri', color: 'var(--color-accent)' },
    project: { icon: FolderKanban, label: 'Proje', color: 'var(--color-info, #00b8d4)' },
    task: { icon: ListTodo, label: 'Görev', color: 'var(--color-warn)' },
    offer: { icon: FileText, label: 'Teklif', color: 'var(--color-danger)' },
}

export function SearchPalette() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const { user } = useAuthStore()
    const router = useRouter()

    // ⌘K shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(prev => !prev)
            }
            if (e.key === 'Escape') {
                setOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Auto-focus input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50)
            setQuery('')
            setResults([])
            setSelectedIndex(0)
        }
    }, [open])

    // Search with debounce
    const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined)

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!user || !user.active_company_id || searchQuery.length < 2) {
            setResults([])
            return
        }

        setLoading(true)
        const supabase = createClient() as ReturnType<typeof createClient>
        const allResults: SearchResult[] = []

        try {
            // Search Customers
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name, email, status')
                .eq('company_id', user.active_company_id!)
                .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                .limit(5)

            if (customers) {
                customers.forEach(c => allResults.push({
                    id: c.id,
                    title: c.name,
                    subtitle: c.email,
                    type: 'customer',
                    url: '/customers',
                }))
            }

            // Search Projects
            const { data: projects } = await supabase
                .from('projects')
                .select('id, title, status, budget')
                .eq('company_id', user.active_company_id!)
                .ilike('title', `%${searchQuery}%`)
                .limit(5)

            if (projects) {
                projects.forEach(p => allResults.push({
                    id: p.id,
                    title: p.title,
                    subtitle: `Bütçe: ₺${p.budget?.toLocaleString('tr-TR') || '0'}`,
                    type: 'project',
                    url: `/projects/${p.id}`,
                }))
            }

            // Search Tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, title, status, project_id')
                .eq('company_id', user.active_company_id!)
                .ilike('title', `%${searchQuery}%`)
                .limit(5)

            if (tasks) {
                tasks.forEach(t => allResults.push({
                    id: t.id,
                    title: t.title,
                    subtitle: t.status === 'todo' ? 'Yapılacak' : t.status === 'doing' ? 'Devam Ediyor' : 'Tamamlandı',
                    type: 'task',
                    url: `/projects/${t.project_id}?tab=tasks`,
                }))
            }

            setResults(allResults)
            setSelectedIndex(0)
        } catch (err) {
            console.error('Search error:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        searchDebounce.current = setTimeout(() => performSearch(query), 300)
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current)
        }
    }, [query, performSearch])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            router.push(results[selectedIndex].url)
            setOpen(false)
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh]"
            onClick={() => setOpen(false)}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                }}
            />

            {/* Palette */}
            <div
                className="relative w-full max-w-[580px] mx-4 rounded-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--color-surface-1)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 229, 160, 0.1)',
                    animation: 'search-palette-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Input */}
                <div
                    className="flex items-center gap-3 px-5 py-4"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Müşteri, proje, görev veya teklif ara..."
                        className="flex-1 bg-transparent border-none outline-none text-[15px]"
                        style={{ color: 'var(--color-text-0)', caretColor: 'var(--color-accent)' }}
                    />
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1 rounded-md shrink-0"
                        style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-3)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {loading && (
                        <div className="px-5 py-8 text-center">
                            <div
                                className="w-5 h-5 border-2 rounded-full mx-auto"
                                style={{
                                    borderColor: 'var(--color-surface-4)',
                                    borderTopColor: 'var(--color-accent)',
                                    animation: 'spin 0.6s linear infinite',
                                }}
                            />
                        </div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div className="px-5 py-8 text-center">
                            <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
                                &ldquo;{query}&rdquo; için sonuç bulunamadı
                            </p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="p-2">
                            {Object.entries(
                                results.reduce<Record<string, SearchResult[]>>((acc, r) => {
                                    if (!acc[r.type]) acc[r.type] = []
                                    acc[r.type].push(r)
                                    return acc
                                }, {})
                            ).map(([type, items]) => {
                                const config = typeConfig[type as keyof typeof typeConfig]
                                const Icon = config.icon
                                return (
                                    <div key={type} className="mb-2">
                                        <div
                                            className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                                            style={{ color: config.color }}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {config.label}
                                        </div>
                                        {items.map((result) => {
                                            const globalIndex = results.indexOf(result)
                                            const isSelected = globalIndex === selectedIndex
                                            return (
                                                <button
                                                    key={result.id}
                                                    onClick={() => {
                                                        router.push(result.url)
                                                        setOpen(false)
                                                    }}
                                                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                                                    style={{
                                                        background: isSelected ? 'var(--color-surface-3)' : 'transparent',
                                                        borderLeft: isSelected ? `2px solid ${config.color}` : '2px solid transparent',
                                                    }}
                                                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                >
                                                    <div className="min-w-0">
                                                        <p
                                                            className="text-sm font-medium truncate"
                                                            style={{ color: 'var(--color-text-0)' }}
                                                        >
                                                            {result.title}
                                                        </p>
                                                        <p
                                                            className="text-xs truncate mt-0.5"
                                                            style={{ color: 'var(--color-text-3)' }}
                                                        >
                                                            {result.subtitle}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <ArrowRight
                                                            className="w-4 h-4 shrink-0"
                                                            style={{ color: config.color }}
                                                        />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {!loading && query.length < 2 && (
                        <div className="px-5 py-8 text-center">
                            <Command className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-text-3)', opacity: 0.4 }} />
                            <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
                                Aramaya başlamak için yazın...
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <kbd className="px-2 py-0.5 rounded text-[10px] font-mono"
                                    style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }}
                                >↑↓</kbd>
                                <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>gezin</span>
                                <kbd className="px-2 py-0.5 rounded text-[10px] font-mono"
                                    style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }}
                                >↵</kbd>
                                <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>seçin</span>
                                <kbd className="px-2 py-0.5 rounded text-[10px] font-mono"
                                    style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }}
                                >esc</kbd>
                                <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>kapat</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>


        </div>
    )
}
