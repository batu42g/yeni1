import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { headers } from 'next/headers'

export async function POST(req: Request) {
    try {
        const { email, success, errorMessage } = await req.json()
        const supabase = await createClient()

        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || null
        const userAgent = headersList.get('user-agent') || null

        if (success) {
            // LOGIN_SUCCESS — global user event
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return NextResponse.json({ ok: true })

            await logAudit({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabase: supabase as any,
                companyId: null,
                actorUserId: user.id,
                action: 'LOGIN_SUCCESS',
                targetType: 'auth',
                targetId: user.id,
                ip,
                userAgent,
                metadata: {
                    context: {
                        email: user.email,
                        method: 'password'
                    }
                }
            })
        } else {
            // LOGIN_FAILED — global user event
            // Try to find user by email to link to their user_id
            const { data: userByEmail } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle()

            await logAudit({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabase: supabase as any,
                companyId: null,
                actorUserId: userByEmail?.id || null,
                action: 'LOGIN_FAILED',
                targetType: 'auth',
                severity: 'warning',
                ip,
                userAgent,
                metadata: {
                    context: {
                        email,
                        reason: errorMessage || 'invalid_credentials'
                    }
                }
            })
        }

        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('Auth audit error:', e)
        return NextResponse.json({ ok: true }) // Don't fail the login flow
    }
}
