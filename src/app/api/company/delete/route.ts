import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logPermissionDenied } from '@/lib/permission-audit'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // 1. Authenticate Request
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { companyId } = body

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
        }

        // 2. Verify Requester is Owner of the Company
        const { data: member } = await supabase
            .from('members')
            .select('role')
            .eq('user_id', user.id)
            .eq('company_id', companyId)
            .single()

        if (!member || member.role !== 'owner') {
            await logPermissionDenied({ endpoint: '/api/company/delete', targetType: 'company', targetId: companyId, requiredRole: 'owner', reason: 'NOT_OWNER' })
            return NextResponse.json({ error: 'Only company owners can delete the company' }, { status: 403 })
        }

        // 3. Perform Soft Delete on Company
        const { error: deleteError } = await supabase
            .from('companies')
            .update({
                status: 'inactive', // or 'suspended' based on business logic
                deleted_at: new Date().toISOString()
            })
            .eq('id', companyId)

        if (deleteError) {
            console.error('Company deletion failed:', deleteError)
            return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
        }

        // Log the action
        await supabase.from('audit_logs').insert({
            company_id: companyId,
            actor_user_id: user.id,
            action: 'COMPANY_DELETED',
            target_type: 'company',
            target_id: companyId,
            metadata: {
                context: {},
                changes: [
                    { field: 'status', old: 'active', new: 'deleted' }
                ]
            }
        })

        // 4. Ideally, we should also soft-delete all members or mark them as inactive
        // But for now, marking the company as inactive effectively disables access if RLS checks for company status.
        // Let's mark all members as 'archived' as a second step.
        const { error: membersError } = await supabase
            .from('members')
            .update({ status: 'archived' })
            .eq('company_id', companyId)

        if (membersError) {
            console.error('Failed to archive members:', membersError)
            // Non-critical, company is already inactive
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Delete company error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
