export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type UserRole = 'admin' | 'staff' | 'owner'
export type CustomerStatus = 'lead' | 'active' | 'inactive'
export type ProjectStatus = 'pending' | 'in_progress' | 'completed'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type OfferStatus = 'pending' | 'approved' | 'rejected'
export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
export type EntityType = 'customer' | 'project' | 'task' | 'offer' | 'invitation' | 'company' | 'member'
export type MemberStatus = 'active' | 'inactive' | 'removed' | 'archived'
export type CompanyStatus = 'active' | 'inactive' | 'suspended'

export interface Database {
    public: {
        Tables: {
            companies: {
                Row: {
                    id: string
                    name: string
                    logo_url: string | null
                    created_at: string
                    status: CompanyStatus
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    logo_url?: string | null
                    created_at?: string
                    status?: CompanyStatus
                    deleted_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    logo_url?: string | null
                    created_at?: string
                    status?: CompanyStatus
                    deleted_at?: string | null
                }
                Relationships: []
            }
            users: {
                Row: {
                    id: string
                    company_id: string | null // Made nullable for multi-tenant support
                    role: UserRole
                    full_name: string
                    email: string | null
                    avatar_url: string | null
                    created_at: string
                    deleted_at: string | null
                    is_active: boolean
                    deletion_reason: string | null
                }
                Insert: {
                    id: string
                    company_id?: string | null
                    role?: UserRole
                    full_name: string
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    deleted_at?: string | null
                    is_active?: boolean
                    deletion_reason?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    role?: UserRole
                    full_name?: string
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    deleted_at?: string | null
                    is_active?: boolean
                    deletion_reason?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'users_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                ]
            }
            members: {
                Row: {
                    id: string
                    user_id: string
                    company_id: string
                    role: UserRole
                    status: MemberStatus
                    created_at: string
                    updated_at: string
                    removed_at: string | null
                    removed_by: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    company_id: string
                    role: UserRole
                    status?: MemberStatus
                    created_at?: string
                    updated_at?: string
                    removed_at?: string | null
                    removed_by?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    company_id?: string
                    role?: UserRole
                    status?: MemberStatus
                    created_at?: string
                    updated_at?: string
                    removed_at?: string | null
                    removed_by?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'members_user_id_fkey'
                        columns: ['user_id']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'members_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    }
                ]
            }
            customers: {
                Row: {
                    id: string
                    company_id: string
                    name: string
                    email: string
                    phone: string
                    status: CustomerStatus
                    created_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    company_id: string
                    name: string
                    email: string
                    phone: string
                    status?: CustomerStatus
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    name?: string
                    email?: string
                    phone?: string
                    status?: CustomerStatus
                    created_at?: string
                    deleted_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'customers_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                ]
            }
            projects: {
                Row: {
                    id: string
                    company_id: string
                    customer_id: string
                    title: string
                    description: string
                    status: ProjectStatus
                    budget: number
                    created_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    company_id: string
                    customer_id: string
                    title: string
                    description: string
                    status?: ProjectStatus
                    budget: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    customer_id?: string
                    title?: string
                    description?: string
                    status?: ProjectStatus
                    budget?: number
                    created_at?: string
                    deleted_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'projects_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'projects_customer_id_fkey'
                        columns: ['customer_id']
                        isOneToOne: false
                        referencedRelation: 'customers'
                        referencedColumns: ['id']
                    },
                ]
            }
            tasks: {
                Row: {
                    id: string
                    company_id: string
                    project_id: string
                    assigned_to: string
                    title: string
                    status: TaskStatus
                    due_date: string | null
                    created_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    company_id: string
                    project_id: string
                    assigned_to: string
                    title: string
                    status?: TaskStatus
                    due_date?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    project_id?: string
                    assigned_to?: string
                    title?: string
                    status?: TaskStatus
                    due_date?: string | null
                    created_at?: string
                    deleted_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'tasks_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'tasks_project_id_fkey'
                        columns: ['project_id']
                        isOneToOne: false
                        referencedRelation: 'projects'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'tasks_assigned_to_fkey'
                        columns: ['assigned_to']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                ]
            }
            offers: {
                Row: {
                    id: string
                    company_id: string
                    customer_id: string
                    amount: number
                    status: OfferStatus
                    created_at: string
                    deleted_at: string | null
                }
                Insert: {
                    id?: string
                    company_id: string
                    customer_id: string
                    amount: number
                    status?: OfferStatus
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    customer_id?: string
                    amount?: number
                    status?: OfferStatus
                    created_at?: string
                    deleted_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'offers_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'offers_customer_id_fkey'
                        columns: ['customer_id']
                        isOneToOne: false
                        referencedRelation: 'customers'
                        referencedColumns: ['id']
                    },
                ]
            }
            audit_logs: {
                Row: {
                    id: string
                    company_id: string
                    actor_user_id: string | null
                    actor_membership_id: string | null
                    actor_role: string | null
                    action: string
                    target_type: string
                    target_id: string | null
                    ip: string | null
                    user_agent: string | null
                    request_id: string | null
                    metadata: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    actor_user_id?: string | null
                    actor_membership_id?: string | null
                    actor_role?: string | null
                    action: string
                    target_type: string
                    target_id?: string | null
                    ip?: string | null
                    user_agent?: string | null
                    request_id?: string | null
                    metadata?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    actor_user_id?: string | null
                    actor_membership_id?: string | null
                    actor_role?: string | null
                    action?: string
                    target_type?: string
                    target_id?: string | null
                    ip?: string | null
                    user_agent?: string | null
                    request_id?: string | null
                    metadata?: Json
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'audit_logs_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'audit_logs_actor_user_id_fkey'
                        columns: ['actor_user_id']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                ]
            }
            activity_events: {
                Row: {
                    id: string
                    company_id: string
                    actor_user_id: string | null
                    event_type: string
                    title: string
                    summary: string | null
                    entity_type: string | null
                    entity_id: string | null
                    severity: string
                    metadata: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    actor_user_id?: string | null
                    event_type: string
                    title: string
                    summary?: string | null
                    entity_type?: string | null
                    entity_id?: string | null
                    severity?: string
                    metadata?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    actor_user_id?: string | null
                    event_type?: string
                    title?: string
                    summary?: string | null
                    entity_type?: string | null
                    entity_id?: string | null
                    severity?: string
                    metadata?: Json
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'activity_events_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'activity_events_actor_user_id_fkey'
                        columns: ['actor_user_id']
                        isOneToOne: false
                        referencedRelation: 'users'
                        referencedColumns: ['id']
                    },
                ]
            }
            invitations: {
                Row: {
                    id: string
                    company_id: string
                    email: string
                    role: UserRole
                    token_hash: string
                    invited_by: string
                    accepted: boolean
                    accepted_at: string | null
                    expires_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    email: string
                    role?: UserRole
                    token_hash: string
                    invited_by: string
                    accepted?: boolean
                    accepted_at?: string | null
                    expires_at?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    email?: string
                    role?: UserRole
                    token_hash?: string
                    invited_by?: string
                    accepted?: boolean
                    accepted_at?: string | null
                    expires_at?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'invitations_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                ]
            }
            project_files: {
                Row: {
                    id: string
                    project_id: string
                    company_id: string
                    file_name: string
                    file_url: string
                    file_size: number | null
                    file_type: string | null
                    uploaded_by: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    company_id: string
                    file_name: string
                    file_url: string
                    file_size?: number | null
                    file_type?: string | null
                    uploaded_by: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    company_id?: string
                    file_name?: string
                    file_url?: string
                    file_size?: number | null
                    file_type?: string | null
                    uploaded_by?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'project_files_project_id_fkey'
                        columns: ['project_id']
                        isOneToOne: false
                        referencedRelation: 'projects'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'project_files_company_id_fkey'
                        columns: ['company_id']
                        isOneToOne: false
                        referencedRelation: 'companies'
                        referencedColumns: ['id']
                    },
                ]
            }
            webhook_subscriptions: {
                Row: {
                    id: string
                    company_id: string
                    url: string
                    secret: string
                    events: string[] | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    url: string
                    secret: string
                    events?: string[] | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    url?: string
                    secret?: string
                    events?: string[] | null
                    is_active?: boolean
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "webhook_subscriptions_company_id_fkey"
                        columns: ["company_id"]
                        isOneToOne: false
                        referencedRelation: "companies"
                        referencedColumns: ["id"]
                    }
                ]
            }
            webhook_deliveries: {
                Row: {
                    id: string
                    subscription_id: string
                    event_type: string
                    payload: Json
                    status: string
                    response_code: number | null
                    response_body: string | null
                    attempt_count: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    subscription_id: string
                    event_type: string
                    payload: Json
                    status?: string
                    response_code?: number | null
                    response_body?: string | null
                    attempt_count?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    subscription_id?: string
                    event_type?: string
                    payload?: Json
                    status?: string
                    response_code?: number | null
                    response_body?: string | null
                    attempt_count?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "webhook_deliveries_subscription_id_fkey"
                        columns: ["subscription_id"]
                        isOneToOne: false
                        referencedRelation: "webhook_subscriptions"
                        referencedColumns: ["id"]
                    }
                ]
            }
            user_onboarding: {
                Row: {
                    user_id: string
                    is_completed: boolean
                    current_step: string
                    started_at: string
                    completed_at: string | null
                    metadata: Json | null
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    is_completed?: boolean
                    current_step?: string
                    started_at?: string
                    completed_at?: string | null
                    metadata?: Json | null
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    is_completed?: boolean
                    current_step?: string
                    started_at?: string
                    completed_at?: string | null
                    metadata?: Json | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_onboarding_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            get_my_company_id: {
                Args: Record<string, never>
                Returns: string
            }
            create_company: {
                Args: { company_name: string }
                Returns: string
            }
            remove_member: {
                Args: { target_user_id: string }
                Returns: void
            }
            is_admin: {
                Args: Record<string, never>
                Returns: boolean
            }
            get_invitation_by_token: {
                Args: { p_token: string }
                Returns: {
                    id: string
                    company_id: string
                    company_name: string
                    email: string
                    role: UserRole
                    invited_by: string
                    invited_by_name: string | null
                    expires_at: string
                    is_valid: boolean
                }[]
            }
            accept_invitation: {
                Args: {
                    p_token: string
                    p_user_id: string
                    p_full_name: string
                }
                Returns: void
            }
            handle_registration: {
                Args: {
                    p_user_id: string
                    p_company_name: string
                    p_full_name: string
                }
                Returns: void
            }
            revoke_invitation: {
                Args: { invite_id: string }
                Returns: void
            }
            resend_invitation: {
                Args: {
                    invite_id: string
                    new_token_hash: string
                    new_expiry: string
                }
                Returns: void
            }
            update_member_role: {
                Args: {
                    target_user_id: string
                    new_role: string
                }
                Returns: void
            }
            reject_invitation: {
                Args: { p_token: string }
                Returns: void
            }
            deactivate_user: {
                Args: { reason: string }
                Returns: void
            }
            hard_delete_user: {
                Args: Record<string, never>
                Returns: void
            }
            archive_company: {
                Args: { target_company_id: string }
                Returns: void
            }
            hard_delete_company: {
                Args: { target_company_id: string }
                Returns: void
            }
            ensure_user_context: {
                Args: Record<string, never>
                Returns: {
                    id: string
                    company_id: string | null
                    role: UserRole
                    full_name: string
                    avatar_url: string | null
                }[]
            }
            initialize_user_onboarding: {
                Args: { p_user_id: string }
                Returns: void
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}
