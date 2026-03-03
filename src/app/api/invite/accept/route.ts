import { createAdminClient } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/auth-utils'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { token, password, fullName } = body

        if (!token || !password || !fullName) {
            return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 })
        }

        const hashedToken = token // Removed hashing
        const supabase = createAdminClient()

        // 1. Validate Invitation
        const { data: invite, error: inviteError } = await supabase
            .from('invitations')
            .select('*')
            .eq('token_hash', hashedToken)
            .single()

        if (inviteError || !invite) {
            return NextResponse.json({ success: false, message: 'Invalid or expired invitation' }, { status: 404 })
        }

        if (invite.accepted) {
            return NextResponse.json({ success: false, message: 'Invitation already accepted' }, { status: 400 })
        }

        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ success: false, message: 'Invitation expired' }, { status: 400 })
        }

        // 2. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: invite.email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        })

        if (authError) {
            console.error('Auth create error:', authError)
            return NextResponse.json({ success: false, message: authError.message || 'Failed to create user' }, { status: 400 })
        }

        // 3. Create Public User Profile
        // We use admin client to bypass RLS and ensure company_id is set correctly
        const { error: profileError } = await supabase
            .from('users')
            .upsert({
                id: authData.user.id,
                company_id: invite.company_id,
                email: invite.email,
                full_name: fullName,
                role: invite.role,
            })

        if (profileError) {
            console.error('Profile create error:', profileError)
            // Rollback auth user? ideally yes, but for now we error.
            return NextResponse.json({ success: false, message: 'Failed to create profile' }, { status: 500 })
        }

        // 4. Mark Invitation as Accepted
        await supabase
            .from('invitations')
            .update({ accepted: true })
            .eq('id', invite.id)

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Accept error:', error)
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
    }
}
