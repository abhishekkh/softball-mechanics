// src/actions/__tests__/feedback.test.ts
// TDD: Phase 02.4 Plan 03 — sendFeedbackEmail() server action

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock dependencies before importing feedback.ts
// ---------------------------------------------------------------------------

// Mock @/lib/supabase/server
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

// Mock @/lib/email
const mockSendEmail = vi.fn()
vi.mock('@/lib/email', () => ({
  sendEmail: mockSendEmail,
}))

// ---------------------------------------------------------------------------
// Helper to build chainable Supabase query mock
// ---------------------------------------------------------------------------
function makeQueryChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendFeedbackEmail()', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockSendEmail.mockReset()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns { error: "Not authenticated" } when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { sendFeedbackEmail } = await import('../feedback')
    const result = await sendFeedbackEmail('any-video-id')

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns { error: "Video not found" } when video does not belong to the coach', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    const videoChain = makeQueryChain({ data: null, error: null })
    mockFrom.mockReturnValue(videoChain)

    const { sendFeedbackEmail } = await import('../feedback')
    const result = await sendFeedbackEmail('video-id-wrong-coach')

    expect(result).toEqual({ error: 'Video not found' })
  })

  it('returns { error: "No athlete assigned to this video" } when athlete_id is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    // video query returns video with null athlete_id
    const videoChain = makeQueryChain({ data: { id: 'v1', athlete_id: null, coach_id: 'coach-1' } })
    mockFrom.mockReturnValue(videoChain)

    const { sendFeedbackEmail } = await import('../feedback')
    const result = await sendFeedbackEmail('video-id-missing-athlete')

    expect(result).toEqual({ error: 'No athlete assigned to this video' })
  })

  it('returns { error: "No email on file for this athlete" } when coach_athletes has no email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // video query
        return makeQueryChain({ data: { id: 'v1', athlete_id: 'athlete-1', coach_id: 'coach-1' } })
      }
      if (callCount === 2) {
        // video_analyses query
        return makeQueryChain({ data: { vlm_summary: null } })
      }
      // coach_athletes query — no record
      return makeQueryChain({ data: null })
    })

    const { sendFeedbackEmail } = await import('../feedback')
    const result = await sendFeedbackEmail('video-id-no-email')

    expect(result).toEqual({ error: 'No email on file for this athlete' })
  })

  it('returns { success: true } and sends email when all data is present with vlm_summary', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeQueryChain({ data: { id: 'v1', athlete_id: 'athlete-1', coach_id: 'coach-1' } })
      }
      if (callCount === 2) {
        return makeQueryChain({ data: { vlm_summary: 'Great hip rotation!' } })
      }
      return makeQueryChain({ data: { athlete_email: 'athlete@example.com' } })
    })

    mockSendEmail.mockResolvedValue('re_abc123')

    const { sendFeedbackEmail } = await import('../feedback')
    const result = await sendFeedbackEmail('video-id-with-athlete')

    expect(result).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledOnce()
    expect(mockSendEmail).toHaveBeenCalledWith(
      'athlete@example.com',
      'Mechanics feedback from your coach',
      expect.stringContaining('Great hip rotation!')
    )
  })

  it('uses fallback text in email body when vlm_summary is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeQueryChain({ data: { id: 'v1', athlete_id: 'athlete-1', coach_id: 'coach-1' } })
      }
      if (callCount === 2) {
        return makeQueryChain({ data: { vlm_summary: null } })
      }
      return makeQueryChain({ data: { athlete_email: 'athlete@example.com' } })
    })

    mockSendEmail.mockResolvedValue('re_xyz')

    const { sendFeedbackEmail } = await import('../feedback')
    const result = await sendFeedbackEmail('video-id-with-athlete')

    expect(result).toEqual({ success: true })
    // Email body must contain the fallback text (not empty)
    const emailHtml = mockSendEmail.mock.calls[0][2] as string
    expect(emailHtml.length).toBeGreaterThan(20)
    expect(emailHtml).toContain('Log in to view your full analysis')
  })

  it('email subject is "Mechanics feedback from your coach"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeQueryChain({ data: { id: 'v1', athlete_id: 'athlete-1', coach_id: 'coach-1' } })
      }
      if (callCount === 2) {
        return makeQueryChain({ data: { vlm_summary: 'Nice pitch!' } })
      }
      return makeQueryChain({ data: { athlete_email: 'athlete@example.com' } })
    })

    mockSendEmail.mockResolvedValue('re_xyz')

    const { sendFeedbackEmail } = await import('../feedback')
    await sendFeedbackEmail('video-id-with-athlete')

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.any(String),
      'Mechanics feedback from your coach',
      expect.any(String)
    )
  })

  it('email body includes link to /submissions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeQueryChain({ data: { id: 'v1', athlete_id: 'athlete-1', coach_id: 'coach-1' } })
      }
      if (callCount === 2) {
        return makeQueryChain({ data: { vlm_summary: 'Great swing!' } })
      }
      return makeQueryChain({ data: { athlete_email: 'athlete@example.com' } })
    })

    mockSendEmail.mockResolvedValue('re_xyz')

    const { sendFeedbackEmail } = await import('../feedback')
    await sendFeedbackEmail('video-id-with-athlete')

    const emailHtml = mockSendEmail.mock.calls[0][2] as string
    expect(emailHtml).toContain('https://example.com/submissions')
  })

  it('returns { error: "Failed to send feedback email..." } when sendEmail throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeQueryChain({ data: { id: 'v1', athlete_id: 'athlete-1', coach_id: 'coach-1' } })
      }
      if (callCount === 2) {
        return makeQueryChain({ data: { vlm_summary: null } })
      }
      return makeQueryChain({ data: { athlete_email: 'athlete@example.com' } })
    })

    mockSendEmail.mockRejectedValue(new Error('Resend API error'))

    const { sendFeedbackEmail } = await import('../feedback')
    const result = await sendFeedbackEmail('video-id-with-athlete')

    expect(result).toEqual({ error: 'Failed to send feedback email. Please try again.' })
  })
})
