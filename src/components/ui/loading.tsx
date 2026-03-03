export function LoadingSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-3 animate-fade-in">
            {/* Header skeleton */}
            <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-48 rounded-lg" />
                <div className="skeleton h-10 w-32 rounded-lg ml-auto" />
            </div>
            {/* Table skeleton */}
            <div
                className="rounded-xl overflow-hidden"
                style={{
                    background: 'var(--color-surface-1)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <div className="p-4 space-y-3">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4" style={{ animationDelay: `${i * 80}ms` }}>
                            {Array.from({ length: cols }).map((_, j) => (
                                <div
                                    key={j}
                                    className="skeleton h-5 rounded"
                                    style={{
                                        width: `${Math.random() * 40 + 60}px`,
                                        flex: j === 0 ? 2 : 1,
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function StatCardSkeleton() {
    return (
        <div className="stat-card">
            <div className="flex items-start justify-between mb-3">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="skeleton w-16 h-5 rounded-full" />
            </div>
            <div className="skeleton w-20 h-8 rounded mb-1" />
            <div className="skeleton w-32 h-4 rounded" />
        </div>
    )
}
