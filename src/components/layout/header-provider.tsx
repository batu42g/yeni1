'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export function HeaderProvider({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div onClick={(e) => e.stopPropagation()}>
                        <Sidebar />
                    </div>
                </div>
            )}

            <main className="flex-1 lg:ml-[260px] transition-all duration-300 relative z-10 w-full overflow-x-hidden">
                <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
                <div className="p-6">
                    {children}
                </div>
            </main>
        </>
    )
}
