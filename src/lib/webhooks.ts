import { createClient } from '@/lib/supabase/server'

export async function dispatchWebhook(companyId: string, eventType: string, payload: any) {
    const supabase = await createClient()

    // 1. Get active subscriptions for this company
    const { data: subs } = await supabase
        .from('webhook_subscriptions')
        .select('url, secret, events')
        .eq('company_id', companyId)
        .eq('is_active', true)

    if (!subs || subs.length === 0) return

    // 2. Filter subscriptions that care about this event
    const relevantSubs = subs.filter(sub =>
        !sub.events || sub.events.includes(eventType)
    )

    if (relevantSubs.length === 0) return

    // 3. Dispatch (Fire and Forget or Queue)
    // For MVP, we'll try to fetch immediately but wrap in try-catch to not block main flow.
    // In production, this should go to a background job (e.g. Quirrel, Inngest, or Supabase Edge Functions).

    const timestamp = new Date().toISOString()

    await Promise.allSettled(relevantSubs.map(async (sub) => {
        try {
            await fetch(sub.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': eventType,
                    'X-Webhook-Secret': sub.secret || '',
                    'X-Webhook-Timestamp': timestamp
                },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    event: eventType,
                    created_at: timestamp,
                    data: payload
                })
            })
            // Log success logic here if needed (webhook_deliveries)
        } catch (error) {
            console.error(`Webhook failed for ${sub.url}:`, error)
            // Log failure logic here
        }
    }))
}
