'use server'

import { createClient } from '@/lib/supabase/server'

export async function exportCompanyData() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açmanız gerekiyor')

    const { data: profile } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        throw new Error('Sadece yöneticiler veri dışa aktarabilir')
    }

    const companyId = profile.company_id

    // Fetch all data in parallel
    const [
        { data: company },
        { data: customers },
        { data: projects },
        { data: tasks },
        { data: offers },
        { data: users },
    ] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId as string).single(),
        supabase.from('customers').select('*').eq('company_id', companyId as string),
        supabase.from('projects').select('*').eq('company_id', companyId as string),
        supabase.from('tasks').select('*').eq('company_id', companyId as string),
        supabase.from('offers').select('*').eq('company_id', companyId as string),
        supabase.from('users').select('id, full_name, role, created_at').eq('company_id', companyId as string),
    ])

    const exportData = {
        exported_at: new Date().toISOString(),
        company,
        users: users || [],
        customers: customers || [],
        projects: projects || [],
        tasks: tasks || [],
        offers: offers || [],
        stats: {
            total_customers: customers?.length || 0,
            total_projects: projects?.length || 0,
            total_tasks: tasks?.length || 0,
            total_offers: offers?.length || 0,
            total_users: users?.length || 0,
        }
    }

    return exportData
}
