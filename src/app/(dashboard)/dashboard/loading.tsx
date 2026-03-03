import { StatCardSkeleton } from '@/components/ui/loading'

export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header placeholder */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-48 bg-stone-800 rounded-md"></div>
                    <div className="h-4 w-64 bg-stone-800/60 rounded-md mt-2"></div>
                </div>
            </div>

            {/* Stat Cards Sketelon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>

            {/* Charts Loading Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="h-6 w-32 bg-stone-800 rounded mb-6"></div>
                    <div className="h-[280px] w-full bg-stone-800/50 rounded-lg"></div>
                </div>

                <div className="p-6 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-center items-center">
                    <div className="h-6 w-40 bg-stone-800 rounded mb-6"></div>
                    <div className="h-10 w-32 bg-stone-800 rounded mb-2"></div>
                    <div className="h-4 w-24 bg-stone-800/50 rounded"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="h-6 w-32 bg-stone-800 rounded mb-6"></div>
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 w-full bg-stone-800/50 rounded-lg"></div>
                        ))}
                    </div>
                </div>
                <div className="p-6 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="h-6 w-32 bg-stone-800 rounded mb-6"></div>
                    <div className="h-[280px] w-full bg-stone-800/50 rounded-lg"></div>
                </div>
            </div>
        </div>
    )
}
