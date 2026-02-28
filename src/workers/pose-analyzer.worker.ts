// src/workers/pose-analyzer.worker.ts
// MediaPipe PoseLandmarker running in a Web Worker via Comlink
// CRITICAL: No @/ alias imports — Worker bundle cannot resolve them

import * as Comlink from 'comlink'
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

let landmarker: PoseLandmarker | null = null

/**
 * Initialize MediaPipe PoseLandmarker using local WASM assets.
 * Must be called before detectOnImageBitmap.
 * Uses /public/mediapipe/wasm (local, avoids CDN dependency in production).
 */
async function init(): Promise<void> {
  const origin = self.location.origin
  const vision = await FilesetResolver.forVisionTasks(`${origin}/mediapipe/wasm`)
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `${origin}/mediapipe/pose_landmarker_full.task`,
      delegate: 'GPU',   // Falls back to CPU automatically if GPU unavailable
    },
    runningMode: 'IMAGE',   // IMAGE mode: analyze discrete frames, not continuous stream
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}

/**
 * Detect pose landmarks on a single video frame.
 * Caller passes an ImageBitmap created from a video element.
 * Returns the raw PoseLandmarkerResult landmarks array (33 landmarks).
 */
async function detectOnImageBitmap(bitmap: ImageBitmap): Promise<{
  landmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>>
}> {
  if (!landmarker) throw new Error('PoseLandmarker not initialized. Call init() first.')
  const result = landmarker.detect(bitmap)
  bitmap.close()  // free GPU/CPU memory immediately
  return {
    landmarks: result.landmarks as Array<Array<{ x: number; y: number; z: number; visibility: number }>>,
  }
}

Comlink.expose({ init, detectOnImageBitmap })
