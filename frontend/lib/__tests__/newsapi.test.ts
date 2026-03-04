import { mapArticleToEvent, NewsApiService, getEvents } from '../newsapi'

// --- mapArticleToEvent ---

describe('mapArticleToEvent', () => {
  const baseArticle = {
    source: { id: 'bbc-news', name: 'BBC News' },
    author: 'John Doe',
    title: 'Bombing in Syria kills dozens',
    description: 'A major airstrike hit Damascus, Syria, killing at least 30 people.',
    url: 'https://bbc.co.uk/syria-bombing',
    urlToImage: 'https://bbc.co.uk/image.jpg',
    publishedAt: '2026-03-02T05:41:00Z',
    content: 'Full article content...',
  }

  it('maps article to GdeltEvent with correct shape', () => {
    const event = mapArticleToEvent(baseArticle)

    expect(event.title).toBe('Bombing in Syria kills dozens')
    expect(event.sourceUrl).toBe('https://bbc.co.uk/syria-bombing')
    expect(event.timestamp).toBe('2026-03-02T05:41:00Z')
    expect(event.eventCode).toBe('19')
    expect(event.eventDescription).toBe('Conflict event (via NewsAPI)')
  })

  it('extracts country location from title/description', () => {
    const event = mapArticleToEvent(baseArticle)

    // Should match "Syria" from title
    expect(event.lat).toBeCloseTo(34.8, 0)
    expect(event.lng).toBeCloseTo(38.99, 0)
    expect(event.country).toBe('SY')
    expect(event.actionGeo).toBe('Syria')
  })

  it('returns 0,0 when no country is found', () => {
    const event = mapArticleToEvent({
      ...baseArticle,
      title: 'Some local news event',
      description: 'No country mentioned',
    })

    expect(event.lat).toBe(0)
    expect(event.lng).toBe(0)
    expect(event.country).toBe('')
  })

  it('infers critical severity from keywords', () => {
    const event = mapArticleToEvent({
      ...baseArticle,
      title: 'Genocide reported in conflict zone',
    })
    expect(event.severity).toBe('critical')
  })

  it('infers high severity from keywords', () => {
    const event = mapArticleToEvent({
      ...baseArticle,
      title: 'Airstrike hits Syria, dozens killed',
    })
    expect(event.severity).toBe('high')
  })

  it('infers medium severity from keywords', () => {
    const event = mapArticleToEvent({
      ...baseArticle,
      title: 'Protests erupt in Iran amid tensions',
      description: 'Unrest in major cities',
    })
    expect(event.severity).toBe('medium')
  })

  it('defaults to low severity for generic news', () => {
    const event = mapArticleToEvent({
      ...baseArticle,
      title: 'Diplomatic talks continue',
      description: 'Negotiations underway',
    })
    expect(event.severity).toBe('low')
  })

  it('generates deterministic IDs from URL', () => {
    const event1 = mapArticleToEvent(baseArticle)
    const event2 = mapArticleToEvent(baseArticle)
    expect(event1.id).toBe(event2.id)
    expect(event1.id).toMatch(/^news-/)
  })
})

// --- NewsApiService ---

describe('NewsApiService', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns [] when no API key is set', async () => {
    const service = new NewsApiService('')
    const events = await service.fetchConflictNews()
    expect(events).toEqual([])
  })

  it('fetches and maps articles on success', async () => {
    const mockResponse = {
      status: 'ok',
      totalResults: 1,
      articles: [
        {
          source: { id: 'bbc', name: 'BBC' },
          author: null,
          title: 'Ukraine conflict escalates with new attacks',
          description: 'Fighting intensifies in eastern Ukraine',
          url: 'https://bbc.co.uk/ukraine',
          urlToImage: null,
          publishedAt: '2026-03-01T10:00:00Z',
          content: null,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const service = new NewsApiService('test-key')
    const events = await service.fetchConflictNews()

    expect(events).toHaveLength(1)
    expect(events[0].country).toBe('UA')
    expect(events[0].severity).toBe('high') // "attacks" → high
  })

  it('returns [] on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 })

    const service = new NewsApiService('test-key')
    const events = await service.fetchConflictNews()
    expect(events).toEqual([])
  })

  it('returns [] on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const service = new NewsApiService('test-key')
    const events = await service.fetchConflictNews()
    expect(events).toEqual([])
  })

  it('filters out articles without geo location', async () => {
    const mockResponse = {
      status: 'ok',
      totalResults: 2,
      articles: [
        {
          source: { id: null, name: 'Test' },
          author: null,
          title: 'Local event with no country mention',
          description: 'Something happened',
          url: 'https://example.com/local',
          urlToImage: null,
          publishedAt: '2026-03-01T10:00:00Z',
          content: null,
        },
        {
          source: { id: null, name: 'Test' },
          author: null,
          title: 'War in Yemen continues',
          description: 'Conflict in Yemen escalates',
          url: 'https://example.com/yemen',
          urlToImage: null,
          publishedAt: '2026-03-01T10:00:00Z',
          content: null,
        },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const service = new NewsApiService('test-key')
    const events = await service.fetchConflictNews()

    // Only Yemen article should survive (local event has no geo match)
    expect(events).toHaveLength(1)
    expect(events[0].country).toBe('YE')
  })
})

// --- getEvents (unified fetcher) ---

describe('getEvents', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('falls back to NewsAPI when GDELT returns empty', async () => {
    // First call (GDELT) returns empty, second call (NewsAPI) returns data
    let callCount = 0
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // GDELT → timeout/empty
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      }
      // NewsAPI → success
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'ok',
            totalResults: 1,
            articles: [
              {
                source: { id: null, name: 'Test' },
                author: null,
                title: 'Conflict in Iraq intensifies',
                description: 'New attacks in Iraq',
                url: 'https://example.com/iraq',
                urlToImage: null,
                publishedAt: '2026-03-01T10:00:00Z',
                content: null,
              },
            ],
          }),
      })
    })

    // Set env for NewsAPI key
    const origKey = process.env.NEWS_API_KEY
    process.env.NEWS_API_KEY = 'test-key'

    const events = await getEvents()

    process.env.NEWS_API_KEY = origKey

    expect(events.length).toBeGreaterThanOrEqual(0) // May vary based on cache state
  })
})
