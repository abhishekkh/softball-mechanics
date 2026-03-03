// src/app/api/upload/__tests__/presign.test.ts
// TDD: Phase 06 Plan 01 — role-aware coach_id resolution in presign route

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// vi.hoisted: declare mock fns that are referenced inside vi.mock factories
// (vi.mock is hoisted to top-of-file by Vitest, so plain `const` would be
// accessed before initialisation — vi.hoisted() runs before hoisted mocks)
// ---------------------------------------------------------------------------
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

const { mockGetPresignedPutUrl } = vi.hoisted(() => ({
  mockGetPresignedPutUrl: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock modules — factories run at hoist time and can safely reference the
// fns declared above via vi.hoisted()
// ---------------------------------------------------------------------------
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.mock('@/lib/r2', () => ({
  getPresignedPutUrl: mockGetPresignedPutUrl,
}))

// ---------------------------------------------------------------------------
// Import route AFTER mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '../presign/route'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeInsertChain(result: unknown) {
  return { insert: vi.fn().mockResolvedValue(result) }
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/upload/presign — role-aware coach_id resolution', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockGetPresignedPutUrl.mockReset()
    mockGetPresignedPutUrl.mockResolvedValue('https://r2.example.com/presign-url')
    mockFrom.mockReturnValue(makeInsertChain({ error: null }))
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as never)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest({ filename: 'test.mp4', contentType: 'video/mp4' })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('coach role: uses user.id as coach_id (ignores any coachId in body)', async () => {
    const coachId = 'coach-uuid-1111-2222-3333-444444444444'
    const ignoredCoachId = 'other-uuid-aaaa-bbbb-cccc-dddddddddddd'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: coachId,
          user_metadata: { role: 'coach' },
        },
      },
      error: null,
    })

    const insertChain = makeInsertChain({ error: null })
    mockFrom.mockReturnValue(insertChain)

    const req = makeRequest({
      filename: 'test.mp4',
      contentType: 'video/mp4',
      coachId: ignoredCoachId,  // should be ignored for coach role
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: coachId })
    )
    // The provided coachId should NOT be used
    expect(insertChain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: ignoredCoachId })
    )
  })

  it('athlete role with valid coachId: uses coachId from body as coach_id', async () => {
    const athleteUserId = 'athlete-uuid-1111-2222-3333-444444444444'
    const coachId = 'coach-uuid-aaaa-bbbb-cccc-dddddddddddd'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const insertChain = makeInsertChain({ error: null })
    mockFrom.mockReturnValue(insertChain)

    const req = makeRequest({
      filename: 'game.mp4',
      contentType: 'video/mp4',
      coachId,
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: coachId })
    )
    // athlete's own ID should NOT be used as coach_id
    expect(insertChain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: athleteUserId })
    )
  })

  it('athlete role with null coachId: returns 400 with "Athlete must be linked to a coach" error', async () => {
    const athleteUserId = 'athlete-uuid-1111-2222-3333-444444444444'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const req = makeRequest({
      filename: 'game.mp4',
      contentType: 'video/mp4',
      coachId: null,
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Athlete must be linked to a coach before uploading')
  })

  it('athlete role with missing coachId: returns 400 with "Athlete must be linked to a coach" error', async () => {
    const athleteUserId = 'athlete-uuid-1111-2222-3333-444444444444'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const req = makeRequest({
      filename: 'game.mp4',
      contentType: 'video/mp4',
      // coachId intentionally omitted
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Athlete must be linked to a coach before uploading')
  })

  it('PresignSchema accepts coachId as optional nullable uuid', async () => {
    const athleteUserId = 'athlete-uuid-1111-2222-3333-444444444444'
    const coachId = 'coach-uuid-aaaa-bbbb-cccc-dddddddddddd'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const insertChain = makeInsertChain({ error: null })
    mockFrom.mockReturnValue(insertChain)

    // Valid UUID format for coachId should pass schema validation
    const req = makeRequest({
      filename: 'swing.mp4',
      contentType: 'video/mp4',
      coachId,
    })
    const res = await POST(req)

    // Should not return 400 validation error
    expect(res.status).toBe(200)
  })
})
