'use client'

import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { UploadQueue, type QueueItem } from './UploadQueue'

const MAX_DURATION_SECONDS = 5

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    // Some iPhone formats (HEVC, certain .mov codecs) never fire loadedmetadata or onerror.
    // Without a timeout the promise hangs forever and blocks the upload.
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Timeout reading video metadata'))
    }, 4000)

    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Cannot read video metadata'))
    }
    video.src = URL.createObjectURL(file)
  })
}

interface VideoUploaderProps {
  athleteId?: string  // Optional — coach can upload without athlete assignment (deferred)
  coachId: string
  onUploadComplete?: (videoId: string) => void
}

export function VideoUploader({ athleteId, coachId, onUploadComplete }: VideoUploaderProps) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const updateItem = useCallback((id: string, update: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...update } : item))
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    const itemId = crypto.randomUUID()

    setQueue(prev => [...prev, {
      id: itemId,
      filename: file.name,
      progress: 0,
      status: 'waiting',
    }])

    try {
      // 0. Validate video duration before uploading
      try {
        const duration = await getVideoDuration(file)
        if (duration > MAX_DURATION_SECONDS) {
          updateItem(itemId, {
            status: 'error',
            errorMessage: `Video is ${Math.round(duration)}s long. Please trim it to ${MAX_DURATION_SECONDS} seconds or less before uploading.`,
          })
          return
        }
      } catch {
        // Can't read metadata (e.g. unsupported format) — proceed and let the server handle it
      }

      // 1. Request presigned URL from server
      updateItem(itemId, { status: 'uploading' })
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',  // Fallback for .mov/.mkv/.avi where browser omits MIME type
          athleteId: athleteId ?? null,     // Explicit null so presign receives null (not omitted key)
          coachId,
        }),
      })

      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}))
        throw new Error(body?.error ? `Presign failed: ${JSON.stringify(body.error)}` : `Presign failed: ${presignRes.status}`)
      }
      const { presignedUrl, videoId, r2Key } = await presignRes.json()
      updateItem(itemId, { videoId })

      // 2. Upload directly to R2 via XHR (for progress events — fetch doesn't expose upload progress)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', presignedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')  // Must match presigned URL's ContentType

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            updateItem(itemId, { progress: Math.round((e.loaded / e.total) * 100) })
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) resolve()
          else reject(new Error(`R2 upload failed: ${xhr.status}`))
        })
        xhr.addEventListener('error', reject)
        xhr.send(file)
      })

      // 3. Fire Inngest event to start transcoding
      updateItem(itemId, { status: 'transcoding', progress: 100 })
      await fetch('/api/inngest-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'video/uploaded',
          data: { videoId, key: r2Key },
        }),
      })

      // 4. Poll until transcoding completes, then update queue item
      onUploadComplete?.(videoId)
      const supabase = createClient()
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('videos')
          .select('status')
          .eq('id', videoId)
          .single()
        if (data?.status === 'ready') {
          updateItem(itemId, { status: 'ready' })
          clearInterval(interval)
        } else if (data?.status === 'error') {
          updateItem(itemId, { status: 'error', errorMessage: 'Transcoding failed' })
          clearInterval(interval)
        }
      }, 5000)

    } catch (err) {
      updateItem(itemId, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Upload failed',
      })
    }
  }, [athleteId, coachId, onUploadComplete, updateItem])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.slice(0, 10).forEach(uploadFile)  // Max 10 files
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 10,
    noClick: true,  // We handle click separately for desktop
    onDrop,
  })

  function handleMobileFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.slice(0, 10).forEach(uploadFile)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <div>
      {/* Desktop: drag-and-drop zone */}
      <div
        {...getRootProps()}
        className={`
          hidden md:flex flex-col items-center justify-center
          border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}
        `}
        onClick={() => {
          // Trigger the hidden file input on click
          const input = document.querySelector('[data-dropzone-input]') as HTMLInputElement
          input?.click()
        }}
      >
        <input {...getInputProps()} data-dropzone-input />
        <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-700">
          {isDragActive ? 'Drop videos here' : 'Drag videos here or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">Up to 10 videos at once</p>
      </div>

      {/* Mobile: native file input (no capture — athletes select from camera roll) */}
      <div className="md:hidden">
        <input
          ref={mobileInputRef}
          type="file"
          accept="video/*"
          // NO capture attribute — we want camera roll selection, not forced live recording
          multiple
          onChange={handleMobileFiles}
          className="hidden"
        />
        <button
          onClick={() => mobileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-4 text-sm font-medium active:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Select videos to upload
        </button>
      </div>

      <UploadQueue items={queue} />
    </div>
  )
}
