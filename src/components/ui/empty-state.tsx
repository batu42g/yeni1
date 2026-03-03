import { Inbox } from 'lucide-react'

interface EmptyStateProps {
    title: string
    description: string
    action?: React.ReactNode
    icon?: React.ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div
                className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                }}
            >
                {icon || <Inbox className="w-7 h-7" style={{ color: 'var(--color-text-3)' }} />}
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-0)' }}>
                {title}
            </h3>
            <p className="text-sm mb-6 text-center max-w-sm" style={{ color: 'var(--color-text-3)' }}>
                {description}
            </p>
            {action}
        </div>
    )
}
