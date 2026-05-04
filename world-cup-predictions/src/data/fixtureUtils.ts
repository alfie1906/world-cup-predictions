import type { Fixture, FixturesLookup, Team } from '../types/domain'

type ApiFixture = Record<string, unknown>
type TeamMetadata = Team & Record<string, unknown>

const readNested = (value: unknown, key: string) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined

const stringValue = (value: unknown, fallback = '') => {
  const text = String(value || '').trim()
  return text || fallback
}

export const assetUrl = (baseUrl: string, path: string) => {
  const base = baseUrl || '/'
  const cleanPath = path.replace(/^\//, '')
  return base.endsWith('/') ? `${base}${cleanPath}` : `${base}/${cleanPath}`
}

export const extractFixtureArray = (data: unknown) => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.result)) return record.result
    if (Array.isArray(record.data)) return record.data
  }

  return []
}

export const normalizeApiFixtures = (data: unknown): Fixture[] =>
  extractFixtureArray(data).map((fixture, index) => {
    const item = fixture as ApiFixture
    const home = readNested(item.home, 'name') || item.home_team || item.home || ''
    const away = readNested(item.away, 'name') || item.away_team || item.away || ''
    const homeId = readNested(item.home, 'id') || String(item.home_team || home).toLowerCase() || 'home'
    const awayId = readNested(item.away, 'id') || String(item.away_team || away).toLowerCase() || 'away'
    const fullTimeScore = readNested(item.score, 'fullTime') as Record<string, unknown> | undefined

    return {
      id: stringValue(item.id || item.match_id, String(index + 1)),
      home: { id: stringValue(homeId, 'home'), name: stringValue(home) },
      away: { id: stringValue(awayId, 'away'), name: stringValue(away) },
      kickoff: stringValue(item.kickoff || item.utcDate || item.date || item.kickoff_time, new Date().toISOString()),
      status: stringValue(item.status || item.match_status, 'SCHEDULED') as Fixture['status'],
      homeScore: (item.homeScore ?? fullTimeScore?.home ?? item.home_score) as number | undefined,
      awayScore: (item.awayScore ?? fullTimeScore?.away ?? item.away_score) as number | undefined,
    }
  })

export const enrichFixturesWithTeams = (fixtures: Fixture[], teamsPayload: unknown) => {
  const teams = teamsPayload && typeof teamsPayload === 'object' && Array.isArray((teamsPayload as Record<string, unknown>).teams)
    ? (teamsPayload as { teams: TeamMetadata[] }).teams
    : []

  if (teams.length === 0) return fixtures

  const teamsByName = new Map(teams.filter((team) => team?.name).map((team) => [team.name.toLowerCase(), team]))

  return fixtures.map((fixture) => {
    const homeMeta = teamsByName.get(fixture.home.name.toLowerCase())
    const awayMeta = teamsByName.get(fixture.away.name.toLowerCase())

    return {
      ...fixture,
      home: homeMeta ? { ...fixture.home, id: homeMeta.id || fixture.home.id, code: homeMeta.code, flag: homeMeta.flag } : fixture.home,
      away: awayMeta ? { ...fixture.away, id: awayMeta.id || fixture.away.id, code: awayMeta.code, flag: awayMeta.flag } : fixture.away,
    }
  })
}

export const buildLookupFromFixtures = (fixtures: Fixture[]) => {
  const columns = fixtures.map((fixture) => `${fixture.home.name} vs ${fixture.away.name}`)
  const map = Object.fromEntries(fixtures.map((fixture, index) => [columns[index], fixture.id]))

  return { lookup: { columns }, map }
}

export const parseFixturesLookup = (data: unknown): { lookup: FixturesLookup; map: Record<string, string> } => {
  if (Array.isArray(data)) {
    const rows = data as Record<string, unknown>[]
    const columns = rows.map((row) => String(row.column || '')).filter(Boolean)
    const map: Record<string, string> = {}

    rows.forEach((row) => {
      const column = String(row.column || '').trim()
      const fixtureId = String(row.fixtureId || '').trim()
      if (column && fixtureId) map[column] = fixtureId
    })

    return { lookup: { columns }, map }
  }

  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).columns)) {
    return { lookup: { columns: (data as { columns: string[] }).columns }, map: {} }
  }

  return { lookup: { columns: [] }, map: {} }
}
