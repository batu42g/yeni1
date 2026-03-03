'use server'

import { coreInviteUser } from './invitations'

export async function inviteUsersBulk(prevState: any, formData: FormData) {
    const emailsRaw = formData.get('emails') as string
    const role = formData.get('role') as 'admin' | 'staff'

    if (!emailsRaw) return { error: 'E-posta listesi boş olamaz' }

    // Split by comma or newline, trim whitespace, filter empty
    const emails = emailsRaw.split(/[\n,]/).map(e => e.trim()).filter(e => e.length > 0)

    if (emails.length === 0) return { error: 'Geçerli e-posta bulunamadı' }

    if (emails.length > 20) return { error: 'Tek seferde en fazla 20 kişi davet edebilirsiniz.' }

    const results = []
    let successCount = 0
    let failureCount = 0

    // Process sequentially to avoid rate limits or overwhelming DB
    for (const email of emails) {
        try {
            const res = await coreInviteUser({ email, role })
            if (res.error) {
                results.push({ email, status: 'error', message: res.error })
                failureCount++
            } else {
                results.push({ email, status: 'success' })
                successCount++
            }
        } catch (error: any) {
            results.push({ email, status: 'error', message: error.message || 'Bilinmeyen hata' })
            failureCount++
        }
    }

    return {
        success: failureCount === 0,
        message: `${successCount} başarılı, ${failureCount} başarısız işlem.`,
        details: results
    }
}
