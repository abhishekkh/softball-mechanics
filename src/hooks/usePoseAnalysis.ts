// src/hooks/usePoseAnalysis.ts
// Orchestration hook: Web Worker init, frame sampling, MediaPipe analysis,
// API persistence, and progress reporting.
//
// Error handling principle (per CONTEXT.md decision):
//   "show partial results with a warning — do not hide data"
//   On status === 'error': loadStoredFrames() AND sets analysisErrorMessage
//   so callers render a warning callout alongside any partial frames.
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import * as Comlink from 'comlink'
import { createBrowserClient } from '@supabase/ssr'
import { computeFrameAngles } from '@/lib/pose/angles'
import { flagMechanics, checkFramingQuality, markContactFrame } from '@/lib/pose/flags'
import type { FrameAnalysis, AnalysisStatus, NormalizedLandmark } from '@/types/analysis'

const SAMPLE_FPS = 5          // Analyze one frame every 200ms of video
const HIP_TRANSLATE_THRESHOLD = 0.15  // Stop when hip midpoint moves >15% of frame width (player started running)

interface UsePoseAnalysisResult {
  frames: FrameAnalysis[]
  analysisStatus: AnalysisStatus | null
  progressPct: number
  framingWarning: string | null
  // Non-null when status === 'error'. Passed to MechanicsSidebar to render
  // an error callout alongside any partial frames — per CONTEXT.md decision:
  // "show partial results with a warning — do not hide data".
  analysisErrorMessage: string | null
  startReanalysis: () => void
}

