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
  const [motionType, setMotionType] = useState<'hitting' | 'pitching'>('hitting')

  const isCoach = !!coachId
  const effectiveAthleteId = isCoach ? selectedAthleteId : athleteId!
  const effectiveCoachId = coachId ?? ''  // Athletes don't have coachId readily; TODO Phase 5

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Upload Video</h1>

      {/* Athlete + motion type on one row to keep the upload zone above the fold on mobile */}
      <div className="flex flex-wrap items-end gap-6 mb-4">
        {/* Motion type selector — left */}
        <div className="flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motion
          </label>
          <div className="flex gap-3">
            {(['hitting', 'pitching'] as const).map((type) => (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="motionType"
                  value={type}
                  checked={motionType === type}
                  onChange={() => setMotionType(type)}
                  className="h-4 w-4 text-blue-600 border-gray-300"
                />
                <span className="text-sm text-gray-700 capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Athlete selector — right */}
        {isCoach && (
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Athlete (optional)
            </label>
            {athletes.length === 0 ? (
              <p className="text-sm text-gray-500">
                <a href="/roster" className="text-blue-600 hover:underline">Invite from roster</a>
              </p>
            ) : (
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Framing guidance — locked decision from Phase 2 CONTEXT.md */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
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
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasConsented}
            onChange={(e) => setHasConsented(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I confirm that I have obtained consent from the athlete (or a parent/guardian if the athlete is a minor) to record, upload, and analyze this video. The video will be stored securely and used solely for baseball and softball mechanics analysis.
          </span>
        </label>
      </div>

      {hasConsented ? (
        <VideoUploader athleteId={effectiveAthleteId || undefined} coachId={effectiveCoachId} motionType={motionType} />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-sm text-gray-400">Please accept the consent statement above to enable video upload.</p>
        </div>
      )}
    </div>
  )
}
