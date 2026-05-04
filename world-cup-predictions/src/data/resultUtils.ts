import type { Fixture, MatchResult, ResultRow } from '../types/domain'
import { kickoffDateKey, londonDateKey } from '../utils/dates'

export const normalizeResult = (value: unknown): MatchResult | undefined => {
  const result = String(value || '').trim().toUpperCase()
  if (result === 'H' || result === 'HOME' || result === 'HOME WIN') return 'H'
  if (result === 'X' || result === 'D' || result === 'DRAW') return 'X'
  if (result === 'A' || result === 'AWAY' || result === 'AWAY WIN') return 'A'
  return undefined
}

export const scoresForResult = (result: MatchResult) => {
  if (result === 'H') return { homeScore: 1, awayScore: 0 }
  if (result === 'A') return { homeScore: 0, awayScore: 1 }
  return { homeScore: 0, awayScore: 0 }
}

export const resultFromScores = (homeScore: number, awayScore: number): MatchResult =>
  homeScore > awayScore ? 'H' : homeScore === awayScore ? 'X' : 'A'

export const fixtureResult = (fixture: Pick<Fixture, 'status' | 'homeScore' | 'awayScore'>) => {
  if (fixture.status !== 'FINISHED' || fixture.homeScore === undefined || fixture.awayScore === undefined) return undefined
  return resultFromScores(fixture.homeScore, fixture.awayScore)
}

export const matchLabel = (fixture: Fixture) => `${fixture.home.name} vs ${fixture.away.name}`

export const isDueFixture = (fixture: Fixture, today = new Date()) =>
  kickoffDateKey(fixture.kickoff) <= londonDateKey(today)

export const isFinishedSportsDbEvent = (event: unknown) => {
  const record = event as Record<string, unknown> | undefined
  const status = String(record?.strStatus || record?.strEventStatus || record?.strProgress || '').toUpperCase()
  return ['FT', 'AET', 'PEN', 'FINAL', 'MATCH FINISHED', 'GAME FINISHED'].some((value) => status.includes(value))
}

export const parseSportsDbResult = (event: unknown): MatchResult | undefined => {
  const record = event as Record<string, unknown> | undefined
  const homeScore = Number.parseInt(String(record?.intHomeScore), 10)
  const awayScore = Number.parseInt(String(record?.intAwayScore), 10)

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || !isFinishedSportsDbEvent(event)) return undefined

  return resultFromScores(homeScore, awayScore)
}

export const applyResultRowsToFixtures = (baseFixtures: Fixture[], resultRows: ResultRow[]) => {
  const byFixtureId = new Map(resultRows.map((row) => [row.fixtureId, row.result]))

  return baseFixtures.map((fixture) => {
    const result = byFixtureId.get(fixture.id)
    if (!result) return fixture

    return {
      ...fixture,
      status: 'FINISHED' as const,
      ...scoresForResult(result),
    }
  })
}