export function usePoseAnalysis(
  videoId: string,
  videoRef: React.RefObject<HTMLVideoElement | null>
): UsePoseAnalysisResult {
  const [frames, setFrames] = useState<FrameAnalysis[]>([])
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null)
  const [progressPct, setProgressPct] = useState(0)
  const [framingWarning, setFramingWarning] = useState<string | null>(null)
  const [analysisErrorMessage, setAnalysisErrorMessage] = useState<string | null>(null)
  const [triggerAnalysis, setTriggerAnalysis] = useState(0)

  const workerRef = useRef<Worker | null>(null)
  const abortRef = useRef(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const loadStoredFrames = useCallback(async () => {
    const { data, error } = await supabase
      .from('video_analysis_frames')
      .select('*')
      .eq('video_id', videoId)
      .order('frame_index', { ascending: true })

    if (error || !data) return

    const loaded: FrameAnalysis[] = data.map((row) => ({
      frameIndex: row.frame_index as number,
      timestampMs: row.timestamp_ms as number,
      landmarks: row.landmarks as NormalizedLandmark[],
      angles: {
        elbowSlotDeg: row.elbow_slot_deg as number | null,
        shoulderTiltDeg: row.shoulder_tilt_deg as number | null,
        hipRotationDeg: row.hip_rotation_deg as number | null,
      },
      flags: (row.flags ?? []) as ReturnType<typeof flagMechanics>,
    }))
    setFrames(markContactFrame(loaded))
  }, [videoId, supabase])

  const runAnalysis = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    abortRef.current = false
    setAnalysisStatus('analyzing')
    setProgressPct(0)
    setAnalysisErrorMessage(null)

    // Mark analyzing in DB to gate Re-analyze button
    await supabase
      .from('video_analyses')
      .update({ status: 'analyzing', progress_pct: 0 })
      .eq('video_id', videoId)

    // Init worker
    const worker = new Worker(
      new URL('@/workers/pose-analyzer.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    const api = Comlink.wrap<{
      init: () => Promise<void>
      detectOnImageBitmap: (b: ImageBitmap) => Promise<{ landmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>> }>
    }>(worker)

    try {
      await api.init()
    } catch (err) {
      console.error('[usePoseAnalysis] Worker init failed:', err)
      const msg = String(err)
      setAnalysisStatus('error')
      setAnalysisErrorMessage(msg)
      await supabase
        .from('video_analyses')
        .update({ status: 'error', error_message: msg })
        .eq('video_id', videoId)
      worker.terminate()
      return
    }

    // Wait for video metadata
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) { resolve(); return }
      video.addEventListener('loadedmetadata', () => resolve(), { once: true })
    })

    const duration = video.duration
    const frameInterval = 1 / SAMPLE_FPS   // seconds between sampled frames
    const totalFrames = Math.floor(duration * SAMPLE_FPS)
    const collectedFrames: FrameAnalysis[] = []
    let detectedFramingWarning: string | null = null
    let initialHipX: number | null = null  // Set from first valid frame; used to detect running

    const offscreen = new OffscreenCanvas(video.videoWidth || 1280, video.videoHeight || 720)
    const offCtx = offscreen.getContext('2d')!

    for (let i = 0; i < totalFrames; i++) {
      if (abortRef.current) break

      const timestampS = i * frameInterval
      video.currentTime = timestampS

      // Wait for seeked event
      await new Promise<void>((resolve) => {
        video.addEventListener('seeked', () => resolve(), { once: true })
      })

      // Draw current frame to offscreen canvas
      offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height)
      const bitmap = offscreen.transferToImageBitmap()

      let result: { landmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>> }
      try {
        result = await api.detectOnImageBitmap(bitmap)
      } catch {
        continue  // Skip frame on inference error
      }

      const rawLandmarks = result.landmarks[0]
      if (!rawLandmarks || rawLandmarks.length === 0) continue

      const landmarks = rawLandmarks as NormalizedLandmark[]

      // Detect when batter starts running: track hip midpoint translation from first valid frame
      const leftHip = landmarks[23]
      const rightHip = landmarks[24]
      if (leftHip && rightHip) {
        const hipX = (leftHip.x + rightHip.x) / 2
        if (initialHipX === null) {
          initialHipX = hipX
        } else if (Math.abs(hipX - initialHipX) > HIP_TRANSLATE_THRESHOLD) {
          break  // Player has left the batter's box — stop analysis
        }
      }

      const angles = computeFrameAngles(landmarks)
      const frameFlags = flagMechanics(
        angles.elbowSlotDeg,
        angles.shoulderTiltDeg,
        angles.hipRotationDeg,
        landmarks
      )

      // Check framing quality on first valid frame only
      if (i === 0 && !detectedFramingWarning) {
        detectedFramingWarning = checkFramingQuality(landmarks)
      }

      collectedFrames.push({
        frameIndex: i,
        timestampMs: Math.round(timestampS * 1000),
        landmarks,
        angles,
        flags: frameFlags,
      })

      const pct = Math.round(((i + 1) / totalFrames) * 100)
      setProgressPct(pct)
      // Batch UI update every 10 frames to avoid excessive re-renders
      if (i % 10 === 0) {
        setFrames([...collectedFrames])
      }
    }

    worker.terminate()
    workerRef.current = null

    if (abortRef.current) return

    setFramingWarning(detectedFramingWarning)
    setFrames(markContactFrame(collectedFrames))

    // Persist to Supabase via API route
    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          frames: collectedFrames,
          framingWarning: detectedFramingWarning ?? undefined,
        }),
      })

      if (response.ok) {
        setAnalysisStatus(collectedFrames.length > 0 ? 'complete' : 'low_confidence')
        setProgressPct(100)
      } else {
        setAnalysisStatus('error')
        setAnalysisErrorMessage('Failed to save analysis results.')
      }
    } catch (err) {
      console.error('[usePoseAnalysis] Persist failed:', err)
      setAnalysisStatus('error')
      setAnalysisErrorMessage(String(err))
    }
  }, [videoId, videoRef, supabase])

  useEffect(() => {
    if (!videoId) return

    const initialize = async () => {
      // Check existing analysis status.
      // Include error_message so we can surface it when status === 'error'.
      const { data: existing } = await supabase
        .from('video_analyses')
        .select('status, progress_pct, framing_warning, error_message')
        .eq('video_id', videoId)
        .single()

      if (existing) {
        const status = existing.status as AnalysisStatus
        setAnalysisStatus(status)
        setFramingWarning(existing.framing_warning as string | null)

        if (status === 'complete' || status === 'low_confidence') {
          await loadStoredFrames()
          return
        }

        if (status === 'error') {
          // IMPORTANT: load partial frames even on error.
          // Per CONTEXT.md decision: "show partial results with a warning — do not hide data".
          // The API route may have persisted frames before the error occurred.
          setAnalysisErrorMessage(existing.error_message as string | null)
          await loadStoredFrames()
          return  // Wait for manual re-analysis trigger via startReanalysis()
        }
      }

      // pending, analyzing, or no row: run analysis
      if (triggerAnalysis >= 0) {
        await runAnalysis()
      }
    }

    initialize()

    return () => {
      abortRef.current = true
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [videoId, triggerAnalysis]) // eslint-disable-line react-hooks/exhaustive-deps

  const startReanalysis = useCallback(async () => {
    // Reset DB status to pending, then re-run
    await supabase
      .from('video_analyses')
      .update({ status: 'pending', progress_pct: 0 })
      .eq('video_id', videoId)
    setFrames([])
    setProgressPct(0)
    setAnalysisStatus('pending')
    setAnalysisErrorMessage(null)
    setTriggerAnalysis((n) => n + 1)
  }, [videoId, supabase])

  return { frames, analysisStatus, progressPct, framingWarning, analysisErrorMessage, startReanalysis }
}
