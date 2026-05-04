import { createContext } from 'react'
import type { Fixture, FixturesLookup, Prediction } from '../types/domain'

export type DataContextValue = {
  fixtures: Fixture[]
  predictions: Prediction[]
  players: string[]
  loading: boolean
  loadFixtures: () => Promise<Fixture[]>
  loadError?: string | null
  fixturesLookup?: FixturesLookup
  fixturesLookupMap?: Record<string, string>
  getFixtureById?: (id: string) => Fixture | undefined
}

export const DataContext = createContext<DataContextValue | undefined>(undefined)
