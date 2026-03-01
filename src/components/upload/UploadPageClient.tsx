'use client'

import { useState } from 'react'
import { VideoUploader } from '@/components/upload/VideoUploader'

interface UploadPageClientProps {
  coachId?: string
  athleteId?: string
  athletes: { id: string; full_name: string }[]
}

export function UploadPageClient({ coachId, athleteId, athletes }: UploadPageClientProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState(athleteId ?? '')
  const [hasConsented, setHasConsented] = useState(false)

  const isCoach = !!coachId
  const effectiveAthleteId = isCoach ? selectedAthleteId : athleteId!
  const effectiveCoachId = coachId ?? ''  // Athletes don't have coachId readily; TODO Phase 5

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Upload Video</h1>

      {isCoach && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign to athlete (optional)
          </label>
          {athletes.length === 0 ? (
            <p className="text-sm text-gray-500">
              No active athletes yet.{' '}
              <a href="/roster" className="text-blue-600 hover:underline">Invite one from the roster</a>{' '}
              to assign this video.
            </p>
          ) : (
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {athletes.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Framing guidance — locked decision from Phase 2 CONTEXT.md */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Filming tips for best results</p>
            <ul className="mt-1 space-y-0.5 text-sm text-blue-700">
              <li>Film from the side so hands and bat path are fully visible</li>
              <li>Keep the full body in frame — head to feet</li>
              <li>Use good lighting and avoid backlit shots</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legal consent — must be accepted before upload zone is enabled */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasConsented}
            onChange={(e) => setHasConsented(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I confirm that I have obtained consent from the athlete (or a parent/guardian if the athlete is a minor) to record, upload, and analyze this video. The video will be stored securely and used solely for softball mechanics analysis.
          </span>
        </label>
      </div>

      {hasConsented ? (
        <VideoUploader athleteId={effectiveAthleteId || undefined} coachId={effectiveCoachId} />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-sm text-gray-400">Please accept the consent statement above to enable video upload.</p>
        </div>
      )}
    </div>
  )
}
