'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell, Menu } from 'lucide-react'
import { SearchPalette } from '@/components/ui/search-palette'
import { NotificationPopover } from '@/components/ui/notification-popover'

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/customers': 'Müşteriler',
    '/projects': 'Projeler',
    '/tasks': 'Görevler',
    '/offers': 'Teklifler',
    '/activity': 'Aktivite',
    '/settings': 'Ayarlar',
}

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const pathname = usePathname()
    const title = pageTitles[pathname] || 'CRMPanel'

    return (
        <>
            <SearchPalette />
            <header
                className="sticky top-0 z-30 flex items-center justify-between h-16 px-6"
                style={{
                    background: 'color-mix(in srgb, var(--color-surface-0) 85%, transparent)',
                    backdropFilter: 'blur(16px)',
                    borderBottom: '1px solid var(--color-border)',
                }}
            >
                <div className="flex items-center gap-4">
                    {/* Mobile Menu */}
                    <button
                        onClick={onMenuToggle}
                        className="lg:hidden btn-ghost p-2"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div>
                        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-0)' }}>
                            {title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Trigger - opens command palette */}
                    <button
                        onClick={() => {
                            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
                        }}
                        className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer"
                        style={{
                            background: 'var(--color-surface-1)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        <Search className="w-4 h-4" style={{ color: 'var(--color-text-3)' }} />
                        <span className="text-sm" style={{ color: 'var(--color-text-3)' }}>Ara...</span>
                        <kbd
                            className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
                            style={{
                                background: 'var(--color-surface-3)',
                                color: 'var(--color-text-3)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            Ctrl+K
                        </kbd>
                    </button>

                    {/* Notifications */}
                    <NotificationPopover />
                </div>
            </header>
        </>
    )
}
