import type { Fixture, Prediction, ResultRow } from '../types/domain'
import { normalizeText } from '../utils/text'
import { normalizeResult } from './resultUtils'

export const toCsvUrl = (url: string) =>
  (() => {
    const [base, query = ''] = url.replace('/pubhtml', '/pub').split('?')
    const params = new URLSearchParams(query)

    params.delete('widget')
    params.delete('headers')
    params.set('output', 'csv')

    return `${base}?${params.toString()}`
  })()

export const looksLikeHtml = (value: unknown) =>
  typeof value === 'string' && /<html|<head|DOCTYPE html|You need access/i.test(value)

export const normalizePick = (value: unknown) => {
  const pick = String(value || '').trim().toUpperCase()
  if (pick === 'H' || pick === 'HOME' || pick === 'HOME WIN' || pick === '1' || /HOME\s*WIN/i.test(pick)) return 'H'
  if (pick === 'A' || pick === 'AWAY' || pick === 'AWAY WIN' || pick === '2' || /AWAY\s*WIN/i.test(pick)) return 'A'
  if (pick === 'X' || pick === 'D' || pick === 'DRAW' || /DRAW/i.test(pick)) return 'X'
  return undefined
}

export const buildFixtureColumnMap = (
  fixtureColumns: string[],
  fixtures: Fixture[],
  fixturesLookupMap: Record<string, string>,
) => {
  const colToFixtureId: Record<string, string> = {}

  fixtureColumns.forEach((column) => {
    const cleaned = column.replace(/^\[.*?\]\s*/, '')
    const mappedFixtureId = fixturesLookupMap[column] || fixturesLookupMap[cleaned]
    if (mappedFixtureId) {
      colToFixtureId[column] = mappedFixtureId
      return
    }

    const parts = cleaned
      .split(/\s+vs\s+|\s+v\s+|\s+-\s+/i)
      .map((part) => part.trim())
      .filter(Boolean)

    if (parts.length < 2) return

    const [firstTeam, secondTeam] = parts.map(normalizeText)
    const match = fixtures.find((fixture) => {
      const home = normalizeText(fixture.home.name)
      const away = normalizeText(fixture.away.name)
      return (home.includes(firstTeam) && away.includes(secondTeam)) || (home.includes(secondTeam) && away.includes(firstTeam))
    })

    if (match) colToFixtureId[column] = match.id
  })

  return colToFixtureId
}

export const parseResultRows = (rows: Record<string, unknown>[]) =>
  rows
    .map((row): ResultRow | undefined => {
      const fixtureId = String(row['Fixture ID'] || row.fixtureId || row.fixture || row['fixture id'] || '').trim()
      const match = String(row.Match || row.match || '').trim()
      const result = normalizeResult(row.Result || row.result)

      if (!fixtureId) return undefined
      return { fixtureId, match, result }
    })
    .filter((row): row is ResultRow => Boolean(row))

export const parsePredictionRows = (
  rows: Record<string, unknown>[],
  fields: string[],
  fixtures: Fixture[],
  fixturesLookupMap: Record<string, string>,
) => {
  const predictions: Prediction[] = []
  const players = new Set<string>()
  const playerField = fields.find((field) => /player|name/i.test(field)) || fields.find((field) => /email/i.test(field)) || fields[0]
  const fixtureColumns = fields.filter((field) => field !== playerField)
  const hasFixtureHeaders = fixtureColumns.some((header) => /\bvs?\b/i.test(header) || / vs /i.test(header))

  if (hasFixtureHeaders && fixtures.length > 0) {
    const colToFixtureId = buildFixtureColumnMap(fixtureColumns, fixtures, fixturesLookupMap)

    rows.forEach((row) => {
      const player = String(row[playerField] || '').trim()
      if (!player) return

      fixtureColumns.forEach((column) => {
        const fixtureId = colToFixtureId[column]
        const pick = normalizePick(row[column])
        if (!fixtureId || !pick) return

        predictions.push({ player, fixtureId, pick })
        players.add(player)
      })
    })
  } else {
    rows.forEach((row) => {
      const player = String(row.player || row.Player || row.name || row.Name || row.email || row.Email || '').trim()
      const fixtureId = String(row.fixtureId || row.fixture || row.matchId || row.match || '').trim()
      const pick = normalizePick(row.pick || row.Pick || row.prediction || row.Prediction)

      if (!player || !fixtureId || !pick) return

      predictions.push({ player, fixtureId, pick })
      players.add(player)
    })
  }

  return { predictions, players: Array.from(players) }
}
