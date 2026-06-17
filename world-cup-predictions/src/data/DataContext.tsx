import React, { useEffect, useState } from 'react'
import axios from 'axios'
import type { Fixture, FixturesLookup, Prediction, ResultRow } from '../types/domain'
import { DataContext } from './DataContextObject'

import {
  applyResultRowsToFixtures,
  isDueFixture,
  matchLabel,
  parseSportsDbResult,
} from './resultUtils'
import {
  assetUrl,
  buildLookupFromFixtures,
  enrichFixturesWithTeams,
  normalizeApiFixtures,
  parseFixturesLookup,
} from './fixtureUtils'

type FixtureLoadResult = {
  fixtures: Fixture[]
  lookup: FixturesLookup
  lookupMap: Record<string, string>
}

const defaultLookup = { columns: [] }

const getStoredLookup = (): FixturesLookup => {
  try {
    const raw = localStorage.getItem('fixturesLookup')
    return raw ? JSON.parse(raw) : defaultLookup
  } catch {
    return defaultLookup
  }
}

const storeLookup = (lookup: FixturesLookup) => {
  try {
    localStorage.setItem('fixturesLookup', JSON.stringify(lookup))
  } catch {
    // localStorage can be unavailable in private browsing or test environments.
  }
}

// Predictions and results are now retrieved via the server API (Vercel Blob backed).

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [playersState, setPlayersState] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fixturesLookup, setFixturesLookup] = useState<FixturesLookup>(getStoredLookup)
  const [fixturesLookupMap, setFixturesLookupMap] = useState<Record<string, string>>({})

  const loadFixtureData = async (): Promise<FixtureLoadResult> => {
    const baseUrl = import.meta.env.BASE_URL || '/'
    const apiUrl = import.meta.env.VITE_FIXTURES_API

    if (apiUrl) {
      const isExternal = /^https?:\/\//i.test(apiUrl)
      const response = isExternal
        ? await axios.get(apiUrl)
        : await axios.get(apiUrl, { headers: { 'Cache-Control': 'no-cache' } })
      const apiFixtures = normalizeApiFixtures(response.data)

      if (apiFixtures.length > 0) {
        const { lookup, map } = buildLookupFromFixtures(apiFixtures)
        return { fixtures: apiFixtures, lookup, lookupMap: map }
      }
    }

    const fixturesResponse = await axios.get(assetUrl(baseUrl, 'fixtures.json'))
    const localFixtures = Array.isArray(fixturesResponse.data) ? fixturesResponse.data as Fixture[] : []
    const [teamsResponse, lookupResponse] = await Promise.allSettled([
      axios.get(assetUrl(baseUrl, 'teams.json')),
      axios.get(assetUrl(baseUrl, 'fixtures-lookup.json')),
    ])
    const enrichedFixtures = teamsResponse.status === 'fulfilled'
      ? enrichFixturesWithTeams(localFixtures, teamsResponse.value.data)
      : localFixtures
    const generatedLookup = buildLookupFromFixtures(enrichedFixtures)
    const parsedLookup = lookupResponse.status === 'fulfilled'
      ? parseFixturesLookup(lookupResponse.value.data)
      : { lookup: defaultLookup, map: {} }
    const lookup = parsedLookup.lookup.columns.length > 0 ? parsedLookup.lookup : generatedLookup.lookup

    return {
      fixtures: enrichedFixtures,
      lookup,
      lookupMap: { ...generatedLookup.map, ...parsedLookup.map },
    }
  }

  const loadFixtures = async () => {
    try {
      const loaded = await loadFixtureData()

      setFixtures(loaded.fixtures)
      setFixturesLookup(loaded.lookup)
      setFixturesLookupMap(loaded.lookupMap)
      storeLookup(loaded.lookup)

      return loaded.fixtures
    } catch (error) {
      setLoadError('Failed to load fixtures')
      return []
    }
  }

  const loadResultsFromApi = async (apiUrl: string): Promise<ResultRow[]> => {
    try {
      const isExternal = /^https?:\/\//i.test(apiUrl)
      // For external public blob URLs, append a cache-busting query param so
      // the browser fetches the latest file instead of using a disk cache.
      const requestUrl = isExternal
        ? (() => {
            try {
              const u = new URL(apiUrl)
              u.searchParams.append('_', Date.now().toString())
              return u.toString()
            } catch (e) {
              // Fallback: naive append if URL constructor fails for any reason.
              return apiUrl + (apiUrl.includes('?') ? '&' : '?') + `_=${Date.now()}`
            }
          })()
        : apiUrl

      // Avoid custom headers on cross-origin requests to prevent CORS preflight
      // failures; do a plain GET for external blob URLs.
      const response = isExternal
        ? await axios.get(requestUrl)
        : await axios.get(apiUrl, { headers: { 'Cache-Control': 'no-cache' } })
      let data = response.data

      // Accept multiple shapes: plain array, { rows: [...] }, or object with first array-valued property
      let parsedArray: unknown[] | undefined
      if (Array.isArray(data)) parsedArray = data
      else if (data && Array.isArray((data as any).rows)) parsedArray = (data as any).rows
      else if (data && typeof data === 'object') {
        for (const v of Object.values(data)) {
          if (Array.isArray(v)) {
            parsedArray = v as unknown[]
            break
          }
        }
      }

      
      if (!parsedArray) return []
      return parsedArray as ResultRow[]
    } catch (error) {
      return []
    }
  }

  const writeResultsRows = async (rows: ResultRow[]) => {
    if (rows.length === 0) return

    try {
      // POST to the local server API which handles merging and writing to Blob
      await fetch('/api/results', {
        body: JSON.stringify({ rows }),
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        method: 'POST',
      })
    } catch (error) {
    }
  }

  const fetchSportsDbResult = async (fixture: Fixture): Promise<ResultRow | undefined> => {
    const apiKey = import.meta.env.VITE_THESPORTSDB_APIKEY || '123'

    try {
      const response = await axios.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookupevent.php`, {
        params: { id: fixture.id },
      })
      const events = response.data?.events
      const result = parseSportsDbResult(Array.isArray(events) ? events[0] : undefined)

      return result ? { fixtureId: fixture.id, match: matchLabel(fixture), result } : undefined
    } catch (error) {
      return undefined
    }
  }

  const refreshDueResults = async (baseFixtures: Fixture[], resultRows: ResultRow[]) => {
    const rowsByFixtureId = new Map(resultRows.map((row) => [row.fixtureId, row]))
    const missingDueFixtures = baseFixtures.filter(
      (fixture) => isDueFixture(fixture) && !rowsByFixtureId.get(fixture.id)?.result,
    )
    const freshRows: ResultRow[] = []

    for (const fixture of missingDueFixtures) {
      const resultRow = await fetchSportsDbResult(fixture)
      if (resultRow) freshRows.push(resultRow)
    }

    if (freshRows.length > 0) await writeResultsRows(freshRows)

    return [...resultRows.filter((row) => !freshRows.some((fresh) => fresh.fixtureId === row.fixtureId)), ...freshRows]
  }

  const loadPredictionsFromApi = async (apiUrl: string, fixturesForMapping: Fixture[], lookupMapForMapping: Record<string, string>) => {
    try {
      const response = await axios.get(apiUrl)
      // Debug: log raw response so we can inspect the shape returned by the API
      
      let data = response.data

      // Accept multiple shapes: plain array, { rows: [...] }, or an object
      // whose first array-valued property is the predictions array.
      let parsedArray: unknown[] | undefined
      if (Array.isArray(data)) parsedArray = data
      else if (data && Array.isArray((data as any).rows)) parsedArray = (data as any).rows
      else if (data && typeof data === 'object') {
        // Find first array among the object's values
        for (const v of Object.values(data)) {
          if (Array.isArray(v)) {
            parsedArray = v as unknown[]
            break
          }
        }
      }

      if (!parsedArray) {
        setLoadError('Predictions API returned unexpected data')
        return
      }

      const parsedPredictions = parsedArray as Prediction[]
      setPredictions(parsedPredictions)
      const players = Array.from(new Set(parsedPredictions.map((p) => p.player).filter(Boolean)))
      if (players.length > 0) setPlayersState(players)
      setLoadError(parsedPredictions.length === 0 ? 'No predictions returned from API.' : null)
    } catch (err) {
      setLoadError('Failed to fetch predictions from API')
    }
  }

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)

      try {
        const loaded = await loadFixtureData()
        let currentFixtures = loaded.fixtures
        const resultsApiUrl = import.meta.env.VITE_RESULTS_API || '/api/results'

        setFixturesLookup(loaded.lookup)
        setFixturesLookupMap(loaded.lookupMap)
        storeLookup(loaded.lookup)

        // Load results from the JSON API (Vercel Blob backed). Refresh any
        // fixtures that are due and persist new rows via the webapp endpoint.
        // If a public blob URL is provided, fetch that directly from the
        // browser (no proxy). Otherwise, when running locally prefer the dev
        // blob proxy unless an explicit API url was provided.
        // In development prefer the local API so POSTs to `/api/results`
        // update the UI immediately. Only use the public blob URL when
        // not in dev mode.
        const publicResultsUrl = import.meta.env.DEV ? undefined : import.meta.env.VITE_RESULTS_PUBLIC_URL
        const useBlobProxy = Boolean(import.meta.env.BLOB_STORE_ID || import.meta.env.VITE_BLOB_STORE_ID)
        const resultsRows = await loadResultsFromApi(
          (publicResultsUrl as string) || (useBlobProxy ? '/__blob/results' : (resultsApiUrl as string)),
        )
        
        const refreshedResults = await refreshDueResults(currentFixtures, resultsRows)
        currentFixtures = applyResultRowsToFixtures(currentFixtures, refreshedResults)

        setFixtures(currentFixtures)

        // Load predictions from the JSON API (Vercel Blob backed).
        const publicPredictionsUrl = import.meta.env.DEV ? undefined : import.meta.env.VITE_PREDICTIONS_PUBLIC_URL
        const useBlobProxyPred = Boolean(import.meta.env.BLOB_STORE_ID || import.meta.env.VITE_BLOB_STORE_ID)
        let predictionsApiUrl = import.meta.env.VITE_PREDICTIONS_API || '/api/predictions'
        if (publicPredictionsUrl) predictionsApiUrl = publicPredictionsUrl as string
        else if (useBlobProxyPred) predictionsApiUrl = '/__blob/predictions'

        await loadPredictionsFromApi(predictionsApiUrl as string, currentFixtures, loaded.lookupMap)
      } catch (error) {
        setLoadError('Failed to load app data')
      } finally {
        setIsLoading(false)
      }
    })()
    // Initial data load is intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DataContext.Provider
      value={{
        fixtures,
        predictions,
        players: playersState,
        loading: isLoading,
        loadFixtures,
        loadError,
        fixturesLookup,
        fixturesLookupMap,
        getFixtureById: (id: string) => fixtures.find((fixture) => fixture.id === id),
      }}
    >
      {children}
    </DataContext.Provider>
  )
}
