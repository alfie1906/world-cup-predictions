import { describe, expect, it } from 'vitest'
import type { Fixture, Prediction } from '../types/domain'
import {
  calculateTotals,
  groupFixturesByLondonDate,
  runningTotalsThroughDate,
  scoreRows,
  sortedDateKeys,
  sortedFixtures,
  votersByPick,
  votePercentage,
} from './standingsUtils'

const fixtures: Fixture[] = [
  {
    id: 'match-2',
    home: { id: 'fra', name: 'France' },
    away: { id: 'mex', name: 'Mexico' },
    kickoff: '2026-06-12T20:00:00Z',
    status: 'FINISHED',
    homeScore: 0,
    awayScore: 0,
  },
  {
    id: 'match-1',
    home: { id: 'mex', name: 'Mexico' },
    away: { id: 'rsa', name: 'South Africa' },
    kickoff: '2026-06-11T20:00:00Z',
    status: 'FINISHED',
    homeScore: 2,
    awayScore: 1,
  },
]
const predictions: Prediction[] = [
  { player: 'Alfie', fixtureId: 'match-1', pick: 'H' },
  { player: 'Grace', fixtureId: 'match-1', pick: 'A' },
  { player: 'Alfie', fixtureId: 'match-2', pick: 'X' },
  { player: 'Grace', fixtureId: 'match-2', pick: 'X' },
]

describe('standings utilities', () => {
  it('calculates totals and score rows', () => {
    expect(calculateTotals(['Alfie', 'Grace'], fixtures, predictions)).toEqual({ Alfie: 2, Grace: 1 })
    expect(calculateTotals(['Alfie'], [{ ...fixtures[0], status: 'SCHEDULED' }], predictions)).toEqual({ Alfie: 0 })
    expect(scoreRows({ Grace: 1, Alfie: 2 })).toEqual([
      { name: 'Alfie', score: 2 },
      { name: 'Grace', score: 1 },
    ])
    expect(scoreRows({ Zoe: 1, Alfie: 1, Empty: undefined as unknown as number })).toEqual([
      { name: 'Alfie', score: 1 },
      { name: 'Zoe', score: 1 },
      { name: 'Empty', score: 0 },
    ])
  })

  it('groups and sorts fixtures by London date', () => {
    const grouped = groupFixturesByLondonDate(fixtures)
    expect(sortedDateKeys(grouped)).toEqual(['2026-06-11', '2026-06-12'])
    expect(groupFixturesByLondonDate([fixtures[0], { ...fixtures[0], id: 'match-3' }])['2026-06-12']).toHaveLength(2)
    expect(sortedFixtures(fixtures).map((fixture) => fixture.id)).toEqual(['match-1', 'match-2'])
  })

  it('calculates running totals through a date', () => {
    expect(runningTotalsThroughDate(['Alfie', 'Grace'], groupFixturesByLondonDate(fixtures), predictions, '2026-06-11')).toEqual({
      Alfie: 1,
      Grace: 0,
    })
  })

  it('groups voters and percentages', () => {
    expect(votersByPick(predictions, 'match-1')).toEqual({ H: ['Alfie'], X: [], A: ['Grace'] })
    expect(votePercentage(1, 3)).toBe(33)
    expect(votePercentage(1, 0)).toBe(0)
  })
})
