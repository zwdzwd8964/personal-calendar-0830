import { sanitizeDrafts } from './parseMeal'

describe('sanitizeDrafts (§10 distrust validation)', () => {
  it('accepts full and minimal drafts, trimming strings and dropping null/empty optionals', () => {
    const drafts = sanitizeDrafts({
      drafts: [
        { date: '2026-09-01', slot: 'lunch', person: ' 老张 ', place: ' 食堂 ', note: '聊排期' },
        { date: '2026-09-02', slot: 'dinner', person: '李姐、王强', place: null, note: '' },
      ],
    })
    expect(drafts).toEqual([
      { date: '2026-09-01', slot: 'lunch', person: '老张', place: '食堂', note: '聊排期' },
      { date: '2026-09-02', slot: 'dinner', person: '李姐、王强' },
    ])
    expect('place' in drafts[1]).toBe(false)
    expect('note' in drafts[1]).toBe(false)
  })

  it('returns an empty array for zero drafts (non-meal utterance)', () => {
    expect(sanitizeDrafts({ drafts: [] })).toEqual([])
  })

  it('rejects the whole payload when any draft is invalid', () => {
    const good = { date: '2026-09-01', slot: 'lunch', person: '老张' }
    expect(() => sanitizeDrafts({ drafts: [good, { ...good, date: '2026-13-99' }] })).toThrow()
    expect(() => sanitizeDrafts({ drafts: [good, { ...good, slot: 'brunch' }] })).toThrow()
    expect(() => sanitizeDrafts({ drafts: [good, { ...good, person: '  ' }] })).toThrow()
    expect(() => sanitizeDrafts({ drafts: [good, null] })).toThrow()
  })

  it('rejects malformed payloads outright', () => {
    expect(() => sanitizeDrafts(null)).toThrow()
    expect(() => sanitizeDrafts({})).toThrow()
    expect(() => sanitizeDrafts({ drafts: 'nope' })).toThrow()
  })
})
