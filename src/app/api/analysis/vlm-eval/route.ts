// src/app/api/analysis/vlm-eval/route.ts
// Production route — Phase 02.3.
// Accepts a base64 JPEG contact frame, calls Gemini Flash with a coach-to-athlete prompt,
// persists the commentary to video_analyses.vlm_summary, and returns the text.
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
  videoId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  // Auth check — only authenticated users can call this route
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

  const { base64Frame, motionType, videoId } = parseResult.data

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const prompt = `You are a certified softball coach speaking directly to your athlete after reviewing their ${motionType} technique.
Look at this single frame and identify the most important mechanical issue you see.
Address the athlete directly in 2-3 sentences. Be specific about which body part needs attention and what to fix.
Example tone: "Your arm circle is breaking down at the top. Focus on keeping the elbow extended through the wind-up — this transfers more power into your release."
If the image is unclear or shows insufficient body visibility, say: "The footage quality makes it hard to give specific feedback — try filming from the side with your full body in frame."
Do not use bullet points. Write like you're talking to your athlete, not writing a report.`

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

    // Persist — non-fatal if this fails; coach can regenerate
    try {
      await supabase
        .from('video_analyses')
        .update({ vlm_summary: description })
        .eq('video_id', videoId)
    } catch (dbErr) {
      console.error('[vlm-eval] DB persist failed (non-fatal):', dbErr)
    }

    return NextResponse.json({ description, motionType })
  } catch (err) {
    console.error('[vlm-eval] Gemini API error:', err)
    return NextResponse.json({ error: 'Gemini API call failed' }, { status: 500 })
  }
}
