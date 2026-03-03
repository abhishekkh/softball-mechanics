// src/app/api/upload/__tests__/presign.test.ts
// TDD: Phase 06 Plan 01 — role-aware coach_id resolution in presign route

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE importing the route
// These vi.fn() refs are captured at module scope; vi.mock is hoisted by
// Vitest but const declarations of vi.fn() before vi.mock are also hoisted
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

const mockGetPresignedPutUrl = vi.fn()
vi.mock('@/lib/r2', () => ({
  getPresignedPutUrl: mockGetPresignedPutUrl,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests — use dynamic import pattern (vi.resetModules in beforeEach)
// ---------------------------------------------------------------------------

describe('POST /api/upload/presign — role-aware coach_id resolution', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockInsert.mockReset()
    mockGetPresignedPutUrl.mockReset()
    mockGetPresignedPutUrl.mockResolvedValue('https://r2.example.com/presign-url')
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import('../presign/route')
    const req = makeRequest({ filename: 'test.mp4', contentType: 'video/mp4' })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('coach role: uses user.id as coach_id (ignores any coachId in body)', async () => {
    const coachId = '550e8400-e29b-41d4-a716-446655440000'
    const ignoredCoachId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: coachId,
          user_metadata: { role: 'coach' },
        },
      },
      error: null,
    })

    const { POST } = await import('../presign/route')
    const req = makeRequest({
      filename: 'test.mp4',
      contentType: 'video/mp4',
      coachId: ignoredCoachId,  // should be ignored for coach role
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: coachId })
    )
    // The provided coachId should NOT be used
    expect(mockInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: ignoredCoachId })
    )
  })

  it('athlete role with valid coachId: uses coachId from body as coach_id', async () => {
    const athleteUserId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    const coachId = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const { POST } = await import('../presign/route')
    const req = makeRequest({
      filename: 'game.mp4',
      contentType: 'video/mp4',
      coachId,
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: coachId })
    )
    // athlete's own ID should NOT be used as coach_id
    expect(mockInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: athleteUserId })
    )
  })

  it('athlete role with null coachId: returns 400 with "Athlete must be linked to a coach" error', async () => {
    const athleteUserId = '6ba7b812-9dad-11d1-80b4-00c04fd430c8'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const { POST } = await import('../presign/route')
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
    const athleteUserId = '6ba7b813-9dad-11d1-80b4-00c04fd430c8'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const { POST } = await import('../presign/route')
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
    const athleteUserId = '6ba7b814-9dad-11d1-80b4-00c04fd430c8'
    const coachId = '6ba7b815-9dad-11d1-80b4-00c04fd430c8'
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: athleteUserId,
          user_metadata: { role: 'athlete' },
        },
      },
      error: null,
    })

    const { POST } = await import('../presign/route')
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
