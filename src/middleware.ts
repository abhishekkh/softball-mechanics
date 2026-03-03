import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback', '/invite', '/api/inngest']

// In-memory rate limiter — resets per Edge worker cold start (acceptable for v1)
// Protects against single-user abuse on sensitive API routes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMITS: Record<string, number> = {
  '/api/upload/presign': 10,
  '/api/analysis': 5,
  '/api/analysis/vlm-eval': 3,
}

function checkRateLimit(ip: string, path: string): boolean {
  const limit = RATE_LIMITS[path]
  if (!limit) return true
  const key = `${ip}:${path}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    // Prune map if it grows too large (memory leak guard)
    if (!entry && rateLimitMap.size > 10_000) {
      for (const [k, v] of rateLimitMap) {
        if (v.resetAt < now) rateLimitMap.delete(k)
      }
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= limit
}

export async function middleware(request: NextRequest) {
  // Rate limiting — check before auth to keep 429 fast
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(ip, request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicPath = PUBLIC_PATHS.some(p =>
    p === '/' ? request.nextUrl.pathname === '/' : request.nextUrl.pathname.startsWith(p)
  )

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Attach role to header for server components
  if (user) {
    supabaseResponse.headers.set(
      'x-user-role',
      user.user_metadata?.role ?? 'coach'
    )
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
