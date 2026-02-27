import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // If explicit next param provided (e.g. invite flow), route there
      if (next && next !== '/' && next.startsWith('/')) {
        return NextResponse.redirect(new URL(next, origin))
      }
      // Default: role-based redirect for normal login
      const role = data.user.user_metadata?.role ?? 'coach'
      const destination = role === 'athlete' ? '/submissions' : '/dashboard'
      return NextResponse.redirect(new URL(destination, origin))
    }
  }

  // Error fallback
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
