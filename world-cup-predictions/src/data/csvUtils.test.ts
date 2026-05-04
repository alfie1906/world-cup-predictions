import { describe, expect, it } from 'vitest'
import type { Fixture } from '../types/domain'
import {
  buildFixtureColumnMap,
  looksLikeHtml,
  normalizePick,
  parsePredictionRows,
  parseResultRows,
  toCsvUrl,
} from './csvUtils'

const fixtures: Fixture[] = [
  {
    id: 'match-1',
    home: { id: 'mex', name: 'Mexico' },
    away: { id: 'rsa', name: 'South Africa' },
    kickoff: '2026-06-11T20:00:00Z',
    status: 'SCHEDULED',
  },
  {
    id: 'match-2',
    home: { id: 'civ', name: "Cote d'Ivoire" },
    away: { id: 'fra', name: 'France' },
    kickoff: '2026-06-12T20:00:00Z',
    status: 'SCHEDULED',
  },
]

describe('csv utilities', () => {
  it('converts published HTML Google Sheet URLs to CSV URLs', () => {
    expect(toCsvUrl('https://docs.google.com/spreadsheets/d/id/pubhtml?widget=true&headers=false')).toBe(
      'https://docs.google.com/spreadsheets/d/id/pub?output=csv',
    )
    expect(toCsvUrl('https://example.com/sheet?gid=1&output=csv')).toBe('https://example.com/sheet?gid=1&output=csv')
    expect(toCsvUrl('https://example.com/sheet')).toBe('https://example.com/sheet?output=csv')
  })

  it('detects HTML permission responses', () => {
    expect(looksLikeHtml('<!DOCTYPE html><html>nope</html>')).toBe(true)
    expect(looksLikeHtml('player,pick')).toBe(false)
    expect(looksLikeHtml(null)).toBe(false)
  })

  it('normalizes prediction picks', () => {
    expect(normalizePick('home win')).toBe('H')
    expect(normalizePick('H')).toBe('H')
    expect(normalizePick('2')).toBe('A')
    expect(normalizePick('A')).toBe('A')
    expect(normalizePick('draw')).toBe('X')
    expect(normalizePick('D')).toBe('X')
    expect(normalizePick('maybe')).toBeUndefined()
  })

  it('maps fixture columns by explicit lookup and tolerant team-name matching', () => {
    expect(buildFixtureColumnMap(['[Group A] Mexico vs South Africa', "Côte d'Ivoire v France"], fixtures, {})).toEqual({
      '[Group A] Mexico vs South Africa': 'match-1',
      "Côte d'Ivoire v France": 'match-2',
    })
    expect(buildFixtureColumnMap(['Custom Header'], fixtures, { 'Custom Header': 'match-1' })).toEqual({
      'Custom Header': 'match-1',
    })
    expect(buildFixtureColumnMap(['[Group A] Mexico vs South Africa'], fixtures, { 'Mexico vs South Africa': 'match-1' })).toEqual({
      '[Group A] Mexico vs South Africa': 'match-1',
    })
    expect(buildFixtureColumnMap(['Mystery Header', 'Mexico vs France'], fixtures, {})).toEqual({})
  })

  it('parses result rows', () => {
    expect(parseResultRows([{ 'Fixture ID': 'match-1', Match: 'Mexico vs South Africa', Result: 'away' }])).toEqual([
      { fixtureId: 'match-1', match: 'Mexico vs South Africa', result: 'A' },
    ])
    expect(parseResultRows([{ Match: 'Missing fixture', Result: 'home' }])).toEqual([])
  })

  it('parses wide prediction rows', () => {
    expect(
      parsePredictionRows(
        [
          { Player: '', 'Mexico vs South Africa': 'Home' },
          { Player: 'Alfie Grace', 'Mexico vs South Africa': 'Home', 'France vs Missing': 'Away' },
        ],
        ['Player', 'Mexico vs South Africa', 'France vs Missing'],
        fixtures,
        {},
      ),
    ).toEqual({
      predictions: [{ player: 'Alfie Grace', fixtureId: 'match-1', pick: 'H' }],
      players: ['Alfie Grace'],
    })
  })

  it('parses row-shaped prediction data', () => {
    expect(
      parsePredictionRows(
        [
          { player: 'Alfie', fixtureId: 'match-1', pick: 'X' },
          { Player: 'Grace', fixture: 'match-2', Prediction: 'away win' },
          { name: 'No Pick', matchId: 'match-3', prediction: '' },
          { email: 'email@example.com', match: 'match-4', prediction: 'home' },
        ],
        ['email', 'match', 'prediction'],
        [],
        {},
      ),
    ).toEqual({
      predictions: [
        { player: 'Alfie', fixtureId: 'match-1', pick: 'X' },
        { player: 'Grace', fixtureId: 'match-2', pick: 'A' },
        { player: 'email@example.com', fixtureId: 'match-4', pick: 'H' },
      ],
      players: ['Alfie', 'Grace', 'email@example.com'],
    })
  })
})
