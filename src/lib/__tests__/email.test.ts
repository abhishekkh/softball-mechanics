// src/lib/__tests__/email.test.ts
// TDD: Phase 02.4 Plan 01 — sendEmail() Resend utility

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the resend package before importing email.ts
// ---------------------------------------------------------------------------
const mockSend = vi.fn()

vi.mock('resend', () => {
  class MockResend {
    emails = { send: mockSend }
  }
  return { Resend: MockResend }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendEmail()', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    mockSend.mockReset()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns a message ID string when Resend succeeds', async () => {
    process.env.RESEND_API_KEY = 'test_key_123'
    mockSend.mockResolvedValue({ data: { id: 're_abc123' }, error: null })

    const { sendEmail } = await import('../email')
    const id = await sendEmail('to@example.com', 'Hello', '<p>Hi</p>')

    expect(id).toBe('re_abc123')
    expect(mockSend).toHaveBeenCalledOnce()
  })

  it('throws Error("Missing RESEND_API_KEY") when env var is absent', async () => {
    delete process.env.RESEND_API_KEY

    const { sendEmail } = await import('../email')
    await expect(sendEmail('to@example.com', 'Hello', '<p>Hi</p>')).rejects.toThrow(
      'Missing RESEND_API_KEY'
    )
  })

  it('uses noreply@resend.dev as from address when RESEND_FROM_EMAIL is not set', async () => {
    process.env.RESEND_API_KEY = 'test_key_123'
    delete process.env.RESEND_FROM_EMAIL
    mockSend.mockResolvedValue({ data: { id: 're_xyz' }, error: null })

    const { sendEmail } = await import('../email')
    await sendEmail('to@example.com', 'Subject', '<p>body</p>')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@resend.dev' })
    )
  })

  it('uses RESEND_FROM_EMAIL when set', async () => {
    process.env.RESEND_API_KEY = 'test_key_123'
    process.env.RESEND_FROM_EMAIL = 'coach@myleague.com'
    mockSend.mockResolvedValue({ data: { id: 're_xyz' }, error: null })

    const { sendEmail } = await import('../email')
    await sendEmail('to@example.com', 'Subject', '<p>body</p>')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'coach@myleague.com' })
    )
  })

  it('passes to, subject, html to Resend correctly', async () => {
    process.env.RESEND_API_KEY = 'test_key_123'
    mockSend.mockResolvedValue({ data: { id: 're_xyz' }, error: null })

    const { sendEmail } = await import('../email')
    await sendEmail('athlete@example.com', 'Welcome!', '<h1>Welcome</h1>')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'athlete@example.com',
        subject: 'Welcome!',
        html: '<h1>Welcome</h1>',
      })
    )
  })

  it('throws when Resend API returns an error', async () => {
    process.env.RESEND_API_KEY = 'test_key_123'
    mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } })

    const { sendEmail } = await import('../email')
    await expect(sendEmail('to@example.com', 'Subject', '<p>body</p>')).rejects.toThrow(
      'Resend error: Invalid API key'
    )
  })
})
