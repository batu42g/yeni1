'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase/client'
import { uploadProjectFile, deleteProjectFile } from '@/lib/storage'
import { FileIcon, Trash2, Download, UploadCloud, Loader2, Image as ImageIcon, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Database } from '@/types/database'

type ProjectFile = Database['public']['Tables']['project_files']['Row'] & {
    users: { full_name: string; avatar_url: string | null } | null
    signedUrl: string | null
}

interface ProjectFilesProps {
    projectId: string
    userId: string
    companyId: string
}

export function ProjectFiles({ projectId, userId, companyId }: ProjectFilesProps) {
    const [files, setFiles] = useState<ProjectFile[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const { user } = useAuthStore()

    const fetchFiles = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()

        const { data: fileData, error } = await supabase
            .from('project_files')
            .select(`
                *,
                users (full_name, avatar_url)
            `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch error:', error)
            toast.error('Dosyalar yüklenemedi')
            setLoading(false)
            return
        }

        const filesWithUrls = await Promise.all(
            (fileData as any[]).map(async (file) => {
                const { data } = await supabase.storage
                    .from('project-files')
                    .createSignedUrl(file.file_url, 3600)

                return {
                    ...file,
                    signedUrl: data?.signedUrl || null
                }
            })
        )

        setFiles(filesWithUrls)
        setLoading(false)
    }, [projectId])

    useEffect(() => {
        fetchFiles()
    }, [fetchFiles])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement> | FileList) => {
        const fileList = e instanceof FileList ? e : e.target.files
        if (!fileList || fileList.length === 0) return

        setUploading(true)
        const file = fileList[0]

        if (file.size > 50 * 1024 * 1024) {
            toast.error('Dosya boyutu 50MB\'dan büyük olamaz')
            setUploading(false)
            return
        }

        try {
            await uploadProjectFile(file, projectId, companyId, userId)
            toast.success('Dosya yüklendi')
            fetchFiles()
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Yükleme başarısız')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (fileId: string, filePath: string) => {
        if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return

        const notification = toast.loading('Siliniyor...')
        try {
            await deleteProjectFile(fileId, filePath)
            toast.success('Dosya silindi', { id: notification })
            setFiles(prev => prev.filter(f => f.id !== fileId))
        } catch (error: any) {
            toast.error('Silinemedi: ' + error.message, { id: notification })
        }
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-400" />
        if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />
        return <FileIcon className="w-5 h-5 text-blue-400" />
    }

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }
    const onDragLeave = () => setIsDragging(false)
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files) {
            handleUpload(e.dataTransfer.files)
        }
    }

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center ${isDragging
                    ? 'bg-indigo-500/10'
                    : ''
                    }`}
                style={{
                    backgroundColor: isDragging ? 'var(--color-accent-glow)' : 'var(--color-surface-2)',
                    borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
                }}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleUpload}
                    disabled={uploading}
                />
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--color-accent-glow)' }}>
                        {uploading ? (
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
                        ) : (
                            <UploadCloud className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-0)' }}>
                            {uploading ? 'Yükleniyor...' : 'Dosyayı buraya sürükleyin veya tıklayın'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
                            Maksimum 50MB (PDF, PNG, JPG, DOCX)
                        </p>
                    </div>
                </div>
            </div>

            {/* File List */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                        <FileText className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                        Proje Dosyaları
                        <span className="text-xs px-2 py-0.5 rounded-full ml-2" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)' }}>
                            {files.length}
                        </span>
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center" style={{ color: 'var(--color-text-3)' }}>
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        Yükleniyor...
                    </div>
                ) : files.length === 0 ? (
                    <div className="p-12 text-center" style={{ color: 'var(--color-text-3)' }}>
                        <FileIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Henüz dosya yüklenmemiş.</p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {files.map((file) => (
                            <div key={file.id} className="p-4 flex items-center justify-between group transition-colors"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--color-surface-2)' }}>
                                        {getFileIcon(file.file_type || '')}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate max-w-[200px] sm:max-w-md" title={file.file_name} style={{ color: 'var(--color-text-0)' }}>
                                            {file.file_name}
                                        </p>
                                        <p className="text-xs flex items-center gap-2" style={{ color: 'var(--color-text-3)' }}>
                                            <span>{formatBytes(file.file_size || 0)}</span>
                                            <span>•</span>
                                            <span>{new Date(file.created_at || '').toLocaleDateString('tr-TR')}</span>
                                            <span>•</span>
                                            <span>{file.users?.full_name || 'Bilinmeyen'}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {file.signedUrl && (
                                        <a
                                            href={file.signedUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg transition-colors"
                                            title="İndir / Görüntüle"
                                            download
                                            style={{ color: 'var(--color-text-2)' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-0)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-2)'; }}
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    )}
                                    {(user?.id === file.uploaded_by || user?.role === 'admin') && (
                                        <button
                                            onClick={() => handleDelete(file.id, file.file_url)}
                                            className="p-2 rounded-lg transition-colors"
                                            title="Sil"
                                            style={{ color: 'var(--color-text-2)' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 56, 96, 0.1)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-2)'; }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
