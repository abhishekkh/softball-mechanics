import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  // PKCE flow (standard login / signup)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      if (next && next !== '/' && next.startsWith('/')) {
        return NextResponse.redirect(new URL(next, origin))
      }
      const role = data.user.user_metadata?.role ?? 'coach'
      const destination = role === 'athlete' ? '/submissions' : '/dashboard'
      return NextResponse.redirect(new URL(destination, origin))
    }
  }

  // Token hash flow (inviteUserByEmail — does not use PKCE)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error && data.user) {
      if (next && next !== '/' && next.startsWith('/')) {
        return NextResponse.redirect(new URL(next, origin))
      }
      const role = data.user.user_metadata?.role ?? 'coach'
      const destination = role === 'athlete' ? '/submissions' : '/dashboard'
      return NextResponse.redirect(new URL(destination, origin))
    }
  }

  // Error fallback
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
