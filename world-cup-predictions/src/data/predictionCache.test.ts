import { describe, expect, it } from 'vitest'
import {
  isPredictionLockActive,
  PREDICTIONS_CACHE_KEY,
  readLockedPredictions,
  writeLockedPredictions,
} from './predictionCache'

const createStorage = () => {
  const items = new Map<string, string>()

  return {
    getItem: (key: string) => items.get(key) || null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
  }
}

describe('prediction cache', () => {
  it('activates on and after the London lock date', () => {
    expect(isPredictionLockActive('2026-06-11', new Date('2026-06-10T22:30:00Z'))).toBe(false)
    expect(isPredictionLockActive('2026-06-11', new Date('2026-06-10T23:30:00Z'))).toBe(true)
    expect(isPredictionLockActive('2026-06-11', new Date('2026-06-12T10:00:00Z'))).toBe(true)
    expect(isPredictionLockActive('', new Date('2026-06-12T10:00:00Z'))).toBe(false)
    expect(isPredictionLockActive('11/06/2026', new Date('2026-06-12T10:00:00Z'))).toBe(false)
  })

  it('stores and reads predictions only for the matching source and lock date', () => {
    const storage = createStorage()
    const predictions = [{ player: 'Alfie', fixtureId: 'match-1', pick: 'H' as const }]

    writeLockedPredictions(storage, 'sheet-a', '2026-06-11', predictions, ['Alfie'])

    expect(readLockedPredictions(storage, 'sheet-a', '2026-06-11')).toEqual({ predictions, players: ['Alfie'] })
    expect(readLockedPredictions(storage, 'sheet-b', '2026-06-11')).toBeUndefined()
    expect(readLockedPredictions(storage, 'sheet-a', '2026-06-12')).toBeUndefined()
  })

  it('ignores corrupt cache payloads', () => {
    const storage = createStorage()
    storage.setItem(PREDICTIONS_CACHE_KEY, JSON.stringify({ predictions: [{ pick: 'bad' }] }))

    expect(readLockedPredictions(storage, 'sheet-a', '2026-06-11')).toBeUndefined()
  })
})
