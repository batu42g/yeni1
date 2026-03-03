import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { step } = body

        if (!step) {
            return NextResponse.json({ error: 'Step is required' }, { status: 400 })
        }

        // Get current onboarding state
        const { data: onboarding } = await supabase
            .from('user_onboarding')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (!onboarding) {
            return NextResponse.json({ error: 'Onboarding record not found' }, { status: 404 })
        }

        // Define valid steps sequence loosely or handle explicitly
        // If step is FINISHED, mark is_completed
        const isFinished = step === 'FINISHED'

        const updateData: any = {
            current_step: step,
            updated_at: new Date().toISOString()
        }

        if (isFinished) {
            updateData.is_completed = true
            updateData.completed_at = new Date().toISOString()
        }

        const { error: updateError } = await supabase
            .from('user_onboarding')
            .update(updateData)
            .eq('user_id', user.id)

        if (updateError) {
            console.error('Update onboarding error:', updateError)
            return NextResponse.json({ error: 'Failed to update onboarding state' }, { status: 500 })
        }

        // Make sure user context is ensured if we have a company related step
        const { data: profile } = await supabase.rpc('ensure_user_context').maybeSingle()

        // Audit log
        await logAudit({
            supabase: supabase as any,
            companyId: profile?.company_id || '00000000-0000-0000-0000-000000000000',
            actorUserId: user.id,
            action: 'USER_ONBOARDING_UPDATED',
            targetType: 'member',
            targetId: user.id,
            metadata: {
                context: {
                    user_id: user.id,
                    step
                },
                changes: [
                    { field: 'current_step', old: onboarding.current_step, new: step }
                ]
            }
        })

        return NextResponse.json({ success: true, step, is_completed: isFinished })

    } catch (e) {
        console.error('Complete step API error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
