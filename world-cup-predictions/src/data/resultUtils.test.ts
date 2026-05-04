import { describe, expect, it } from 'vitest'
import type { Fixture } from '../types/domain'
import {
  applyResultRowsToFixtures,
  fixtureResult,
  isDueFixture,
  isFinishedSportsDbEvent,
  matchLabel,
  normalizeResult,
  parseSportsDbResult,
  resultFromScores,
  scoresForResult,
} from './resultUtils'

const fixture: Fixture = {
  id: 'match-1',
  home: { id: 'mex', name: 'Mexico' },
  away: { id: 'rsa', name: 'South Africa' },
  kickoff: '2026-06-11T20:00:00Z',
  status: 'SCHEDULED',
}

describe('result utilities', () => {
  it('normalizes supported result spellings', () => {
    expect(normalizeResult('home win')).toBe('H')
    expect(normalizeResult('D')).toBe('X')
    expect(normalizeResult('away')).toBe('A')
    expect(normalizeResult('X')).toBe('X')
    expect(normalizeResult('HOME')).toBe('H')
    expect(normalizeResult('AWAY WIN')).toBe('A')
    expect(normalizeResult('postponed')).toBeUndefined()
  })

  it('converts between results and scores', () => {
    expect(scoresForResult('H')).toEqual({ homeScore: 1, awayScore: 0 })
    expect(scoresForResult('X')).toEqual({ homeScore: 0, awayScore: 0 })
    expect(scoresForResult('A')).toEqual({ homeScore: 0, awayScore: 1 })
    expect(resultFromScores(2, 1)).toBe('H')
    expect(resultFromScores(1, 1)).toBe('X')
    expect(resultFromScores(0, 1)).toBe('A')
  })

  it('derives fixture result only for completed scored fixtures', () => {
    expect(fixtureResult({ status: 'FINISHED', homeScore: 3, awayScore: 1 })).toBe('H')
    expect(fixtureResult({ status: 'FINISHED', homeScore: 1, awayScore: undefined })).toBeUndefined()
    expect(fixtureResult({ status: 'LIVE', homeScore: 3, awayScore: 1 })).toBeUndefined()
  })

  it('applies result rows to matching fixtures', () => {
    expect(applyResultRowsToFixtures([fixture], [{ fixtureId: 'match-1', match: 'Mexico vs South Africa', result: 'A' }])).toEqual([
      { ...fixture, status: 'FINISHED', homeScore: 0, awayScore: 1 },
    ])
    expect(applyResultRowsToFixtures([fixture], [{ fixtureId: 'missing', match: 'Missing', result: 'H' }])).toEqual([fixture])
  })

  it('detects due fixtures using London date keys', () => {
    expect(isDueFixture(fixture, new Date('2026-06-12T10:00:00Z'))).toBe(true)
    expect(isDueFixture(fixture, new Date('2026-06-10T10:00:00Z'))).toBe(false)
  })

  it('parses final SportsDB events', () => {
    expect(isFinishedSportsDbEvent({ strStatus: 'Match Finished' })).toBe(true)
    expect(isFinishedSportsDbEvent({ strEventStatus: 'Final' })).toBe(true)
    expect(isFinishedSportsDbEvent({ strProgress: 'AET' })).toBe(true)
    expect(isFinishedSportsDbEvent(undefined)).toBe(false)
    expect(parseSportsDbResult({ strStatus: 'FT', intHomeScore: '1', intAwayScore: '2' })).toBe('A')
    expect(parseSportsDbResult({ strStatus: 'FT', intHomeScore: 'bad', intAwayScore: '2' })).toBeUndefined()
    expect(parseSportsDbResult({ strStatus: 'NS', intHomeScore: '1', intAwayScore: '2' })).toBeUndefined()
  })

  it('builds match labels', () => {
    expect(matchLabel(fixture)).toBe('Mexico vs South Africa')
  })
})
