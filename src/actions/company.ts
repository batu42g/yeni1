'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit, logActivity } from '@/lib/audit'
import { logPermissionDenied } from '@/lib/permission-audit'

export async function updateCompany(companyId: string, data: { name?: string; logo_url?: string | null }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Oturum açılmadı')

    // Yetki kontrolü (Admin veya Owner)
    const { data: currentUserData } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

    if (!currentUserData || currentUserData.company_id !== companyId || (currentUserData.role !== 'admin' && currentUserData.role !== 'owner')) {
        await logPermissionDenied({ endpoint: 'actions/updateCompany', targetType: 'company', targetId: companyId, requiredRole: 'admin', reason: 'NOT_ADMIN' })
        throw new Error('Yetkiniz yok. Sadece yöneticiler şirket ayarlarını güncelleyebilir.')
    }

    // 1. Mevcut veriyi al (Audit için)
    const { data: oldCompany } = await supabase.from('companies').select('name, logo_url').eq('id', companyId).single()

    // 2. Güncelle
    const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', companyId)

    if (error) throw new Error('Şirket güncellenemedi: ' + error.message)

    // Diff hesapla
    const changes: any[] = []
    if (oldCompany) {
        if (data.name !== undefined && oldCompany.name !== data.name) {
            changes.push({ field: 'name', old: oldCompany.name, new: data.name })
        }
        if (data.logo_url !== undefined && oldCompany.logo_url !== data.logo_url) {
            changes.push({ field: 'logo_url', old: oldCompany.logo_url, new: data.logo_url })
        }
    }

    if (changes.length > 0) {
        await logAudit({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase: supabase as any,
            companyId,
            actorUserId: user.id,
            action: 'COMPANY_SETTINGS_UPDATED',
            targetType: 'company',
            targetId: companyId,
            metadata: {
                context: {
                    name: oldCompany?.name || data.name
                },
                changes
            }
        })

        const changedFields = changes.map(c => c.field === 'name' ? 'Şirket adı' : c.field === 'logo_url' ? 'Logo' : c.field).join(', ')

        await logActivity({
            supabase: supabase as any,
            companyId,
            actorUserId: user.id,
            eventType: 'COMPANY_SETTINGS_UPDATED',
            title: 'Şirket Ayarları Güncellendi',
            summary: `Değişen: ${changedFields}`,
            entityType: 'company',
            entityId: companyId,
            severity: 'info'
        })
    }

    revalidatePath('/settings')
    // Navbar logosunu güncellemek için layout'u revalidate etmek gerekebilir ama client side fetch daha iyi.
}
