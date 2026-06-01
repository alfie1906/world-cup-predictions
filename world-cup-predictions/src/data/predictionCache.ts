import type { Prediction } from '../types/domain'
import { londonDateKey } from '../utils/dates'

type StoredPredictionCache = {
  cachedAt: string
  lockDate: string
  players: string[]
  predictions: Prediction[]
  sourceUrl: string
  version: 1
}

type PredictionStorage = Pick<Storage, 'getItem' | 'setItem'>

export const PREDICTIONS_CACHE_KEY = 'lockedPredictions'

export const normalizePredictionLockDate = (value: unknown) => {
  const lockDate = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(lockDate) ? lockDate : undefined
}

export const isPredictionLockActive = (lockDate: unknown, today = new Date()) => {
  const normalizedLockDate = normalizePredictionLockDate(lockDate)
  return Boolean(normalizedLockDate && londonDateKey(today) >= normalizedLockDate)
}

const isPrediction = (value: unknown): value is Prediction => {
  const prediction = value as Prediction
  return (
    typeof prediction?.player === 'string' &&
    typeof prediction.fixtureId === 'string' &&
    ['H', 'X', 'A'].includes(prediction.pick)
  )
}

export const readLockedPredictions = (
  storage: PredictionStorage,
  sourceUrl: string,
  lockDate: string,
) => {
  try {
    const parsed = JSON.parse(storage.getItem(PREDICTIONS_CACHE_KEY) || 'null') as StoredPredictionCache | null

    if (
      parsed?.version !== 1 ||
      parsed.sourceUrl !== sourceUrl ||
      parsed.lockDate !== lockDate ||
      !Array.isArray(parsed.predictions) ||
      !Array.isArray(parsed.players) ||
      !parsed.predictions.every(isPrediction) ||
      !parsed.players.every((player) => typeof player === 'string')
    ) {
      return undefined
    }

    return { predictions: parsed.predictions, players: parsed.players }
  } catch {
    return undefined
  }
}

export const writeLockedPredictions = (
  storage: PredictionStorage,
  sourceUrl: string,
  lockDate: string,
  predictions: Prediction[],
  players: string[],
) => {
  try {
    storage.setItem(
      PREDICTIONS_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        lockDate,
        players,
        predictions,
        sourceUrl,
        version: 1,
      } satisfies StoredPredictionCache),
    )
  } catch {
    // localStorage can be unavailable in private browsing or test environments.
  }
}
