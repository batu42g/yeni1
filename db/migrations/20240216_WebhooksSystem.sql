-- Webhook Subscriptions: Where to send events
create table if not exists webhook_subscriptions (
    id uuid default gen_random_uuid() primary key,
    company_id uuid references companies(id) on delete cascade not null,
    url text not null,
    secret text not null, -- For signature verification
    events text[] default null, -- null means all events
    is_active boolean default true,
    created_at timestamptz default now()
);

-- Webhook Delivery Logs
create table if not exists webhook_deliveries (
    id uuid default gen_random_uuid() primary key,
    subscription_id uuid references webhook_subscriptions(id) on delete cascade,
    event_type text not null,
    payload jsonb not null,
    status text default 'pending', -- pending, success, failed
    response_code int,
    response_body text,
    attempt_count int default 0,
    created_at timestamptz default now()
);

-- RLS
alter table webhook_subscriptions enable row level security;
alter table webhook_deliveries enable row level security;

create policy "Admins can manage webhooks" on webhook_subscriptions
    for all using (
        exists (
            select 1 from members
            where user_id = auth.uid()
            and company_id = webhook_subscriptions.company_id
            and role in ('admin', 'owner')
        )
    );

create policy "Admins can view logs" on webhook_deliveries
    for select using (
        exists (
            select 1 from webhook_subscriptions
            where id = webhook_deliveries.subscription_id
            and exists (
                select 1 from members
                where user_id = auth.uid()
                and company_id = webhook_subscriptions.company_id
                and role in ('admin', 'owner')
            )
        )
    );

-- Trigger Function Setup (Optional, usually we dispatch from app logic for better control)
-- But for strict consistency, let's create a Helper RPC to log events

create or replace function dispatch_webhook_event(
    p_company_id uuid,
    p_event_type text,
    p_payload jsonb
) returns void
security definer
language plpgsql
as $$
begin
    -- Insert into deliveries directly?
    -- No, we need to find subscriptions first.
    -- Better to do this in Application Layer (Edge Function or Next.js API) 
    -- because PL/PGSQL cannot make HTTP requests securely without extensions.
    
    -- So we just store the intention to send? 
    -- Or we assume the caller will handle the HTTP request?
    
    -- Let's just create the tables for now. The dispatch logic will be in the application.
    null;
end;
$$;
