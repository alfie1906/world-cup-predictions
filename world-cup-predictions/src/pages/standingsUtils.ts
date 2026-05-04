import type { Fixture, MatchResult, Prediction } from '../types/domain'
import { kickoffDateKey, parseUtcKickoff } from '../utils/dates'
import { fixtureResult } from '../data/resultUtils'

export type PlayerScore = {
  name: string
  score: number
}

export const calculateTotals = (players: string[], fixtures: Fixture[], predictions: Prediction[]) => {
  const totals = Object.fromEntries(players.map((player) => [player, 0]))

  fixtures.forEach((fixture) => {
    const actual = fixtureResult(fixture)
    if (!actual) return

    predictions
      .filter((prediction) => prediction.fixtureId === fixture.id)
      .forEach((prediction) => {
        if (prediction.pick === actual) totals[prediction.player] = (totals[prediction.player] || 0) + 1
      })
  })

  return totals
}

export const scoreRows = (totals: Record<string, number>): PlayerScore[] =>
  Object.keys(totals)
    .map((player) => ({ name: player, score: totals[player] || 0 }))
    .sort((first, second) => second.score - first.score || first.name.localeCompare(second.name))

export const groupFixturesByLondonDate = (fixtures: Fixture[]) =>
  fixtures.reduce<Record<string, Fixture[]>>((groups, fixture) => {
    const key = kickoffDateKey(fixture.kickoff)
    return { ...groups, [key]: [...(groups[key] || []), fixture] }
  }, {})

export const sortedDateKeys = (fixturesByDate: Record<string, Fixture[]>) =>
  Object.keys(fixturesByDate).sort((first, second) => new Date(first).getTime() - new Date(second).getTime())

export const sortedFixtures = (fixtures: Fixture[]) =>
  [...fixtures].sort((first, second) => parseUtcKickoff(first.kickoff).getTime() - parseUtcKickoff(second.kickoff).getTime())

export const runningTotalsThroughDate = (
  players: string[],
  fixturesByDate: Record<string, Fixture[]>,
  predictions: Prediction[],
  date: string,
) => {
  const dateKeys = sortedDateKeys(fixturesByDate).filter((dateKey) => new Date(dateKey) <= new Date(date))
  const fixtures = dateKeys.flatMap((dateKey) => fixturesByDate[dateKey])

  return calculateTotals(players, fixtures, predictions)
}

export const votersByPick = (predictions: Prediction[], fixtureId: string) => {
  const byPick: Record<MatchResult, string[]> = { H: [], X: [], A: [] }

  predictions
    .filter((prediction) => prediction.fixtureId === fixtureId)
    .forEach((prediction) => byPick[prediction.pick].push(prediction.player))

  return byPick
}

export const votePercentage = (votes: number, totalVotes: number) =>
  totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100)
