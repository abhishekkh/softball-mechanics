'use client'

interface QueueItem {
  id: string
  filename: string
  progress: number  // 0-100
  status: 'waiting' | 'uploading' | 'transcoding' | 'ready' | 'error'
  videoId?: string
  errorMessage?: string
}

interface UploadQueueProps {
  items: QueueItem[]
}

export function UploadQueue({ items }: UploadQueueProps) {
  if (items.length === 0) return null

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
              {item.filename}
            </span>
            <StatusBadge status={item.status} />
          </div>
          {(item.status === 'uploading' || item.status === 'transcoding') && (
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${item.status === 'transcoding' ? 100 : item.progress}%` }}
              />
            </div>
          )}
          {item.status === 'transcoding' && (
            <p className="text-xs text-gray-500 mt-1">Transcoding… this takes about 2 minutes</p>
          )}
          {item.status === 'error' && (
            <p className="text-xs text-red-500 mt-1">{item.errorMessage ?? 'Upload failed'}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: QueueItem['status'] }) {
  const config = {
    waiting:     { label: 'Waiting',     className: 'bg-gray-100 text-gray-600' },
    uploading:   { label: 'Uploading',   className: 'bg-blue-100 text-blue-700' },
    transcoding: { label: 'Processing',  className: 'bg-yellow-100 text-yellow-700' },
    ready:       { label: 'Ready',       className: 'bg-green-100 text-green-700' },
    error:       { label: 'Error',       className: 'bg-red-100 text-red-700' },
  }[status]

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}

export type { QueueItem }
