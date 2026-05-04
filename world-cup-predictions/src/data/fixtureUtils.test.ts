import { describe, expect, it } from 'vitest'
import type { Fixture } from '../types/domain'
import {
  assetUrl,
  buildLookupFromFixtures,
  enrichFixturesWithTeams,
  extractFixtureArray,
  normalizeApiFixtures,
  parseFixturesLookup,
} from './fixtureUtils'

const fixtures: Fixture[] = [
  {
    id: 'match-1',
    home: { id: 'mex', name: 'Mexico' },
    away: { id: 'rsa', name: 'South Africa' },
    kickoff: '2026-06-11T20:00:00Z',
    status: 'SCHEDULED',
  },
]

describe('fixture utilities', () => {
  it('builds public asset URLs from Vite base URLs', () => {
    expect(assetUrl('/', '/fixtures.json')).toBe('/fixtures.json')
    expect(assetUrl('/world-cup', 'fixtures.json')).toBe('/world-cup/fixtures.json')
    expect(assetUrl('/world-cup/', 'fixtures.json')).toBe('/world-cup/fixtures.json')
    expect(assetUrl('', 'fixtures.json')).toBe('/fixtures.json')
  })

  it('extracts fixture arrays from supported API response shapes', () => {
    expect(extractFixtureArray([{ id: 1 }])).toEqual([{ id: 1 }])
    expect(extractFixtureArray({ result: [{ id: 1 }] })).toEqual([{ id: 1 }])
    expect(extractFixtureArray({ data: [{ id: 2 }] })).toEqual([{ id: 2 }])
    expect(extractFixtureArray({ nope: [] })).toEqual([])
  })

  it('normalizes API fixtures', () => {
    expect(
      normalizeApiFixtures([
        {
          match_id: 'match-1',
          home_team: 'Mexico',
          away_team: 'South Africa',
          utcDate: '2026-06-11T20:00:00Z',
          match_status: 'FINISHED',
          home_score: 2,
          away_score: 1,
        },
      ]),
    ).toEqual([
      {
        id: 'match-1',
        home: { id: 'mexico', name: 'Mexico' },
        away: { id: 'south africa', name: 'South Africa' },
        kickoff: '2026-06-11T20:00:00Z',
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
      },
    ])
    expect(normalizeApiFixtures([{ home: 'Home', away: 'Away' }])[0]).toMatchObject({
      id: '1',
      home: { id: 'home', name: 'Home' },
      away: { id: 'away', name: 'Away' },
      status: 'SCHEDULED',
    })
    expect(normalizeApiFixtures([{ home: 'Home', away: 'Away', score: { fullTime: { home: 0, away: 0 } } }])[0]).toMatchObject({
      homeScore: 0,
      awayScore: 0,
    })
  })

  it('enriches fixtures with team metadata when names match', () => {
    expect(
      enrichFixturesWithTeams(fixtures, {
        teams: [{ id: 'mx', name: 'Mexico', code: 'MEX', flag: 'mex.svg' }],
      }),
    ).toEqual([
      {
        ...fixtures[0],
        home: { ...fixtures[0].home, id: 'mx', code: 'MEX', flag: 'mex.svg' },
      },
    ])
    expect(enrichFixturesWithTeams(fixtures, { teams: [] })).toBe(fixtures)
    expect(enrichFixturesWithTeams(fixtures, { teams: [{ name: 'South Africa', code: 'RSA' }] })[0].away).toEqual({
      ...fixtures[0].away,
      code: 'RSA',
      flag: undefined,
    })
  })

  it('builds and parses fixture lookup data', () => {
    expect(buildLookupFromFixtures(fixtures)).toEqual({
      lookup: { columns: ['Mexico vs South Africa'] },
      map: { 'Mexico vs South Africa': 'match-1' },
    })
    expect(parseFixturesLookup([{ column: 'Mexico vs South Africa', fixtureId: 'match-1' }])).toEqual({
      lookup: { columns: ['Mexico vs South Africa'] },
      map: { 'Mexico vs South Africa': 'match-1' },
    })
    expect(parseFixturesLookup({ columns: ['Mexico vs South Africa'] })).toEqual({
      lookup: { columns: ['Mexico vs South Africa'] },
      map: {},
    })
    expect(parseFixturesLookup([{ column: '', fixtureId: '' }])).toEqual({
      lookup: { columns: [] },
      map: {},
    })
    expect(parseFixturesLookup(null)).toEqual({
      lookup: { columns: [] },
      map: {},
    })
  })
})
