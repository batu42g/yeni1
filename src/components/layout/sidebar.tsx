'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/providers/theme-provider'
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    ListTodo,
    FileText,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Zap,
    Shield,
    User,
    Activity,
    Trash2,
    Sun,
    Moon,
    BarChart3,
    ShieldCheck,
    UsersRound,
    ChevronsUpDown,
    Check,
    PlusCircle,
    Building2
} from 'lucide-react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/customers', label: 'Müşteriler', icon: Users },
    { href: '/projects', label: 'Projeler', icon: FolderKanban },
    { href: '/tasks', label: 'Görevler', icon: ListTodo },
    { href: '/offers', label: 'Teklifler', icon: FileText },
    { href: '/reports', label: 'Raporlar', icon: BarChart3 },
    { href: '/security', label: 'Güvenlik', icon: ShieldCheck },
    { href: '/team', label: 'Ekip Yönetimi', icon: UsersRound, adminOnly: true },
    { href: '/activity', label: 'Hesap Hareketleri', icon: Activity },
    { href: '/admin/audit', label: 'Denetim Kayıtları', icon: FileText, adminOnly: true },
    { href: '/admin/compliance', label: 'Güvenlik & Uyumluluk', icon: ShieldCheck, adminOnly: true },
    { href: '/trash', label: 'Çöp Kutusu', icon: Trash2, adminOnly: true },
    { href: '/settings', label: 'Ayarlar', icon: Settings, adminOnly: true },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, isAdmin, companies, activeCompany } = useAuthStore()
    const [collapsed, setCollapsed] = useState(false)
    const company = activeCompany()
    const myCompanies = companies
    const [showCompanyMenu, setShowCompanyMenu] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)
    const { theme, toggleTheme } = useTheme()

    const handleSwitchCompany = async (targetCompanyId: string) => {
        if (isSwitching || targetCompanyId === company?.id) return
        setIsSwitching(true)
        try {
            const res = await fetch('/api/user/switch-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: targetCompanyId }),
            })

            if (!res.ok) throw new Error('Failed to switch')

            // Refresh completely to update all context
            window.location.reload()
        } catch (error) {
            console.error(error)
            setIsSwitching(false)
        }
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <aside
            className={`
        fixed left-0 top-0 bottom-0 z-40 flex flex-col
        bg-[#0a0a0f] border-r border-gray-800
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
            style={{
                background: 'linear-gradient(180deg, var(--color-surface-1) 0%, var(--color-surface-0) 100%)',
                borderRight: '1px solid var(--color-border)',
            }}
        >
            {/* Logo & Company Switcher */}
            <div className="relative h-16 px-4 border-b flex items-center" style={{ borderColor: 'var(--color-border)' }}>
                <button
                    onClick={() => !collapsed && setShowCompanyMenu(!showCompanyMenu)}
                    className={`flex items-center gap-3 w-full text-left transition-colors rounded-lg p-1 -ml-1 hover:bg-white/5 ${collapsed ? 'justify-center cursor-default' : 'cursor-pointer'}`}
                >
                    <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 overflow-hidden"
                        style={{
                            background: company?.logo_url ? 'transparent' : 'linear-gradient(135deg, var(--color-accent) 0%, #00b8d4 100%)',
                        }}
                    >
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
                        ) : (
                            <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
                        )}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-bold tracking-tight truncate flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                                {company?.name || 'CRM Panel'}
                                <ChevronsUpDown className="w-3 h-3 opacity-50" />
                            </h2>
                            <p className="text-[10px] text-gray-500 truncate">Şirket Değiştir</p>
                        </div>
                    )}
                </button>

                {/* Dropdown Menu */}
                {showCompanyMenu && !collapsed && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowCompanyMenu(false)}
                        />
                        <div className="absolute top-full left-4 right-4 mt-2 p-2 rounded-xl shadow-xl z-50 border bg-[#1c1c24] border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                            <p className="px-2 py-1.5 text-xs font-medium text-gray-500">Şirketlerim</p>
                            {myCompanies.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSwitchCompany(c.id)}
                                    disabled={isSwitching}
                                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${company?.id === c.id
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-800 shrink-0">
                                        {c.logo_url ? (
                                            <img src={c.logo_url} className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-3 h-3" />
                                        )}
                                    </div>
                                    <span className="truncate flex-1 text-left">{c.name}</span>
                                    {company?.id === c.id && <Check className="w-4 h-4 ml-auto" />}
                                </button>
                            ))}

                            <div className="h-px bg-gray-800 my-2" />

                            <Link
                                href="/setup-company" // Assuming a page to create active company
                                onClick={() => setShowCompanyMenu(false)}
                                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <div className="w-6 h-6 rounded flex items-center justify-center border border-dashed border-gray-600 shrink-0">
                                    <PlusCircle className="w-3 h-3" />
                                </div>
                                <span className="text-left">Yeni Şirket Oluştur</span>
                            </Link>
                        </div>
                    </>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon

                    // Staff can't see admin-only items
                    if ('adminOnly' in item && item.adminOnly && !isAdmin()) return null

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 relative overflow-hidden
                ${collapsed ? 'justify-center' : ''}
              `}
                            style={{
                                background: isActive
                                    ? 'var(--color-accent-glow)'
                                    : 'transparent',
                                color: isActive ? 'var(--color-accent)' : 'var(--color-text-2)',
                            }}
                            title={collapsed ? item.label : undefined}
                        >
                            {isActive && (
                                <div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                    style={{ background: 'var(--color-accent)' }}
                                />
                            )}
                            <Icon
                                className="w-5 h-5 shrink-0 transition-colors duration-200"
                                style={{
                                    color: isActive ? 'var(--color-accent)' : undefined,
                                }}
                            />
                            {!collapsed && (
                                <span
                                    className="text-sm font-medium whitespace-nowrap transition-colors duration-200"
                                    style={{}}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-0)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = ''}
                                >
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User Section */}
            <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                {/* Role Badge */}
                {!collapsed && user && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{
                            background: isAdmin() ? 'var(--color-accent-glow)' : 'var(--color-info-dim)',
                        }}>
                            {isAdmin() ? (
                                <Shield className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                            ) : (
                                <User className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-0)' }}>
                                {user.full_name}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
                                {user.role === 'owner' ? 'Şirket Sahibi' : (user.role === 'admin' ? 'Yönetici' : 'Personel')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`
            flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
            transition-all duration-200 group
            ${collapsed ? 'justify-center' : ''}
          `}
                    style={{ color: 'var(--color-text-3)' }}
                    title={collapsed ? (theme === 'dark' ? 'Açık Tema' : 'Koyu Tema') : undefined}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 shrink-0 group-hover:text-yellow-400 transition-colors" />
                    ) : (
                        <Moon className="w-5 h-5 shrink-0 group-hover:text-indigo-400 transition-colors" />
                    )}
                    {!collapsed && (
                        <span className="text-sm font-medium transition-colors">
                            {theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                        </span>
                    )}
                </button>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className={`
            flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
            transition-all duration-200 group
            ${collapsed ? 'justify-center' : ''}
          `}
                    style={{ color: 'var(--color-text-3)' }}
                    title={collapsed ? 'Çıkış Yap' : undefined}
                >
                    <LogOut className="w-5 h-5 shrink-0 group-hover:text-red-400 transition-colors" />
                    {!collapsed && (
                        <span className="text-sm font-medium group-hover:text-red-400 transition-colors">Çıkış Yap</span>
                    )}
                </button>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute top-20 -right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-2)',
                }}
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
        </aside>
    )
}
