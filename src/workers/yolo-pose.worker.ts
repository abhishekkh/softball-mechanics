// src/workers/yolo-pose.worker.ts
// PROTOTYPE ONLY — Phase 2.2 YOLO11-pose evaluation.
// NOT wired into the main analysis pipeline.
// Purpose: compare YOLO11 keypoint quality to MediaPipe on real softball frames.
//
// Model setup: yolo11n-pose.onnx must be placed at /public/models/yolo11n-pose.onnx
// Export from Python:
//   from ultralytics import YOLO
//   YOLO('yolo11n-pose.pt').export(format='onnx', opset=12, imgsz=640)
//   Then copy yolo11n-pose.onnx to public/models/
// Pre-exported models: see Ultralytics GitHub releases for yolo11n-pose.onnx
//   or: https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n-pose.pt
//
// IMPORTANT: YOLO11 uses 17 COCO keypoints — NOT MediaPipe's 33.
// Never apply LANDMARK_INDICES (MediaPipe) to YOLO11 output.
// Use YOLO_LANDMARK_INDICES below for all index references.

import * as Comlink from 'comlink'
import * as ort from 'onnxruntime-web'

// YOLO11 17 COCO keypoint indices (different order from MediaPipe 33)
export const YOLO_LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const

export interface YoloKeypoint {
  x: number      // normalized 0-1
  y: number      // normalized 0-1
  confidence: number
}

export interface YoloPoseResult {
  keypoints: YoloKeypoint[]   // 17 COCO keypoints
  bbox: { x: number; y: number; w: number; h: number }  // normalized bounding box
  score: number               // detection confidence
}

let session: ort.InferenceSession | null = null
const MODEL_URL = new URL('/models/yolo11n-pose.onnx', self.location.origin).href
const INPUT_SIZE = 640  // YOLO11n-pose input: 640x640

async function initModel(): Promise<void> {
  if (session) return
  // Use WebGPU if available, fall back to WASM
  const providers: string[] = []
  try {
    if ('gpu' in navigator) providers.push('webgpu')
  } catch { /* ignore */ }
  providers.push('wasm')

  session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: providers,
  })
}

/**
 * Run YOLO11-pose on an ImageBitmap and return the highest-confidence person detection.
 * Returns null if no person detected above threshold.
 *
 * Preprocessing: resize to 640x640, normalize to [0,1], convert to NCHW float32 tensor.
 * Postprocessing: decode YOLO output format [batch, 56, 8400] → keypoints.
 *
 * YOLO11-pose output layout per detection [56 values]:
 *   [0..3]   bbox: cx, cy, w, h (in pixel coords at INPUT_SIZE scale)
 *   [4]      object confidence
 *   [5..55]  17 keypoints × 3 values each: x, y, conf (pixel coords at INPUT_SIZE scale)
 */
async function detectPose(bitmap: ImageBitmap): Promise<YoloPoseResult | null> {
  await initModel()
  if (!session) throw new Error('YOLO model failed to initialize')

  // Preprocess: draw to OffscreenCanvas, resize to 640x640
  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE)
  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE)

  // Convert RGBA uint8 → RGB float32 NCHW [1, 3, 640, 640], normalize to [0,1]
  const float32 = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE)
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    float32[i] = imageData.data[i * 4] / 255                                    // R channel
    float32[INPUT_SIZE * INPUT_SIZE + i] = imageData.data[i * 4 + 1] / 255     // G channel
    float32[2 * INPUT_SIZE * INPUT_SIZE + i] = imageData.data[i * 4 + 2] / 255 // B channel
  }

  const tensor = new ort.Tensor('float32', float32, [1, 3, INPUT_SIZE, INPUT_SIZE])
  const inputName = session.inputNames[0]
  const outputs = await session.run({ [inputName]: tensor })

  // YOLO11-pose output: [1, 56, 8400]
  // 56 = 4 (bbox: cx,cy,w,h) + 1 (obj_conf) + 17*3 (keypoints: x,y,conf each)
  const outputName = session.outputNames[0]
  const output = outputs[outputName].data as Float32Array
  const numDetections = 8400

  let bestScore = 0.5  // confidence threshold
  let bestDet: YoloPoseResult | null = null

  for (let d = 0; d < numDetections; d++) {
    const score = output[4 * numDetections + d]  // obj_conf at channel index 4
    if (score < bestScore) continue

    const cx = output[0 * numDetections + d] / INPUT_SIZE
    const cy = output[1 * numDetections + d] / INPUT_SIZE
    const w  = output[2 * numDetections + d] / INPUT_SIZE
    const h  = output[3 * numDetections + d] / INPUT_SIZE

    const keypoints: YoloKeypoint[] = []
    for (let k = 0; k < 17; k++) {
      const base = (5 + k * 3) * numDetections + d
      keypoints.push({
        x: output[base] / INPUT_SIZE,
        y: output[base + numDetections] / INPUT_SIZE,
        confidence: output[base + 2 * numDetections],
      })
    }

    bestScore = score
    bestDet = {
      keypoints,
      bbox: { x: cx - w / 2, y: cy - h / 2, w, h },
      score,
    }
  }

  return bestDet
}

const YoloPoseWorker = { detectPose, initModel }
export type YoloPoseWorkerType = typeof YoloPoseWorker
Comlink.expose(YoloPoseWorker)
