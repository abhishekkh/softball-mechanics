import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { transcodeVideo } from '@/inngest/functions/transcode-video'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [transcodeVideo],
  // Add ALL new Inngest functions here — if missing, events fire but nothing runs
})
