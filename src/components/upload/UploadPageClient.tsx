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

      <VideoUploader athleteId={effectiveAthleteId || undefined} coachId={effectiveCoachId} />
    </div>
  )
}
