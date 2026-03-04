import { normaliseEvent, getSeverityLabel, GdeltService } from '../gdelt'
import type { GdeltEvent } from '@/types'

// --- getSeverityLabel ---

describe('getSeverityLabel', () => {
  it('returns critical for goldstein < -7', () => {
    expect(getSeverityLabel(-10)).toBe('critical')
    expect(getSeverityLabel(-7.1)).toBe('critical')
  })

  it('returns high for goldstein between -7 and -4', () => {
    expect(getSeverityLabel(-7)).toBe('high')
    expect(getSeverityLabel(-5)).toBe('high')
    expect(getSeverityLabel(-4.1)).toBe('high')
  })

  it('returns medium for goldstein between -4 and -1', () => {
    expect(getSeverityLabel(-4)).toBe('medium')
    expect(getSeverityLabel(-2)).toBe('medium')
    expect(getSeverityLabel(-1.1)).toBe('medium')
  })

  it('returns low for goldstein >= -1', () => {
    expect(getSeverityLabel(-1)).toBe('low')
    expect(getSeverityLabel(0)).toBe('low')
    expect(getSeverityLabel(5)).toBe('low')
  })
})

// --- normaliseEvent (GDELT DOC 2.0 article shape) ---

describe('normaliseEvent', () => {
  const rawArticle = {
    url: 'https://example.com/syria-airstrike',
    url_mobile: '',
    title: 'Airstrike hits Syria, dozens killed in Damascus',
    seendate: '20260301T143000Z',
    socialimage: 'https://example.com/img.jpg',
    domain: 'example.com',
    language: 'English',
    sourcecountry: 'Syria',
  }

  it('maps DOC article to GdeltEvent with correct shape', () => {
    const event = normaliseEvent(rawArticle)

    expect(event.title).toBe('Airstrike hits Syria, dozens killed in Damascus')
    expect(event.sourceUrl).toBe('https://example.com/syria-airstrike')
    expect(event.eventDescription).toBe('Conflict event (via GDELT)')
    expect(event.id).toMatch(/^gdelt-/)
  })

  it('resolves location from sourcecountry full name', () => {
    const event = normaliseEvent(rawArticle)

    expect(event.lat).toBeCloseTo(34.8, 0)
    expect(event.lng).toBeCloseTo(38.99, 0)
    expect(event.country).toBe('SY')
    expect(event.actionGeo).toBe('Syria')
  })

  it('falls back to title-based country extraction when sourcecountry is missing', () => {
    const event = normaliseEvent({
      ...rawArticle,
      sourcecountry: '',
      title: 'War in Ukraine escalates further',
    })

    expect(event.lat).toBeCloseTo(48.38, 0)
    expect(event.lng).toBeCloseTo(31.17, 0)
    expect(event.country).toBe('UA')
    expect(event.actionGeo).toBe('Ukraine')
  })

  it('resolves multi-word country names like "United States"', () => {
    const event = normaliseEvent({
      ...rawArticle,
      sourcecountry: 'United States',
      title: 'Texas Boosts Security Amid Iran Conflict',
    })

    expect(event.lat).toBeCloseTo(37.09, 0)
    expect(event.country).toBe('US')
    expect(event.actionGeo).toBe('United States')
  })

  it('returns 0,0 when no country can be resolved', () => {
    const event = normaliseEvent({
      ...rawArticle,
      sourcecountry: '',
      title: 'Local news with no country mention',
    })

    expect(event.lat).toBe(0)
    expect(event.lng).toBe(0)
    expect(event.country).toBe('')
  })

  it('infers severity from title keywords', () => {
    expect(normaliseEvent({ ...rawArticle, title: 'Genocide reported' }).severity).toBe('critical')
    expect(normaliseEvent({ ...rawArticle, title: 'Bombing kills many' }).severity).toBe('high')
    expect(normaliseEvent({ ...rawArticle, title: 'Protests erupt' }).severity).toBe('medium')
    expect(normaliseEvent({ ...rawArticle, title: 'Diplomatic talks' }).severity).toBe('low')
  })

  it('parses seendate into ISO timestamp', () => {
    const event = normaliseEvent(rawArticle)
    expect(event.timestamp).toContain('2026-03-01')
  })

  it('generates deterministic IDs from URL', () => {
    const event1 = normaliseEvent(rawArticle)
    const event2 = normaliseEvent(rawArticle)
    expect(event1.id).toBe(event2.id)
  })
})

// --- GdeltService fetch with mocked global fetch ---

describe('GdeltService', () => {
  const service = new GdeltService()
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetchLiveEvents returns normalised events on success', async () => {
    const mockResponse = {
      articles: [
        {
          url: 'https://example.com/protest',
          url_mobile: '',
          title: 'Protest violently erupts in Kyiv, Ukraine',
          seendate: '20260301T100000Z',
          socialimage: '',
          domain: 'example.com',
          language: 'English',
          sourcecountry: 'Ukraine',
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const events = await service.fetchLiveEvents(10)
    expect(events).toHaveLength(1)
    expect(events[0].country).toBe('UA')
    expect(events[0].severity).toBe('medium') // "protest" → medium
    expect(events[0].actionGeo).toBe('Ukraine')
  })

  it('fetchLiveEvents returns [] on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const events = await service.fetchLiveEvents()
    expect(events).toEqual([])
  })

  it('fetchLiveEvents returns [] on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    })

    const events = await service.fetchLiveEvents()
    expect(events).toEqual([])
  })

  it('filters out events with lat/lng of 0', async () => {
    const mockResponse = {
      articles: [
        {
          url: 'https://example.com/unknown',
          url_mobile: '',
          title: 'Some event with no geo info',
          seendate: '20260301T100000Z',
          socialimage: '',
          domain: 'example.com',
          language: 'English',
          sourcecountry: '', // No country → lat/lng will be 0
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const events = await service.fetchLiveEvents()
    expect(events).toEqual([])
  })

  it('handles empty articles array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ articles: [] }),
    })

    const events = await service.fetchLiveEvents()
    expect(events).toEqual([])
  })

  it('handles response without articles key', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: 'no results' }),
    })

    const events = await service.fetchLiveEvents()
    expect(events).toEqual([])
  })
})
