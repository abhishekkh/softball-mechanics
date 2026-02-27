'use client'

import { useState } from 'react'
import { inviteAthlete } from '@/actions/auth'

interface InviteAthleteModalProps {
  coachId: string
}

export function InviteAthleteModal({ coachId }: InviteAthleteModalProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage(null)

    const result = await inviteAthlete(email, coachId)
    if ('error' in result) {
      setStatus('error')
      setErrorMessage(result.error)
    } else {
      setStatus('sent')
      setEmail('')
    }
  }

  function handleClose() {
    setOpen(false)
    setStatus('idle')
    setEmail('')
    setErrorMessage(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Invite athlete
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Invite athlete</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {status === 'sent' ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">Invite sent!</p>
                <p className="text-gray-500 text-sm mt-1">
                  Your athlete will receive an email with a link to access the app.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label htmlFor="athleteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Athlete email
                  </label>
                  <input
                    id="athleteEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="athlete@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  They'll receive a magic link to access their submissions — no password needed.
                </p>
                {errorMessage && (
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {status === 'loading' ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
