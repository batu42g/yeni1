'use server'

import { logAudit, logActivity } from '@/lib/audit'
import { logPermissionDenied } from '@/lib/permission-audit'
import { dispatchWebhook } from '@/lib/webhooks'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const inviteSchema = z.object({
    email: z.string().email('Geçerli bir e-posta adresi giriniz'),
    role: z.enum(['admin', 'staff']),
})

export async function inviteUser(prevState: unknown, formData: FormData) {
    const email = formData.get('email') as string
    const role = formData.get('role') as 'admin' | 'staff'

    return await coreInviteUser({ email, role })
}

export async function coreInviteUser({ email, role }: { email: string, role: 'admin' | 'staff' }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Oturum açmanız gerekiyor' }
    }

    const { data: currentUserData } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

    if (!currentUserData || !currentUserData.company_id || currentUserData.role !== 'admin') {
        return { error: 'Sadece yöneticiler davet gönderebilir' }
    }

    if (user.email === email) {
        return { error: 'Kendinize davet gönderemezsiniz.' }
    }

    const { count } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentUserData.company_id)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (count && count > 50) {
        return { error: 'Saatlik davet limitine ulaştınız (50/saat). Lütfen daha sonra tekrar deneyin.' }
    }

    const validatedFields = inviteSchema.safeParse({ email, role })
    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors.email?.[0] || 'Geçersiz veri' }
    }

    const { data: existingInvite } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .eq('company_id', currentUserData.company_id)
        .is('accepted_at', null)
        .neq('status', 'revoked')
        .neq('status', 'rejected')
        .single()

    if (existingInvite) {
        return { error: `${email}: Zaten bekleyen bir davet var.` }
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error: insertError } = await supabase
        .from('invitations')
        .insert({
            company_id: currentUserData.company_id,
            email,
            role,
            token_hash: token,
            invited_by: user.id,
            expires_at: expiresAt.toISOString(),
            status: 'pending'
        })

    if (insertError) {
        console.error('Invite Error:', insertError)
        return { error: `${email}: Davet oluşturulurken hata oluştu.` }
    }

    await logAudit({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        companyId: currentUserData.company_id,
        actorUserId: user.id,
        action: 'INVITATION_CREATED',
        targetType: 'invitation',
        targetId: token,
        metadata: {
            context: {
                email,
                role,
                expires_at: expiresAt.toISOString()
            },
            changes: [
                { field: 'status', old: null, new: 'pending' }
            ]
        }
    })

    // Log action (Activity)
    await logActivity({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        companyId: currentUserData.company_id,
        actorUserId: user.id,
        eventType: 'INVITATION_SENT',
        title: 'Ekip Daveti Gönderildi',
        summary: `${email} isimli kullanıcı ${role} yetkisiyle ekibe davet edildi.`,
        entityType: 'invitation',
        severity: 'info',
        metadata: { email, role }
    })

    try {
        await dispatchWebhook(currentUserData.company_id, 'INVITATION_CREATED', {
            id: token,
            email,
            role,
            invited_by: user.id,
            expires_at: expiresAt
        })
    } catch (err) {
        console.error('Webhook dispatch error:', err)
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${token}`
    console.log('Invite Link:', inviteLink)

    return {
        success: true,
        message: 'Davet gönderildi.',
        inviteLink
    }
}

export async function cancelInvitation(inviteId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    const { data: currentUserData } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

    if (!currentUserData || !currentUserData.company_id || currentUserData.role !== 'admin') {
        await logPermissionDenied({ endpoint: 'actions/revokeInvitation', targetType: 'invitation', targetId: inviteId, requiredRole: 'admin', reason: 'NOT_ADMIN' })
        throw new Error('Yetkiniz yok')
    }

    const { data: invite } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', inviteId)
        .eq('company_id', currentUserData.company_id)
        .single()

    if (!invite) throw new Error('Davetiye bulunamadı')

    const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', inviteId)
        .eq('company_id', currentUserData.company_id)

    if (error) throw new Error('Silinemedi: ' + error.message)

    await logAudit({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        companyId: currentUserData.company_id,
        actorUserId: user.id,
        action: 'INVITE_REVOKED',
        targetType: 'invitation',
        targetId: inviteId,
        metadata: {
            context: {
                invite_id: inviteId,
                email: invite.email,
                role: invite.role,
                expires_at: invite.expires_at
            },
            changes: [
                { field: 'status', old: 'pending', new: 'revoked' }
            ]
        }
    })

    await logActivity({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        companyId: currentUserData.company_id,
        actorUserId: user.id,
        eventType: 'INVITATION_REVOKED',
        title: 'Davet İptal Edildi',
        summary: `${invite.email} adresine gönderilen takım daveti iptal edildi.`,
        entityType: 'invitation',
        entityId: inviteId,
        severity: 'warning'
    })

    return { success: true }
}
