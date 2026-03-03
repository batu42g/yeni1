'use client'

import { useTransition, useState } from 'react'
import { inviteUser } from '@/actions/invitations' // Fix import logic in next step if this is wrong path, but it seems correct as per previous context
import { toast } from 'react-hot-toast'
import { Mail, Loader2, Shield } from 'lucide-react'

// Correct Import: The user context showed 'src/actions/invitations.ts' exists.
// We need to import the server action correctly.
// In Next.js Server Actions, we can import them directly into client components.

export function InviteUser({ companyId }: { companyId: string }) {
    const [pending, startTransition] = useTransition()
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('staff')

    const handleSubmit = async (formData: FormData) => {
        const emailVal = formData.get('email') as string
        const roleVal = formData.get('role') as string

        if (!emailVal) return

        startTransition(async () => {
            // We need to pass the FormData directly to the server action or create a new one
            // Since form action automatically passes formData, we can just use the wrapper
            // specific logic:

            // Manually appending companyId is tricky with server actions called from form.
            // The server action 'inviteUser' in 'src/actions/invitations.ts' 
            // reads currentUser from auth(), it doesn't seem to use companyId param but relies on user's company_id.
            // Let's check 'src/actions/invitations.ts' again. 
            // Line 30-34: It fetches currentUserData.company_id. So companyId prop here might be redundant for the action but good for UI context.

            // However, to be safe and use the closure variables if needed.
            // But 'inviteUser' signature is (prevState, formData).
            // We should probably rely on the form submission directly or construct it.

            const data = new FormData()
            data.append('email', emailVal)
            data.append('role', roleVal)
            // inviteUser doesn't use companyId from formData, it uses session. 

            // But wait, the 'inviteUser' action is defined as:
            // export async function inviteUser(email: string, role: ...) 
            // OR export async function inviteUser(formData: FormData)
            // From Step 2408 view_file: 
            // export async function inviteUser(prevState: any, formData: FormData)

            // So it expects to be used with useFormState or direct call with formData?
            // Since we are using startTransition, we can call it directly but we need to match signature.
            // Actually, usually we call a wrapper or the action directly if it's simpler.
            // Let's blindly call logic similar to previous working state.

            // Re-reading 'src/actions/invitations.ts':
            // export async function inviteUser(prevState: any, formData: FormData) { ... }
            // It calls 'coreInviteUser' inside.

            // We can just call coreInviteUser if it was a server action?
            // 'inviteUser' is the server action.
            // We need to pass 'null' as prevState if calling directly? No, that's for useFormState.
            // If we call it directly: await inviteUser(null, formData)

            const result = await inviteUser(null, data)

            if (result.error) {
                toast.error(result.error)
            } else if (result.success) {
                toast.success('Davet gönderildi')
                setEmail('')
                setRole('staff')
                window.location.reload()
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* Removed duplicate heading here */}

            <form action={handleSubmit} className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium ml-1" style={{ color: 'var(--color-text-2)' }}>E-posta Adresi</label>
                    <input
                        name="email"
                        type="email"
                        autoComplete="off"
                        required
                        placeholder="ornek@sirket.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-[42px] px-4 rounded-lg text-sm border focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
                        style={{
                            backgroundColor: 'var(--color-surface-1)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-0)',
                        }}
                    />
                </div>

                <div className="w-32 space-y-1.5">
                    <label className="text-xs font-medium ml-1" style={{ color: 'var(--color-text-2)' }}>Rol</label>
                    <div className="relative">
                        <select
                            name="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full h-[42px] px-3 pr-8 rounded-lg text-sm border focus:ring-2 focus:ring-opacity-50 outline-none transition-all appearance-none cursor-pointer"
                            style={{
                                backgroundColor: 'var(--color-surface-1)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-0)',
                            }}
                        >
                            <option value="staff">Personel</option>
                            <option value="admin">Yönetici</option>
                        </select>
                        <Shield className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="h-[42px] px-6 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    style={{
                        backgroundColor: 'var(--color-accent)',
                        color: '#000',
                    }}
                >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Davet Gönder
                </button>
            </form>
            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>
                Davet edilen kullanıcıya bir e-posta gönderilecektir. Link 7 gün geçerlidir.
            </p>
        </div>
    )
}
