import { describe, expect, it } from 'vitest'
import { initials, normalizeText } from './text'

describe('text utilities', () => {
  it('normalizes accents, punctuation, casing, and spacing', () => {
    expect(normalizeText('  Côte-d’Ivoire!!  ')).toBe('cote d ivoire')
  })

  it('builds initials from single and multi-part names', () => {
    expect(initials('Grace Hopper')).toBe('GH')
    expect(initials('alfie')).toBe('AL')
    expect(initials('')).toBe('')
  })
})
