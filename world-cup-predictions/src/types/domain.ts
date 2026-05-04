export type Team = {
  id: string
  name: string
  code?: string
  flag?: string
}

export type MatchResult = 'H' | 'X' | 'A'

export type FixtureStatus = 'SCHEDULED' | 'FINISHED' | 'LIVE' | 'NOT STARTED'

export type Fixture = {
  id: string
  home: Team
  away: Team
  kickoff: string
  status: FixtureStatus
  homeScore?: number
  awayScore?: number
}

export type Prediction = {
  player: string
  fixtureId: string
  pick: MatchResult
}

export type ResultRow = {
  fixtureId: string
  match: string
  result?: MatchResult
}

export type FixturesLookup = {
  columns: string[]
}
