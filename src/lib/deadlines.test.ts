import {
  computeCalendarAlerts,
  computeDocumentSeverity,
} from './deadlines'

describe('deadlines logic', () => {
  describe('computeCalendarAlerts - G50', () => {
    it('G50: returns yellow alert on the 10th of the month', () => {
      const alerts = computeCalendarAlerts(new Date('2026-10-10'))
      const g50 = alerts.find((a) => a.type === 'G50')
      expect(g50).toBeDefined()
      expect(g50?.severity).toBe('yellow')
      expect(g50?.dueDate.getDate()).toBe(20)
    })

    it('G50: returns red alert on the 17th of the month', () => {
      const alerts = computeCalendarAlerts(new Date('2026-10-17'))
      const g50 = alerts.find((a) => a.type === 'G50')
      expect(g50).toBeDefined()
      expect(g50?.severity).toBe('red')
      expect(g50?.dueDate.getDate()).toBe(20)
    })

    it('G50: returns red alert on the 20th of the month', () => {
      const alerts = computeCalendarAlerts(new Date('2026-10-20'))
      const g50 = alerts.find((a) => a.type === 'G50')
      expect(g50).toBeDefined()
      expect(g50?.severity).toBe('red')
      expect(g50?.dueDate.getDate()).toBe(20)
    })

    it('G50: returns no alert on the 5th of the month', () => {
      const alerts = computeCalendarAlerts(new Date('2026-10-05'))
      const g50 = alerts.find((a) => a.type === 'G50')
      expect(g50).toBeUndefined()
    })

    it('G50: returns no alert on the 1st of the month', () => {
      const alerts = computeCalendarAlerts(new Date('2026-10-01'))
      const g50 = alerts.find((a) => a.type === 'G50')
      expect(g50).toBeUndefined()
    })
  })

  describe('computeCalendarAlerts - CNAS', () => {
    it('CNAS: returns yellow alert 15 days before quarter end (Sept 15 for Q3)', () => {
      const alerts = computeCalendarAlerts(new Date('2026-09-15'))
      const cnas = alerts.find((a) => a.type === 'CNAS')
      expect(cnas).toBeDefined()
      expect(cnas?.severity).toBe('yellow')
      expect(cnas?.dueDate.getMonth()).toBe(8) // September (0-indexed = 8)
      expect(cnas?.dueDate.getDate()).toBe(30)
    })

    it('CNAS: returns red alert 5 days before quarter end (Sept 25 for Q3)', () => {
      const alerts = computeCalendarAlerts(new Date('2026-09-25'))
      const cnas = alerts.find((a) => a.type === 'CNAS')
      expect(cnas).toBeDefined()
      expect(cnas?.severity).toBe('red')
    })

    it('CNAS: returns red alert on the quarter end itself (Sept 30)', () => {
      const alerts = computeCalendarAlerts(new Date('2026-09-30'))
      const cnas = alerts.find((a) => a.type === 'CNAS')
      expect(cnas).toBeDefined()
      expect(cnas?.severity).toBe('red')
    })

    it('CNAS: returns no alert far from quarter end (Oct 1)', () => {
      const alerts = computeCalendarAlerts(new Date('2026-10-01'))
      const cnas = alerts.find((a) => a.type === 'CNAS')
      expect(cnas).toBeUndefined()
    })

    it('CNAS: handles Q4 (Dec 31) and rolls to Q1 (March 31) in January', () => {
      const alertsDec = computeCalendarAlerts(new Date('2026-12-28'))
      const cnasDec = alertsDec.find((a) => a.type === 'CNAS')
      expect(cnasDec?.severity).toBe('red')
      expect(cnasDec?.dueDate.getMonth()).toBe(11) // December

      const alertsJan = computeCalendarAlerts(new Date('2027-01-05'))
      const cnasJan = alertsJan.find((a) => a.type === 'CNAS')
      expect(cnasJan).toBeUndefined()
    })
  })

  describe('computeCalendarAlerts - IBS/G40', () => {
    it('IBS/G40: returns yellow alert 30 days before April 30 (March 31)', () => {
      const alerts = computeCalendarAlerts(new Date('2026-03-31'))
      const ibs = alerts.find((a) => a.type === 'IBS_G40')
      expect(ibs).toBeDefined()
      expect(ibs?.severity).toBe('yellow')
      expect(ibs?.dueDate.getMonth()).toBe(3) // April
      expect(ibs?.dueDate.getDate()).toBe(30)
    })

    it('IBS/G40: returns red alert 10 days before April 30 (April 20)', () => {
      const alerts = computeCalendarAlerts(new Date('2026-04-20'))
      const ibs = alerts.find((a) => a.type === 'IBS_G40')
      expect(ibs).toBeDefined()
      expect(ibs?.severity).toBe('red')
    })

    it('IBS/G40: returns red alert on April 30', () => {
      const alerts = computeCalendarAlerts(new Date('2026-04-30'))
      const ibs = alerts.find((a) => a.type === 'IBS_G40')
      expect(ibs).toBeDefined()
      expect(ibs?.severity).toBe('red')
    })

    it('IBS/G40: returns no alert on May 1st', () => {
      const alerts = computeCalendarAlerts(new Date('2026-05-01'))
      const ibs = alerts.find((a) => a.type === 'IBS_G40')
      expect(ibs).toBeUndefined()
    })
  })

  describe('computeDocumentSeverity', () => {
    const warnDays = 30
    const redDays = 7

    it('returns "overdue" if dueDate is before now', () => {
      const now = new Date('2026-10-15T10:00:00Z')
      const dueDate = new Date('2026-10-10T10:00:00Z')
      expect(computeDocumentSeverity(dueDate, now, warnDays, redDays)).toBe('overdue')
    })

    it('does not mark a document due today as overdue at noon (returns red alert)', () => {
      const now = new Date('2026-10-15T12:00:00Z')
      const dueDate = new Date('2026-10-15T00:00:00Z')
      expect(computeDocumentSeverity(dueDate, now, warnDays, redDays)).toBe('red')
    })

    it('returns "red" if daysUntil <= redDays', () => {
      const now = new Date('2026-10-10T00:00:00Z')
      const dueDate = new Date('2026-10-15T00:00:00Z') // 5 days until
      expect(computeDocumentSeverity(dueDate, now, warnDays, redDays)).toBe('red')

      const dueDateExact = new Date('2026-10-17T00:00:00Z') // 7 days until
      expect(computeDocumentSeverity(dueDateExact, now, warnDays, redDays)).toBe('red')
    })

    it('returns "yellow" if daysUntil <= warnDays and > redDays', () => {
      const now = new Date('2026-10-10T00:00:00Z')
      const dueDate = new Date('2026-10-25T00:00:00Z') // 15 days until
      expect(computeDocumentSeverity(dueDate, now, warnDays, redDays)).toBe('yellow')

      const dueDateMax = new Date('2026-11-09T00:00:00Z') // 30 days until
      expect(computeDocumentSeverity(dueDateMax, now, warnDays, redDays)).toBe('yellow')
    })

    it('returns null if daysUntil > warnDays', () => {
      const now = new Date('2026-10-10T00:00:00Z')
      const dueDate = new Date('2026-11-20T00:00:00Z') // 41 days until
      expect(computeDocumentSeverity(dueDate, now, warnDays, redDays)).toBeNull()
    })
  })
})
