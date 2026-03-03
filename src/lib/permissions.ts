import { createClient } from '@/lib/supabase/client'

export type Permission =
    | 'customers:create'
    | 'customers:read'
    | 'customers:update'
    | 'customers:delete'
    | 'projects:create'
    | 'projects:read'
    | 'projects:update'
    | 'projects:delete'
    | 'tasks:create'
    | 'tasks:read'
    | 'tasks:update'
    | 'tasks:delete'
    | 'offers:create'
    | 'offers:read'
    | 'offers:update'
    | 'offers:delete'
    | 'offers:approve'
    | 'settings:manage'
    | 'users:invite'
    | 'users:manage'
    | 'export:data'
    | 'trash:manage'

// Admin has all permissions. Staff has limited permissions.
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: [
        'customers:create', 'customers:read', 'customers:update', 'customers:delete',
        'projects:create', 'projects:read', 'projects:update', 'projects:delete',
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete',
        'offers:create', 'offers:read', 'offers:update', 'offers:delete', 'offers:approve',
        'settings:manage',
        'users:invite', 'users:manage',
        'export:data',
        'trash:manage',
    ],
    staff: [
        'customers:read',
        'projects:read',
        'tasks:create', 'tasks:read', 'tasks:update',
        'offers:create', 'offers:read', 'offers:update',
    ],
}

/**
 * Check if a role has a given permission
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
    if (!role) return false
    const permissions = ROLE_PERMISSIONS[role]
    if (!permissions) return false
    return permissions.includes(permission)
}

/**
 * Check multiple permissions at once (returns true if ALL are granted)
 */
export function hasAllPermissions(role: string | undefined, permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(role, p))
}

/**
 * Check multiple permissions (returns true if ANY is granted)
 */
export function hasAnyPermission(role: string | undefined, permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: string | undefined): Permission[] {
    if (!role) return []
    return ROLE_PERMISSIONS[role] || []
}
