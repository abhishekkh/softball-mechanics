import { spawn } from 'child_process'
import ffmpegPath from 'ffmpeg-static'

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg-static binary path is null — check deployment environment'))
      return
    }

    const proc = spawn(ffmpegPath, args)

    let stderr = ''
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}. stderr: ${stderr.slice(-500)}`))
      }
    })

    proc.on('error', reject)
  })
}
