import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
        pages.push(i)
    }

    return (
        <div className="flex items-center justify-center gap-1 mt-4">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="btn-ghost p-2 disabled:opacity-30"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {start > 1 && (
                <>
                    <button onClick={() => onPageChange(1)} className="btn-ghost px-3 py-1.5 text-sm">
                        1
                    </button>
                    {start > 2 && <span style={{ color: 'var(--color-text-3)' }}>…</span>}
                </>
            )}

            {pages.map((p) => (
                <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 ${p === page ? 'btn-primary' : 'btn-ghost'
                        }`}
                >
                    {p}
                </button>
            ))}

            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span style={{ color: 'var(--color-text-3)' }}>…</span>}
                    <button onClick={() => onPageChange(totalPages)} className="btn-ghost px-3 py-1.5 text-sm">
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="btn-ghost p-2 disabled:opacity-30"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    )
}
