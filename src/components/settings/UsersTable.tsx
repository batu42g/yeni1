'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Loader2, Trash2, User as UserIcon, Shield } from 'lucide-react'
import type { Database, UserRole } from '@/types/database'
import toast from 'react-hot-toast'

interface UserProfile {
    id: string
    full_name: string
    email: string
    role: UserRole
    avatar_url: string | null
    created_at: string
}

export function UsersTable({ companyId, sessionId, currentUserRole }: { companyId: string; sessionId: string; currentUserRole: UserRole }) {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingRole, setUpdatingRole] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            // Fetch members correctly using the members table (Matches Team Page Logic)
            const { data: memberData, error } = await supabase
                .from('members')
                .select(`
                    id,
                    role,
                    status,
                    user_id,
                    created_at,
                    users:users!members_user_id_fkey (
                        id,
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .eq('company_id', companyId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Transform data structure
            const formattedUsers = memberData.map((m: any) => ({
                id: m.users?.id || m.user_id,
                full_name: m.users?.full_name || 'Bilinmeyen Kullanıcı',
                email: m.users?.email,
                role: m.role,
                avatar_url: m.users?.avatar_url,
                created_at: m.created_at
            }))

            setUsers(formattedUsers)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('Kullanıcı listesi alınamadı')
        } finally {
            setLoading(false)
        }
    }

    const handleRoleUpdate = async (userId: string, currentRole: string, newRole: string) => {
        if (currentRole === newRole) return
        if (!confirm(`Kullanıcının rolünü ${newRole} olarak değiştirmek istediğinize emin misiniz?`)) return

        setUpdatingRole(userId)
        try {
            const { error } = await supabase.rpc('update_member_role', {
                target_user_id: userId,
                new_role: newRole
            })

            if (error) throw error
            toast.success('Rol güncellendi')
            fetchUsers()
        } catch (error: any) {
            toast.error(error.message || 'Rol güncellenemedi')
        } finally {
            setUpdatingRole(null)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" style={{ color: 'var(--color-text-3)' }} /></div>
    }

    return (
        <div className="grid gap-3">
            {users.map((user) => (
                <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm group"
                    style={{
                        backgroundColor: 'var(--color-surface-1)',
                        borderColor: 'var(--color-border)',
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold border overflow-hidden shrink-0"
                            style={{
                                backgroundColor: 'var(--color-surface-2)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text-2)'
                            }}
                        >
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{user.full_name?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-0)' }}>{user.full_name || 'İsimsiz Kullanıcı'}</h3>
                            <p className="text-xs" style={{ color: 'var(--color-text-3)' }}>{user.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex flex-col items-end gap-1">
                            {/* Role Selector or Badge */}
                            {(currentUserRole === 'owner' || (currentUserRole === 'admin' && user.role !== 'owner')) && user.id !== sessionId ? (
                                <select
                                    disabled={!!updatingRole}
                                    value={user.role}
                                    onChange={(e) => handleRoleUpdate(user.id, user.role, e.target.value)}
                                    className="text-xs border rounded-md py-1 px-2 outline-none cursor-pointer transition-colors"
                                    style={{
                                        backgroundColor: 'var(--color-surface-2)',
                                        borderColor: 'var(--color-border)',
                                        color: 'var(--color-text-1)'
                                    }}
                                >
                                    <option value="staff">Personel</option>
                                    <option value="admin">Yönetici</option>
                                </select>
                            ) : (
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${user.role === 'owner' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                    user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                        'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                    }`}>
                                    {user.role === 'owner' ? 'Sahip' : (user.role === 'admin' ? 'Yönetici' : 'Personel')}
                                </span>
                            )}
                            <span className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>
                                {new Date(user.created_at).toLocaleDateString('tr-TR')}
                            </span>
                        </div>

                        {/* Actions */}
                        {user.id !== sessionId && (currentUserRole === 'owner' || (currentUserRole === 'admin' && user.role !== 'owner')) && (
                            <button
                                onClick={async () => {
                                    if (!confirm('Bu kullanıcıyı şirketten çıkarmak istediğinize emin misiniz?')) return;
                                    const { error } = await supabase.rpc('remove_member', { target_user_id: user.id })
                                    if (error) toast.error(error.message)
                                    else {
                                        toast.success('Kullanıcı çıkarıldı')
                                        fetchUsers()
                                    }
                                }}
                                className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-gray-400 hover:text-red-500"
                                title="Kullanıcıyı Çıkar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
