import { inngest } from '@/inngest/client'
import { r2, getPublicUrl } from '@/lib/r2'
import { runFfmpeg } from '@/lib/ffmpeg'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { writeFile, readFile, readdir, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

// Use service role client — bypasses RLS so function can update any video row
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export const transcodeVideo = inngest.createFunction(
  { id: 'transcode-video', retries: 3 },
  { event: 'video/uploaded' },
  async ({ event, step }) => {
    const { videoId, key } = event.data as { videoId: string; key: string }

    // Step 1: Download raw video from R2 to /tmp
    const localInputPath = await step.run('download-raw-video', async () => {
      const result = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      }))

      const buffer = await streamToBuffer(result.Body as Readable)
      const ext = key.split('.').pop() ?? 'mp4'
      const localPath = `/tmp/${videoId}.${ext}`
      await writeFile(localPath, buffer)
      return localPath
    })

    // Step 2: Run FFmpeg → single 720p HLS
    const hlsOutputDir = `/tmp/${videoId}-hls`
    await step.run('transcode-to-hls', async () => {
      if (!existsSync(hlsOutputDir)) await mkdir(hlsOutputDir, { recursive: true })
      await runFfmpeg([
        '-i', localInputPath,
        '-vf', 'scale=1280:720',
        '-c:v', 'libx264',
        '-b:v', '2800k',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '48000',
        '-ac', '2',
        '-hls_time', '6',
        '-hls_segment_filename', join(hlsOutputDir, 'segment_%03d.ts'),
        '-f', 'hls',
        join(hlsOutputDir, 'playlist.m3u8'),
      ])
    })

    // Step 3: Upload HLS tree to R2
    const hlsBaseKey = `videos/${videoId}/hls`
    await step.run('upload-hls-to-r2', async () => {
      const files = await readdir(hlsOutputDir)
      for (const filename of files) {
        const fileBuffer = await readFile(join(hlsOutputDir, filename))
        const contentType = filename.endsWith('.m3u8')
          ? 'application/vnd.apple.mpegurl'
          : 'video/mp2t'
        await r2.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: `${hlsBaseKey}/${filename}`,
          Body: fileBuffer,
          ContentType: contentType,
        }))
      }
    })

    // Step 4: Extract thumbnail (frame at 2 seconds)
    const thumbnailKey = `videos/${videoId}/thumbnail.jpg`
    await step.run('extract-thumbnail', async () => {
      const thumbnailPath = `/tmp/${videoId}-thumb.jpg`
      await runFfmpeg([
        '-i', localInputPath,
        '-ss', '00:00:02',
        '-vframes', '1',
        '-q:v', '2',
        thumbnailPath,
      ])
      const thumbBuffer = await readFile(thumbnailPath)
      await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: thumbnailKey,
        Body: thumbBuffer,
        ContentType: 'image/jpeg',
      }))
    })

    // Step 5: Update video status in DB
    await step.run('update-status', async () => {
      const supabase = getServiceClient()
      const hlsUrl = getPublicUrl(`${hlsBaseKey}/playlist.m3u8`)
      const thumbnailUrl = getPublicUrl(thumbnailKey)

      const { error } = await supabase
        .from('videos')
        .update({
          status: 'ready',
          hls_url: hlsUrl,
          thumbnail_url: thumbnailUrl,
          transcoded_at: new Date().toISOString(),
        })
        .eq('id', videoId)

      if (error) throw new Error(`DB update failed: ${error.message}`)
    })

    // Step 6: Create pending analysis record — triggers browser-side MediaPipe analysis on first review
    await step.run('signal-analysis-ready', async () => {
      const supabase = getServiceClient()
      const { error } = await supabase
        .from('video_analyses')
        .insert({
          video_id: videoId,
          status: 'pending',
          progress_pct: 0,
        })
      // Non-fatal: log but don't throw — transcoding already succeeded
      if (error) {
        console.error(`[transcode-video] Failed to create analysis row: ${error.message}`)
      }
    })

    return { videoId, status: 'ready' }
  }
)
