import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditLogParams {
    supabase: SupabaseClient
    companyId?: string | null
    actorUserId?: string | null
    actorMembershipId?: string | null
    actorRole?: string | null
    action: string
    targetType: string
    targetId?: string | null
    ip?: string | null
    userAgent?: string | null
    requestId?: string | null
    severity?: 'info' | 'warning' | 'critical'
    metadata?: Record<string, unknown> | null
}

const SUSPICIOUS_ACTIONS = new Set(['LOGIN_FAILED', 'EXPORT_DOWNLOADED', 'ROLE_CHANGED', 'PERMISSION_DENIED'])

export function generateRequestId(): string {
    return crypto.randomUUID()
}

export async function logAudit({
    supabase,
    companyId,
    actorUserId,
    actorMembershipId,
    actorRole,
    action,
    targetType,
    targetId,
    ip,
    userAgent,
    requestId,
    severity,
    metadata,
}: AuditLogParams) {
    const safeMetadata = sanitizeAuditMetadata(action, metadata)

    // Auto-detect severity for suspicious actions via DB function
    let finalSeverity = severity || 'info'
    if (!severity && SUSPICIOUS_ACTIONS.has(action) && actorUserId) {
        try {
            const { data: dbSeverity } = await (supabase as any).rpc('fn_check_suspicious_activity', {
                p_company_id: companyId,
                p_action: action,
                p_actor_user_id: actorUserId
            })
            if (dbSeverity && dbSeverity !== 'info') {
                finalSeverity = dbSeverity
            }
        } catch {
            // If RPC fails, use default severity
        }
    }

    const { error } = await (supabase as any).from('audit_logs').insert({
        company_id: companyId ?? null,
        actor_user_id: actorUserId ?? null,
        actor_membership_id: actorMembershipId ?? null,
        actor_role: actorRole ?? null,
        action: action,
        target_type: targetType,
        target_id: targetId ?? null,
        ip: ip ?? null,
        user_agent: userAgent ?? null,
        request_id: requestId ?? null,
        severity: finalSeverity,
        metadata: safeMetadata ?? {},
    })

    if (error) {
        console.error('Audit log write error:', error)
    }
}

export interface ActivityEventParams {
    supabase: SupabaseClient
    companyId: string
    actorUserId?: string | null
    eventType: string
    title: string
    summary?: string | null
    entityType?: string | null
    entityId?: string | null
    severity?: 'info' | 'warning' | 'critical'
    metadata?: Record<string, unknown> | null
}

export async function logActivity({
    supabase,
    companyId,
    actorUserId,
    eventType,
    title,
    summary,
    entityType,
    entityId,
    severity = 'info',
    metadata,
}: ActivityEventParams) {
    const safeMetadata = sanitizeAuditMetadata(eventType, metadata)

    const { error } = await (supabase as any).from('activity_events').insert({
        company_id: companyId,
        actor_user_id: actorUserId ?? null,
        event_type: eventType,
        title: title,
        summary: summary ?? null,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        severity: severity,
        metadata: safeMetadata ?? {},
    })

    if (error) {
        console.error('Activity event write error:', error)
    }
}

export function getActionIcon(action: string): string {
    if (action.includes('CREATE')) return '➕'
    if (action.includes('UPDATE')) return '✏️'
    if (action.includes('DELETE') || action.includes('REMOVE')) return '🗑️'
    if (action.includes('RESTORE')) return '♻️'
    if (action.includes('ARCHIVE')) return '📦'
    if (action.includes('INVITE') || action.includes('JOIN')) return '👋'
    return '📋'
}

export function getActionColor(action: string): string {
    if (action.includes('CREATE') || action.includes('JOIN')) return 'var(--color-accent)'
    if (action.includes('UPDATE') || action.includes('SWITCH')) return '#00b8d4'
    if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('REJECT') || action.includes('REVOKE')) return 'var(--color-danger)'
    if (action.includes('RESTORE')) return 'var(--color-warn)'
    if (action.includes('ARCHIVE')) return 'var(--color-text-2)'
    return 'var(--color-text-2)'
}

export function sanitizeAuditMetadata(action: string, metadata: any): any {
    if (!metadata) return null;

    // Create a deep copy so we don't mutate original if passed by reference
    const sanitized = JSON.parse(JSON.stringify(metadata));

    // Recursive sanitizer function
    const sanitizeRecursive = (obj: any, insideChanges = false) => {
        if (!obj || typeof obj !== 'object') return obj;

        // If this is the changes array, sanitize each item lightly
        if (Array.isArray(obj)) {
            obj.forEach(item => sanitizeRecursive(item, insideChanges));
            return obj;
        }

        for (const key in obj) {
            // Skip denylist/masking inside changes items (old/new values are curated)
            if (!insideChanges) {
                // Denylist: exact match for field names
                const denyExact = new Set([
                    'token', 'token_hash', 'access_token', 'refresh_token',
                    'password', 'secret', 'api_key',
                    'user_agent', 'ip',
                    'created_at', 'updated_at', 'deleted_at', 'deleted_by',
                    'company_id', 'invited_by',
                    'accepted', 'accepted_at',
                    'revoked_at', 'revoked_by'
                ]);
                const lk = key.toLowerCase();
                if (denyExact.has(lk)) {
                    delete obj[key];
                    continue;
                }

                // Redact large text fields
                if (key === 'description' && typeof obj[key] === 'string' && obj[key].length > 50) {
                    obj[key] = '(redacted)';
                }

                // Mask email: g***@gmail.com
                if (key === 'email' && typeof obj[key] === 'string') {
                    const parts = obj[key].split('@');
                    if (parts.length === 2) {
                        const name = parts[0];
                        obj[key] = name.length > 1
                            ? `${name[0]}***@${parts[1]}`
                            : `***@${parts[1]}`;
                    }
                }

                // Mask IDs (uuid or number) only in context, not in changes
                if (key === 'id' || key.endsWith('_id')) {
                    const val = obj[key];
                    if (typeof val === 'string' && val.length > 8) {
                        obj[key] = `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
                    } else if (typeof val === 'number') {
                        obj[key] = `[MASKED_ID]`;
                    }
                }
            }

            // Recurse for nested objects
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeRecursive(obj[key], key === 'changes' || insideChanges);
            }
        }
        return obj;
    };

    return sanitizeRecursive(sanitized);
}
