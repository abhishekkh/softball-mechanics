// src/app/api/analysis/vlm-eval/route.ts
// PROTOTYPE ONLY — Phase 2.2 evaluation tool.
// Not wired into the main analysis pipeline.
// Used to qualitatively compare Gemini Flash mechanics analysis vs MediaPipe flags.
//
// SECURITY: GEMINI_API_KEY must NOT have NEXT_PUBLIC_ prefix.
// This route runs only on the server — never import @google/genai in client code.

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

const RequestSchema = z.object({
  base64Frame: z.string().min(1),   // JPEG frame as base64 string (no data: prefix)
  motionType: z.enum(['hitting', 'pitching']).default('hitting'),
})

export async function POST(request: NextRequest) {
  // Auth check — only authenticated users can call this prototype route
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured. See .env.local.example.' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const parseResult = RequestSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 })
  }

  const { base64Frame, motionType } = parseResult.data

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const prompt = `You are a certified softball mechanics coach with 10+ years of experience.
Analyze this single frame from a ${motionType} motion.
Identify any mechanical issues visible in this frame. Focus specifically on:
- Elbow position and arm path
- Shoulder tilt and upper body alignment
- Hip rotation and lower body position
- Weight distribution and balance

Respond in 2-3 sentences maximum. Be specific about which body part shows the issue and what the problem is.
If the frame quality or body visibility is insufficient for analysis, say so briefly.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Frame } },
            { text: prompt },
          ],
        },
      ],
    })
    const description = response.text
    return NextResponse.json({ description, motionType })
  } catch (err) {
    console.error('[vlm-eval] Gemini API error:', err)
    return NextResponse.json(
      { error: 'Gemini API call failed', detail: String(err) },
      { status: 500 }
    )
  }
}
