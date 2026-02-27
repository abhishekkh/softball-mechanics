'use client'

import { TranscodingStatus } from '@/components/upload/TranscodingStatus'
import Image from 'next/image'

interface SessionRowProps {
  videoId: string
  thumbnailUrl?: string | null
  athleteName: string
  uploadedAt: string
  status: string
}

export function SessionRow({ videoId, thumbnailUrl, athleteName, uploadedAt, status }: SessionRowProps) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
      {/* Thumbnail */}
      <div className="w-20 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt="Video thumbnail"
            width={80}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Athlete info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{athleteName}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(uploadedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* Status badge — polls if processing */}
      <TranscodingStatus videoId={videoId} />
    </div>
  )
}
