'use client'

import { ReactNode } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission, Permission } from '@/lib/permissions'

interface PermissionGateProps {
    permission: Permission
    children: ReactNode
    fallback?: ReactNode
}

/**
 * Renders children only if the current user has the specified permission.
 * Optionally renders a fallback if the user lacks the permission.
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
    const { user } = useAuthStore()

    if (!hasPermission(user?.role, permission)) {
        return <>{fallback}</>
    }

    return <>{children}</>
}
