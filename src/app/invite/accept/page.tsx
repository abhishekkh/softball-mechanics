'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvite } from '@/actions/auth'

export default function InviteAcceptPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function handleAccept() {
      const result = await acceptInvite()
      if ('error' in result) {
        if (result.error === 'Not authenticated') {
          router.replace('/login')
          return
        }
        setErrorMessage(result.error)
        setStatus('error')
        return
      }
      setStatus('success')
      router.replace('/submissions')
    }

    handleAccept()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Activating your account...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-green-600 font-medium">Invite accepted! Redirecting to your submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <p className="text-red-600 font-medium mb-2">Invite activation failed</p>
        <p className="text-gray-600 text-sm">{errorMessage}</p>
        <a href="/login" className="text-blue-600 hover:underline text-sm mt-4 block">Go to sign in</a>
      </div>
    </div>
  )
}
