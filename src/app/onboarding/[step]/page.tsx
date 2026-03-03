'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

import ProfileCompletionStep from '@/components/onboarding/ProfileCompletionStep'
import CompanyCreationStep from '@/components/onboarding/CompanyCreationStep'
import CompanySelectionStep from '@/components/onboarding/CompanySelectionStep'
import TeamSetupStep from '@/components/onboarding/TeamSetupStep'
import BillingSetupStep from '@/components/onboarding/BillingSetupStep'

export default function OnboardingStepPage() {
    const router = useRouter()
    const { step } = useParams()
    const { user, loading } = useAuthStore()
    const [verifying, setVerifying] = useState(true)

    useEffect(() => {
        if (loading) return

        if (!user) {
            router.push('/login')
            return
        }

        const currentStep = user.onboarding?.current_step.toLowerCase()

        if (user.onboarding?.is_completed || currentStep === 'finished') {
            router.push('/dashboard')
            return
        }

        if (currentStep !== step) {
            // User is trying to access wrong step, redirect to current allowed step
            router.push(`/onboarding/${currentStep}`)
            return
        }

        setVerifying(false)
    }, [user, loading, step, router])

    const handleCompleteStep = async () => {
        try {
            const resp = await fetch('/api/onboarding/complete-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: 'FINISHED' })
            })
            if (!resp.ok) return

            // Reset module-scope bootstrap promise so AuthProvider re-fetches on next mount
            // We directly update Zustand to avoid full page reload latency
            const res = await fetch('/api/context/bootstrap')
            if (res.ok) {
                const data = await res.json()
                const store = useAuthStore.getState()
                store.setUser({
                    id: data.user.id,
                    active_company_id: data.active_company_id,
                    role: data.role,
                    full_name: data.user.full_name,
                    avatar_url: data.user.avatar_url,
                    email: data.user.email || '',
                    onboarding: data.onboarding
                })
                store.setCompanies(data.companies || [])

                const newStep = data.onboarding.current_step.toLowerCase()
                if (data.onboarding.is_completed || newStep === 'finished') {
                    router.push('/dashboard')
                } else {
                    router.push(`/onboarding/${newStep}`)
                }
            }
        } catch (e) {
            console.error('Failed to advance step', e)
        }
    }

    // Force step completion updating
    const updateOnboardingStep = async (newStep: string) => {
        try {
            const resp = await fetch('/api/onboarding/complete-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: newStep })
            })
            if (resp.ok) await handleCompleteStep()
        } catch (e) {
            console.error('Update step error', e)
        }
    }

    if (loading || verifying) return <div className="text-center text-sm" style={{ color: 'var(--color-text-3)' }}>Aşama doğrulanıyor...</div>

    switch (step) {
        case 'profile_completion':
            return <ProfileCompletionStep onComplete={() => handleCompleteStep()} />
        case 'company_creation':
            return <CompanyCreationStep onComplete={() => handleCompleteStep()} />
        case 'company_selection':
            return <CompanySelectionStep onComplete={() => handleCompleteStep()} />
        case 'team_setup':
            return <TeamSetupStep onComplete={() => updateOnboardingStep('FINISHED')} onSkip={() => updateOnboardingStep('FINISHED')} />
        case 'billing_setup':
            return <BillingSetupStep onComplete={() => updateOnboardingStep('FINISHED')} />
        default:
            return (
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-4">Hazırlanıyor...</h2>
                    <p className="text-sm opacity-60">Sistem ayarlarınız güncelleniyor.</p>
                </div>
            )
    }
}
