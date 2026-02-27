'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function InvitePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function acceptInvite() {
      // Supabase puts the token in the URL hash (e.g., #access_token=...&type=invite)
      // Parse from window.location.hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (type === 'invite' && accessToken && refreshToken) {
        const supabase = createClient()
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          setErrorMessage(error.message)
          setStatus('error')
          return
        }

        // Update coach_athletes status to active
        if (data.user) {
          await supabase
            .from('coach_athletes')
            .update({ athlete_id: data.user.id, status: 'active', joined_at: new Date().toISOString() })
            .eq('athlete_email', data.user.email)
            .eq('status', 'pending')
        }

        setStatus('success')
        setTimeout(() => router.push('/submissions'), 1500)
        return
      }

      setErrorMessage('Invalid invite link. Please ask your coach to send a new invite.')
      setStatus('error')
    }

    acceptInvite()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Accepting your invite\u2026</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-green-600 font-medium">Invite accepted! Redirecting to your submissions\u2026</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <p className="text-red-600 font-medium mb-2">Invite link error</p>
        <p className="text-gray-600 text-sm">{errorMessage}</p>
        <a href="/login" className="text-blue-600 hover:underline text-sm mt-4 block">Go to sign in</a>
      </div>
    </div>
  )
}
