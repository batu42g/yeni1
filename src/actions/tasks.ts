'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/audit'
import type { TaskStatus } from '@/types/database'

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus, projectId: string) {
    const supabase = await createClient()

    // 1. Mevcut görevi çek
    const { data: oldTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

    if (fetchError || !oldTask) {
        throw new Error('Görev bulunamadı')
    }

    // 2. Durumu güncelle
    const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

    if (updateError) {
        throw new Error('Görev durumu güncellenemedi')
    }

    // 3. Audit Log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        // Only log Activity for operational actions
        if (newStatus === 'done') {
            await logActivity({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                supabase: supabase as any,
                companyId: oldTask.company_id,
                actorUserId: user.id,
                eventType: 'TASK_COMPLETED',
                title: 'Görev Tamamlandı',
                summary: `'${oldTask.title}' isimli görev tamamlandı.`,
                entityType: 'task',
                entityId: taskId,
                severity: 'info'
            })
        }
    }

    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/tasks')
}

export async function createTask(projectId: string, title: string, status: TaskStatus, assignedTo: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Oturum açılmadı')

    // Get user company_id
    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!profile || !profile.company_id) throw new Error('Kullanıcı bir şirkete bağlı değil')

    const { data: newTask, error } = await supabase.from('tasks').insert({
        title,
        status,
        project_id: projectId,
        assigned_to: assignedTo,
        company_id: profile.company_id
    }).select().single()

    if (error) throw new Error(error.message)

    // Only log Activity for operational actions
    await logActivity({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: supabase as any,
        companyId: profile.company_id,
        actorUserId: user.id,
        eventType: 'TASK_CREATED',
        title: 'Yeni Görev Eklendi',
        summary: `'${title}' isimli yeni bir görev oluşturuldu.`,
        entityType: 'task',
        entityId: newTask.id,
        severity: 'info'
    })

    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/tasks')
    return newTask
}
