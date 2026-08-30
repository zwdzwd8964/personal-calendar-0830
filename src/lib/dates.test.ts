import { addDaysISO, daysUntil, latestStartDate, localDateOf, todayISO, weekOf } from '@/lib/dates'

describe('todayISO', () => {
  it('formats a Date as YYYY-MM-DD in local time', () => {
    expect(todayISO(new Date(2026, 7, 30, 23, 59, 59))).toBe('2026-08-30')
    expect(todayISO(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01')
  })

  it('defaults to now and returns a well-formed ISO date', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('addDaysISO', () => {
  it('adds days across a month end', () => {
    expect(addDaysISO('2026-08-30', 3)).toBe('2026-09-02')
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('subtracts days across a month start', () => {
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('handles leap-day and year boundaries', () => {
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDaysISO('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('returns the same date for 0 days', () => {
    expect(addDaysISO('2026-08-30', 0)).toBe('2026-08-30')
  })
})

describe('weekOf', () => {
  it('returns the Monday-started week crossing a year boundary', () => {
    // 2026-01-01 is a Thursday; its week starts Monday 2025-12-29
    expect(weekOf('2026-01-01')).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ])
  })

  it('starts on the input date when the input is a Monday', () => {
    // 2026-08-24 is a Monday
    expect(weekOf('2026-08-24')).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ])
  })

  it('ends on the input date when the input is a Sunday', () => {
    // 2026-08-30 is a Sunday; same week as 2026-08-24
    const week = weekOf('2026-08-30')
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-08-24')
    expect(week[6]).toBe('2026-08-30')
    expect(week).toEqual(weekOf('2026-08-24'))
  })
})

describe('daysUntil', () => {
  it('returns 0 when the deadline is today', () => {
    expect(daysUntil('2026-08-30', '2026-08-30')).toBe(0)
  })

  it('returns a positive count for future deadlines', () => {
    expect(daysUntil('2026-09-04', '2026-08-30')).toBe(5)
    expect(daysUntil('2026-08-31', '2026-08-30')).toBe(1)
  })

  it('returns a negative count when overdue', () => {
    expect(daysUntil('2026-08-27', '2026-08-30')).toBe(-3)
    expect(daysUntil('2026-08-29', '2026-08-30')).toBe(-1)
  })

  it('counts calendar days across month and year boundaries', () => {
    expect(daysUntil('2026-09-02', '2026-08-30')).toBe(3)
    expect(daysUntil('2026-01-02', '2025-12-30')).toBe(3)
  })
})

describe('localDateOf', () => {
  it('maps a UTC datetime back to the local calendar date it was created on', () => {
    // build the instant from local components so the assertion holds in any TZ
    const lateEvening = new Date(2026, 7, 30, 23, 30, 0)
    expect(localDateOf(lateEvening.toISOString())).toBe('2026-08-30')
    const earlyMorning = new Date(2026, 7, 31, 0, 5, 0)
    expect(localDateOf(earlyMorning.toISOString())).toBe('2026-08-31')
  })
})

describe('latestStartDate', () => {
  it('deadline = today+5, estimate = 2 → latest start = today+4', () => {
    // today = 2026-08-30 → deadline 2026-09-04, latest start 2026-09-03
    expect(latestStartDate('2026-09-04', 2)).toBe('2026-09-03')
  })

  it('estimate = 0.5 → latest start is the deadline day itself', () => {
    expect(latestStartDate('2026-09-04', 0.5)).toBe('2026-09-04')
  })

  it('estimate = 3.5 → ceil to 4 days → deadline − 3', () => {
    expect(latestStartDate('2026-09-04', 3.5)).toBe('2026-09-01')
  })

  it('estimate = 1 → latest start is the deadline day itself', () => {
    expect(latestStartDate('2026-09-04', 1)).toBe('2026-09-04')
  })

  it('estimateDays undefined → null', () => {
    expect(latestStartDate('2026-09-04')).toBeNull()
    expect(latestStartDate('2026-09-04', undefined)).toBeNull()
  })

  it('crosses month boundaries backwards', () => {
    expect(latestStartDate('2026-09-02', 5)).toBe('2026-08-29')
  })
})
