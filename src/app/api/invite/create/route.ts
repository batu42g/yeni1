import { createClient } from '@/lib/supabase/server'
import { generateToken } from '@/lib/auth-utils'
import { NextResponse } from 'next/server'
import { logAudit, logActivity } from '@/lib/audit'
import { logPermissionDenied } from '@/lib/permission-audit'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Check Authentication & Role
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user role & company_id safely
        const { data: profile } = await supabase.rpc('ensure_user_context').maybeSingle()

        if (!profile || !profile.company_id || (profile.role !== 'admin' && profile.role !== 'owner')) {
            await logPermissionDenied({ endpoint: '/api/invite/create', targetType: 'invitation', requiredRole: 'admin', reason: 'NOT_ADMIN' })
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await request.json()
        const { email, role } = body

        if (!email || !role) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
        }

        // 2. Generate Token
        const rawToken = generateToken()

        // 3. Store Invitation
        // We can use the user's supabase client because of RLS policies allowing admin insert
        const { data: insertedInvite, error: insertError } = await supabase
            .from('invitations')
            .insert({
                company_id: profile.company_id,
                invited_by: user.id,
                email: email,
                role: role,
                token_hash: rawToken, // Store raw token directly so RPC can find it
            })
            .select()
            .single()

        if (insertError) {
            console.error('Insert error:', insertError)
            return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
        }

        // 4. Logging
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await logAudit({
            supabase: supabase as any,
            companyId: profile.company_id,
            actorUserId: user.id,
            action: 'INVITE_CREATED',
            targetType: 'invitation',
            targetId: insertedInvite?.id,
            metadata: {
                context: {
                    email,
                    role
                },
                changes: [
                    { field: 'status', old: null, new: 'pending' }
                ]
            }
        })

        await logActivity({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase: supabase as any,
            companyId: profile.company_id,
            actorUserId: user.id,
            eventType: 'INVITATION_SENT',
            title: 'Ekip Daveti Gönderildi',
            summary: `${email} isimli kullanıcı ${role} yetkisiyle ekibe davet edildi.`,
            entityType: 'invitation',
            entityId: insertedInvite?.id,
            severity: 'info',
            metadata: {
                email: email,
                role: role
            }
        })

        return NextResponse.json({ token: rawToken })

    } catch (error: any) {
        console.error('Invite create error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
