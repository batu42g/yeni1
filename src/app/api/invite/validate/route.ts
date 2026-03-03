import { createAdminClient } from '@/lib/supabase/admin'
import { hashToken } from '@/lib/auth-utils'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { token } = await request.json()

        if (!token) {
            return NextResponse.json({ valid: false, message: 'Invalid token' }, { status: 400 })
        }

        const hashedToken = token // Removed hashing to match DB
        const supabase = createAdminClient()

        // 1. Find invitation
        const { data: invite, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('token_hash', hashedToken)
            .single()

        if (error || !invite) {
            return NextResponse.json({ valid: false, message: 'Invite not found' }, { status: 404 })
        }

        // 2. Check Expiry
        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ valid: false, message: 'Invite expired' }, { status: 400 })
        }

        if (invite.accepted) {
            return NextResponse.json({ valid: false, message: 'Invite already accepted' }, { status: 400 })
        }

        // 3. Get Details (Company, Inviter)
        const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', invite.company_id)
            .single()

        const { data: inviter } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', invite.invited_by)
            .single()

        return NextResponse.json({
            valid: true,
            email: invite.email,
            company_name: company?.name || 'Unknown Company',
            inviter_name: inviter?.full_name || 'Admin',
            role: invite.role,
        })

    } catch (error) {
        console.error('Validate error:', error)
        return NextResponse.json({ valid: false, message: 'Validation failed' }, { status: 500 })
    }
}
