import { Suspense } from 'react'
import { PendingInvites } from '@/components/dashboard/PendingInvites'
import { getUserContext } from '@/lib/server-context'
import DashboardContent from './DashboardContent'
import DashboardLoading from './loading' // Will reuse the skeleton markup

// Ensures the page is dynamically rendered to always fetch latest dashboard data
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    // Fast parallel fetch for User Identity only.
    const ctx = await getUserContext()

    if (!ctx) {
        return null
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Pending Invitations Alert */}
            <PendingInvites />

            {/* Welcome - Instantly rendered while Suspense waits for the DB */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-0)' }}>
                        Merhaba, {ctx.fullName?.split(' ')[0]} 👋
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>
                        İşte bugünkü özet durumunuz.
                    </p>
                </div>
            </div>

            {/* Content heavy loading streaming boundary */}
            <Suspense fallback={<DashboardSkeletons />}>
                <DashboardContent />
            </Suspense>
        </div>
    )
}

function DashboardSkeletons() {
    return (
        <div className="space-y-6 animate-pulse mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-between h-[104px]">
                        <div className="flex justify-between"><div className="w-8 h-8 rounded bg-stone-800/50"></div></div>
                        <div className="w-16 h-6 rounded bg-stone-800/50 mt-1"></div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="h-6 w-32 bg-stone-800 rounded mb-6"></div>
                    <div className="h-[280px] w-full bg-stone-800/50 rounded-lg"></div>
                </div>
                <div className="p-6 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-center items-center">
                    <div className="h-6 w-40 bg-stone-800 rounded mb-6"></div>
                    <div className="h-10 w-32 bg-stone-800 rounded mb-2"></div>
                </div>
            </div>
        </div>
    )
}
