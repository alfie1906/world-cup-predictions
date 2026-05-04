import { describe, expect, it } from 'vitest'
import { daySuffix, formatDateShort, kickoffDateKey, londonDateKey, parseUtcKickoff } from './dates'

describe('date utilities', () => {
  it('treats fixture timestamps without an explicit timezone as UTC', () => {
    expect(parseUtcKickoff('2026-06-11T20:00:00').toISOString()).toBe('2026-06-11T20:00:00.000Z')
    expect(parseUtcKickoff('2026-06-11T20:00:00+01:00').toISOString()).toBe('2026-06-11T19:00:00.000Z')
  })

  it('creates London date keys for dates and fixture strings', () => {
    expect(londonDateKey(new Date('2026-06-11T23:30:00Z'))).toBe('2026-06-12')
    expect(kickoffDateKey('2026-06-11T23:30:00Z')).toBe('2026-06-12')
  })

  it('formats short dates with ordinal suffixes', () => {
    expect(formatDateShort('2026-06-01')).toBe('1st June')
    expect(formatDateShort('2026-06-22')).toBe('22nd June')
    expect(daySuffix(2)).toBe('nd')
    expect(daySuffix(3)).toBe('rd')
    expect(daySuffix(11)).toBe('th')
    expect(daySuffix(24)).toBe('th')
  })
})
