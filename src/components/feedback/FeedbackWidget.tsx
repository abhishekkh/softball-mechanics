'use client'

import { useRef, useState, useEffect } from 'react'
import { submitFeedback } from '@/actions/user-feedback'

type Status = 'idle' | 'open' | 'sending' | 'sent' | 'error'

export default function FeedbackWidget() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [steps, setSteps] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (status === 'open') {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [status])

  function open() {
    setMessage('')
    setSteps('')
    setErrorMsg('')
    setStatus('open')
  }

  function close() {
    setStatus('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const result = await submitFeedback({
      message,
      steps,
      pageUrl: window.location.href,
      referrer: document.referrer || undefined,
      userAgent: navigator.userAgent,
    })

    if (result.success) {
      setStatus('sent')
    } else {
      setErrorMsg(result.error ?? 'Something went wrong.')
      setStatus('open')
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={open}
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 4V5z" />
        </svg>
        Feedback
      </button>

      {/* Modal */}
      <dialog
        ref={dialogRef}
        onClose={close}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/40 open:animate-none"
      >
        {status === 'sent' ? (
          <div className="flex flex-col items-center gap-3 px-8 py-10 text-center">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="10" fill="#dcfce7" />
              <path d="M6 10l3 3 5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-lg font-semibold text-gray-900">Thanks for your feedback!</p>
            <p className="text-sm text-gray-500">We&apos;ve received your message and will look into it.</p>
            <button
              onClick={close}
              className="mt-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Send Feedback</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              {errorMsg && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
              )}

              <div>
                <label htmlFor="fb-message" className="mb-1 block text-sm font-medium text-gray-700">
                  Your feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="fb-message"
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what you think, what's broken, or what could be better…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label htmlFor="fb-steps" className="mb-1 block text-sm font-medium text-gray-700">
                  What were you doing? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="fb-steps"
                  rows={2}
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  placeholder="e.g. I uploaded a video and clicked Review, then…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={close}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {status === 'sending' ? 'Sending…' : 'Send Feedback'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
