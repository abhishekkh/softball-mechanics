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

      <VideoUploader athleteId={effectiveAthleteId || undefined} coachId={effectiveCoachId} />
    </div>
  )
}
