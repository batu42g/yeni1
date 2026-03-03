'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidth = '32rem' }: ModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
        }
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!mounted || !isOpen) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                className="relative w-full bg-[var(--color-surface-1)] rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in"
                style={{ maxWidth, border: '1px solid var(--color-border)' }}
            >
                <div
                    className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: 'var(--color-border)' }}
                >
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-0)' }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors duration-200 hover:bg-black/5"
                        style={{ color: 'var(--color-text-3)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
