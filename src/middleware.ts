import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ─── Simple In-Memory Rate Limiter ───
// In production, use Redis or similar. This is a per-instance store.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_WINDOW = 60_000    // 1 minute
const MAX_REQUESTS = 100            // max requests per window
const CLEANUP_INTERVAL = 5 * 60_000 // cleanup every 5 min

let lastCleanup = Date.now()

function getRateLimitKey(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    return ip
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now()

    // Periodic cleanup of expired entries
    if (now - lastCleanup > CLEANUP_INTERVAL) {
        lastCleanup = now
        for (const [k, v] of rateLimitMap.entries()) {
            if (now > v.resetTime) rateLimitMap.delete(k)
        }
    }

    const record = rateLimitMap.get(key)

    if (!record || now > record.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW }
    }

    record.count++
    const remaining = Math.max(0, MAX_REQUESTS - record.count)
    const resetIn = record.resetTime - now

    if (record.count > MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn }
    }

    return { allowed: true, remaining, resetIn }
}

export async function middleware(request: NextRequest) {
    // Skip rate limiting for static assets and images
    const { pathname } = request.nextUrl
    const isStaticOrAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon')

    if (!isStaticOrAsset) {
        const key = getRateLimitKey(request)
        const { allowed, remaining, resetIn } = checkRateLimit(key)

        if (!allowed) {
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests. Please try again later.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(Math.ceil(resetIn / 1000)),
                        'X-RateLimit-Limit': String(MAX_REQUESTS),
                        'X-RateLimit-Remaining': '0',
                    },
                }
            )
        }

        // Continue with session update, add rate limit headers
        const response = await updateSession(request)
        response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS))
        response.headers.set('X-RateLimit-Remaining', String(remaining))
        return response
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
