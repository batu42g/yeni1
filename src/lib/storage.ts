import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'project-files'

/**
 * Dosya yükleme işlemi yapar ve veritabanına kaydeder.
 * Transaction benzeri bir akış izler, hata durumunda yüklenen dosyayı siler.
 */
export async function uploadProjectFile(
    file: File,
    projectId: string,
    companyId: string,
    userId: string
) {
    const supabase = createClient()

    // 1. Dosya adını güvenli hale getir
    const fileExt = file.name.split('.').pop()
    const uniqueId = crypto.randomUUID()
    // Dosya yolu: company_id/project_id/RANDOM-FILENAME.ext
    const filePath = `${companyId}/${projectId}/${uniqueId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // 2. Storage'a yükle
    const { data: storageData, error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            upsert: false,
            contentType: file.type
        })

    if (storageError) {
        console.error('Storage Upload Error:', storageError)
        throw new Error('Dosya sunucuya yüklenemedi.')
    }

    try {
        // 3. Veritabanına kaydet
        const { data: dbData, error: dbError } = await supabase
            .from('project_files')
            .insert({
                project_id: projectId,
                company_id: companyId,
                uploaded_by: userId,
                file_name: file.name,
                file_url: storageData.path, // Path saklıyoruz
                file_size: file.size,
                file_type: file.type
            })
            .select()
            .single()

        if (dbError) throw dbError

        return dbData
    } catch (dbError: any) {
        // Hata durumunda storage'dan temizle
        console.error('DB Insert Error:', dbError)
        await supabase.storage.from(BUCKET_NAME).remove([filePath])
        throw new Error('Dosya kaydı veritabanına eklenemedi: ' + dbError.message)
    }
}

/**
 * Dosyayı hem veritabanından hem de storage'dan siler.
 */
export async function deleteProjectFile(fileId: string, filePath: string) {
    const supabase = createClient()

    // 1. Önce Veritabanından Sil
    const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId)

    if (dbError) throw new Error('Dosya kaydı silinemedi.')

    // 2. Sonra Storage'dan Sil (burada hata olsa bile DB'den silindiği için kullanıcı görmez)
    const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])

    if (storageError) {
        console.warn('Dosya storage\'dan silinemedi (DB\'den silindi):', filePath)
    }
}

/**
 * Dosyaları proje ID'sine göre listeler ve signed URL'leri oluşturur.
 */
export async function getProjectFiles(projectId: string) {
    const supabase = createClient()

    // Veritabanından dosyaları çek
    const { data: files, error } = await supabase
        .from('project_files')
        .select(`
            *,
            users (full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

    if (error) throw error

    // Her dosya için Signed URL oluştur (paralel işlem)
    // Eğer bucket 'public' yapıldıysa getPublicUrl daha hızlıdır ama güvenlik için signed tercih ediyoruz.
    // Ancak çok dosya varsa yavaş olabilir. Şimdilik signed ile gidelim (1 saatlik geçerlilik).

    // NOT: Performance optimization - only sign on download click? 
    // UI'daki "indir" butonu tıklandığında sign etmek daha iyi olurdu ama önizleme (resimler) için URL lazım.

    const filesWithUrls = await Promise.all(
        files.map(async (file) => {
            const { data } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(file.file_url, 3600) // 1 saat

            return {
                ...file,
                signedUrl: data?.signedUrl || null
            }
        })
    )

    return filesWithUrls
}

export async function uploadPublicFile(file: File, folder: string = 'logos') {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file, {
            upsert: true
        })

    if (uploadError) {
        console.error('Upload Public File Error:', uploadError)
        // Check for bucket not found error to give better feedback
        if (uploadError.message.includes('Bucket not found') || (uploadError as any).error === 'Bucket not found') {
            throw new Error('Depolama alanı (Bucket) bulunamadı. Lütfen 005 nolu migration dosyasını çalıştırın.')
        }
        throw uploadError
    }

    const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath)

    return publicUrl
}
