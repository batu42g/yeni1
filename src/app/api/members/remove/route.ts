import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Authenticate Request
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // 2. Prevent self-removal
        if (userId === user.id) {
            return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
        }

        // 3. Call Secure RPC Function
        // This function handles all RBAC checks, Soft Deletion, and Context Cleanup in a single transaction.
        const { error } = await supabase.rpc('remove_member', { target_user_id: userId })

        if (error) {
            console.error('Member removal RPC failed:', error)
            // Handle RPC specific errors (custom messages from SQL function)
            // Error code 3xxx, 2xxx usually custom exceptions, but message is most useful
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Remove member error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
