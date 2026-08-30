import type { MessageKey } from './index'
import { formatFullDate, formatMonthDay, monthLabel, t, weekRangeLabel } from './index'

// 2026-08-24 是周一（dates.test.ts 已验证），用它锚定星期几断言
describe('i18n formatters', () => {
  it('formatFullDate localizes per spec §9', () => {
    expect(formatFullDate('2026-08-24', 'zh')).toBe('8月24日 周一')
    expect(formatFullDate('2026-08-24', 'en')).toBe('Mon, Aug 24')
  })

  it('formatMonthDay renders M/d without zero padding', () => {
    expect(formatMonthDay('2026-09-03', 'zh')).toBe('9/3')
    expect(formatMonthDay('2026-09-03', 'en')).toBe('9/3')
  })

  it('weekRangeLabel localizes both endpoints', () => {
    expect(weekRangeLabel('2026-08-24', '2026-08-30', 'zh')).toBe('8月24日 – 8月30日')
    expect(weekRangeLabel('2026-08-24', '2026-08-30', 'en')).toBe('Aug 24 – Aug 30')
  })

  it('monthLabel accepts yyyy-MM, full date, and full ISO datetime (doneAt shape)', () => {
    expect(monthLabel('2026-08', 'zh')).toBe('2026年8月')
    expect(monthLabel('2026-08-30', 'en')).toBe('Aug 2026')
    expect(monthLabel('2026-08-30T12:34:56.000Z', 'zh')).toBe('2026年8月')
  })
})

describe('t()', () => {
  it('interpolates params including 0', () => {
    expect(t('countdown.daysLeft', { n: 0 })).toBe('0 天后')
    expect(t('countdown.overdue', { n: 3 })).toBe('逾期 3 天')
  })

  it('leaves unknown params intact and returns unknown keys as-is', () => {
    expect(t('countdown.overdue')).toBe('逾期 {n} 天')
    expect(t('does.not.exist' as MessageKey)).toBe('does.not.exist')
  })
})
