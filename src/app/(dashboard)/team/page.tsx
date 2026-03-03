'use client'

import { useState, useEffect, memo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import toast from 'react-hot-toast'
import { UserPlus, User as UserIcon, Trash2, Mail, Clock, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Subcomponents to prevent re-renders on the whole list
const MemberRow = memo(({ member, currentUser, onRemove }: any) => {
    return (
        <div className="p-4 flex items-center justify-between border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${member.role === 'admin' ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                    {member.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-medium text-white">{member.full_name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-0.5 rounded-full border ${member.role === 'admin'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                    {member.role === 'admin' ? 'Yönetici' : 'Personel'}
                </span>
                {member.id !== currentUser?.id && currentUser?.role === 'admin' && (
                    <button
                        onClick={() => onRemove(member.id)}
                        className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                        title="Şirketten Çıkar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    )
})
MemberRow.displayName = 'MemberRow'

const InviteRow = memo(({ invite, onCancel }: any) => {
    return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl relative group">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Mail className="w-4 h-4 text-amber-500" />
                </div>
                <button
                    onClick={() => onCancel(invite.id)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <p className="font-medium text-white truncate" title={invite.email}>{invite.email}</p>
            <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                    {invite.role === 'admin' ? <Crown className="w-3 h-3 text-indigo-400" /> : <UserIcon className="w-3 h-3" />}
                    {invite.role}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    48s geçerli
                </span>
            </div>
        </div>
    )
})
InviteRow.displayName = 'InviteRow'


export default function TeamPage() {
    const { user } = useAuthStore()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [members, setMembers] = useState<any[]>([])
    const [invitations, setInvitations] = useState<any[]>([])

    // Modal state
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff')
    const [inviting, setInviting] = useState(false)

    useEffect(() => {
        if (!user) return
        if (user.role !== 'admin') {
            router.push('/dashboard')
            return
        }
        fetchTeamData(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    const fetchTeamData = async (initial = false) => {
        if (!initial) setRefreshing(true)

        const supabase = createClient()
        try {
            // Fetch members correctly using the members table (Multi-Tenant Fix)
            const { data: memberData, error: memberError } = await supabase
                .from('members')
                .select(`
                    id,
                    role,
                    status,
                    user_id,
                    users:users!members_user_id_fkey (
                        id,
                        full_name,
                        email,
                        avatar_url
                    )
                `)
                .eq('company_id', user?.active_company_id || '')
                .eq('status', 'active') // Only active members

            if (memberError) throw memberError

            const formattedMembers = memberData.map((m: any) => ({
                id: m.users?.id, // Use user_id as key for UI consistency
                member_id: m.id, // Keep member record id for actions like remove
                full_name: m.users?.full_name || 'Bilinmeyen Kullanıcı',
                email: m.users?.email,
                role: m.role,
                avatar_url: m.users?.avatar_url
            }))

            const { data: inviteData, error: inviteError } = await supabase
                .from('invitations')
                .select('id, email, role, status, expires_at, created_at, accepted') // OPTIMIZATION: Removed select('*')
                .eq('company_id', user?.active_company_id || '')
                .eq('accepted', false)
                .neq('status', 'revoked')
                .neq('status', 'rejected')
                .order('created_at', { ascending: false })

            if (inviteError) throw inviteError

            setMembers(formattedMembers || [])
            setInvitations(inviteData || [])
        } catch (error: any) {
            console.error('Fetch error:', error)
            toast.error('Ekip verileri yüklenemedi')
        } finally {
            if (initial) setLoading(false)
            setRefreshing(false)
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setInviting(true)

        try {
            const response = await fetch('/api/invite/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole,
                }),
            })

            const responseData = await response.json()

            if (!response.ok) throw new Error(responseData.error || 'Davet edilemedi')

            toast.success('Davetiye oluşturuldu!')

            // OPTIMIZATION: Incremental patch for UI speed (before sync)
            setInvitations(prev => [{
                id: responseData.id || Date.now().toString(),
                email: inviteEmail,
                role: inviteRole,
                status: 'pending',
                created_at: new Date().toISOString()
            }, ...prev])

            setShowInviteModal(false)
            setInviteEmail('')

            const link = `${window.location.origin}/accept-invite?token=${responseData.token}`
            navigator.clipboard.writeText(link)
            toast('Davet linki kopyalandı 📋', { icon: '🔗' })

            // Sync with DB
            fetchTeamData(false)
        } catch (error: any) {
            console.error('Invite error:', error)
            toast.error(error.message || 'Davet edilemedi')
        } finally {
            setInviting(false)
        }
    }

    const handleRemoveMember = useCallback(async (userId: string) => {
        if (!confirm('Bu üyeyi şirketten çıkarmak istediğinize emin misiniz?')) return

        try {
            // OPTIMIZATION: Optimistic clean UP
            setMembers(prev => prev.filter(m => m.id !== userId))

            const response = await fetch('/api/members/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            })

            if (!response.ok) throw new Error('Silme işlemi başarısız')

            toast.success('Üye başarıyla çıkarıldı')
            fetchTeamData(false)
        } catch (error) {
            console.error('Remove error:', error)
            toast.error('Üye çıkarılamadı')
            fetchTeamData(false) // Restore
        }
    }, [])

    const handleCancelInvite = useCallback(async (id: string) => {
        if (!confirm('Davetiyeyi iptal etmek istediğinize emin misiniz?')) return
        try {
            // OPTIMIZATION: Optimistic clean UP
            setInvitations(prev => prev.filter(inv => inv.id !== id))

            const { cancelInvitation } = await import('@/actions/invitations')
            await cancelInvitation(id)
            toast.success('Davetiye iptal edildi')
            fetchTeamData(false)
        } catch (error: any) {
            console.error('Cancel invite error:', error)
            toast.error(error.message || 'Davetiye iptal edilemedi')
            fetchTeamData(false) // Restore
        }
    }, [])


    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
        </div>
    )

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20 relative">
            {refreshing && (
                <div className="absolute top-0 right-0 p-2 text-indigo-400 bg-indigo-500/10 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-5 h-5 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-0)' }}>Ekip Yönetimi</h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--color-text-3)' }}>
                        Şirketinizdeki kullanıcıları yönetin ve yeni üyeler davet edin.
                    </p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn-primary px-4 py-2 flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Üye Davet Et
                </button>
            </div>

            {/* Team Members */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                    <UserIcon className="w-5 h-5 text-indigo-500" />
                    Ekip Üyeleri ({members.length})
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    {members.map((member) => (
                        <MemberRow key={member.id} member={member} currentUser={user} onRemove={handleRemoveMember} />
                    ))}
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text-0)' }}>
                        <Mail className="w-5 h-5 text-amber-500" />
                        Bekleyen Davetler ({invitations.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {invitations.map((invite) => (
                            <InviteRow key={invite.id} invite={invite} onCancel={handleCancelInvite} />
                        ))}
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#1a1b26] border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl scale-100" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">Yeni Üye Davet Et</h2>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">E-posta Adresi</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                                    placeholder="ornek@sirket.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Rol</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('staff')}
                                        className={`p-3 rounded-lg border text-left transition-all ${inviteRole === 'staff' ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' : 'bg-black/20 border-gray-700 hover:border-gray-600'}`}
                                    >
                                        <span className="block text-sm font-bold text-white mb-0.5">Personel</span>
                                        <span className="block text-xs text-gray-400">Standart erişim</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('admin')}
                                        className={`p-3 rounded-lg border text-left transition-all ${inviteRole === 'admin' ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' : 'bg-black/20 border-gray-700 hover:border-gray-600'}`}
                                    >
                                        <span className="block text-sm font-bold text-white mb-0.5">Yönetici</span>
                                        <span className="block text-xs text-gray-400">Tam erişim</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                                >
                                    {inviting ? 'Davet Ediliyor...' : 'Davet Et'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
