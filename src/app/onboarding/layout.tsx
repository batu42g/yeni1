import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${inter.className}`} style={{ background: 'var(--color-surface-0)' }}>
            <div className="w-full max-w-lg">
                <div style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '2rem' }}>
                    <div className="mb-8 flex justify-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, #00b8d4 100%)' }}>
                            <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}
