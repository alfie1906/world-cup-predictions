import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import type { Fixture, FixturesLookup, Prediction, ResultRow } from '../types/domain'
import { DataContext } from './DataContextObject'
import { parsePredictionRows, parseResultRows, toCsvUrl, looksLikeHtml } from './csvUtils'
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
import {
  isPredictionLockActive,
  normalizePredictionLockDate,
  readLockedPredictions,
  writeLockedPredictions,
} from './predictionCache'

type FixtureLoadResult = {
  fixtures: Fixture[]
  lookup: FixturesLookup
  lookupMap: Record<string, string>
}

type PredictionLoadResult = {
  players: string[]
  predictions: Prediction[]
}

const defaultLookup = { columns: [] }

const parseCsv = (csv: string) => Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: true })

const withCacheBuster = (url: string) => {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_=${Date.now()}`
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [playersState, setPlayersState] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fixturesLookup, setFixturesLookup] = useState<FixturesLookup>(defaultLookup)
  const [fixturesLookupMap, setFixturesLookupMap] = useState<Record<string, string>>({})

  const loadFixtureData = async (): Promise<FixtureLoadResult> => {
    const baseUrl = import.meta.env.BASE_URL || '/'
    const apiUrl = import.meta.env.VITE_FIXTURES_API

    if (apiUrl) {
      const response = await axios.get(apiUrl)
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

      return loaded.fixtures
    } catch (error) {
      console.error('Failed to load fixtures', error)
      setLoadError('Failed to load fixtures')
      return []
    }
  }

  const loadResultsFromCsv = async (csvUrl: string): Promise<ResultRow[]> => {
    try {
      const response = await axios.get(withCacheBuster(toCsvUrl(csvUrl)))
      const csv = response.data

      if (looksLikeHtml(csv)) {
        console.warn('Results sheet returned HTML instead of CSV. Check the published CSV URL.')
        return []
      }

      return parseResultRows(parseCsv(String(csv || '')).data)
    } catch (error) {
      console.warn('Failed to fetch results CSV', error)
      return []
    }
  }

  const writeResultsRows = async (rows: ResultRow[]) => {
    const webAppUrl = import.meta.env.VITE_RESULTS_WEB_APP_URL
    if (!webAppUrl || rows.length === 0) return

    try {
      await fetch(webAppUrl as string, {
        body: JSON.stringify({ rows }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        method: 'POST',
      })
    } catch (error) {
      console.warn('Failed to write results rows', error)
    }
  }

  const fetchSportsDbResult = async (fixture: Fixture): Promise<ResultRow | undefined> => {
    const apiKey = import.meta.env.VITE_THESPORTSDB_APIKEY || '123'

    try {
      const response = await axios.get(`https://www.thesportsdb.com/api/v1/json/${apiKey}/lookupevent.php`, {
        params: { _: Date.now(), id: fixture.id },
      })
      const events = response.data?.events
      const result = parseSportsDbResult(Array.isArray(events) ? events[0] : undefined)

      return result ? { fixtureId: fixture.id, match: matchLabel(fixture), result } : undefined
    } catch (error) {
      console.warn(`Failed to check result for fixture ${fixture.id}`, error)
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

  const loadPredictionsFromCsv = async (
    csvUrl: string,
    fixturesForMapping: Fixture[],
    lookupMapForMapping: Record<string, string>,
  ): Promise<PredictionLoadResult | undefined> => {
    try {
      const response = await axios.get(csvUrl)
      const csv = response.data
      const contentType = (response.headers?.['content-type'] || response.headers?.['Content-Type']) as string | undefined

      if (looksLikeHtml(csv) || contentType?.includes('text/html')) {
        setLoadError('Failed to load CSV: ensure the sheet is published to the web as CSV.')
        return undefined
      }

      const parsed = parseCsv(String(csv || ''))
      const fields = parsed.meta.fields || Object.keys(parsed.data[0] || {})
      const { predictions: parsedPredictions, players } = parsePredictionRows(
        parsed.data,
        fields,
        fixturesForMapping,
        lookupMapForMapping,
      )

      setPredictions(parsedPredictions)
      if (players.length > 0) setPlayersState(players)
      setLoadError(
        parsedPredictions.length === 0
          ? 'No predictions parsed from CSV. Check the sheet headers match fixture columns and the sheet is published as CSV.'
          : null,
      )

      return { predictions: parsedPredictions, players }
    } catch {
      setLoadError('Failed to fetch CSV. Check the URL and that the sheet is published to the web as CSV.')
      return undefined
    }
  }

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)

      try {
        const loaded = await loadFixtureData()
        let currentFixtures = loaded.fixtures
        const resultsCsvUrl = import.meta.env.VITE_RESULTS_CSV

        setFixturesLookup(loaded.lookup)
        setFixturesLookupMap(loaded.lookupMap)

        if (resultsCsvUrl) {
          const refreshedResults = await refreshDueResults(
            currentFixtures,
            await loadResultsFromCsv(resultsCsvUrl as string),
          )
          currentFixtures = applyResultRowsToFixtures(currentFixtures, refreshedResults)
        }

        setFixtures(currentFixtures)

        const csvUrl = import.meta.env.VITE_SHEETS_CSV
        const rawPredictionLockDate = String(import.meta.env.VITE_PREDICTIONS_LOCK_DATE || '').trim()
        const predictionLockDate = normalizePredictionLockDate(rawPredictionLockDate)
        const predictionLockActive = predictionLockDate ? isPredictionLockActive(predictionLockDate) : false

        if (rawPredictionLockDate && !predictionLockDate) {
          console.warn('Ignoring invalid VITE_PREDICTIONS_LOCK_DATE. Expected YYYY-MM-DD.')
        }

        if (csvUrl) {
          const predictionCsvUrl = csvUrl as string
          const cachedPredictions = predictionLockActive && predictionLockDate
            ? readLockedPredictions(localStorage, predictionCsvUrl, predictionLockDate)
            : undefined

          if (cachedPredictions) {
            setPredictions(cachedPredictions.predictions)
            if (cachedPredictions.players.length > 0) setPlayersState(cachedPredictions.players)
            setLoadError(null)
          } else {
            const loadedPredictions = await loadPredictionsFromCsv(predictionCsvUrl, currentFixtures, loaded.lookupMap)

            if (loadedPredictions?.predictions.length && predictionLockActive && predictionLockDate) {
              writeLockedPredictions(
                localStorage,
                predictionCsvUrl,
                predictionLockDate,
                loadedPredictions.predictions,
                loadedPredictions.players,
              )
            }
          }
        }
      } catch (error) {
        console.error('Failed to load app data', error)
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
