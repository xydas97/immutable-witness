// ============================================================
// GDELT API Service — fetch, normalise, and cache conflict events
// Uses GDELT DOC 2.0 API (ArtList mode) for reliable article retrieval
// Primary data source for live + historic event feeds (Pages 1 & 2)
// ============================================================

import type { GdeltEvent, Severity, EventFilter } from '@/types'

// --- CAMEO event code lookup (demo-relevant subset) ---

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CAMEO_CODES: Record<string, string> = {
  '14': 'Protest',
  '140': 'Engage in political dissent',
  '141': 'Demonstrate or rally',
  '142': 'Conduct hunger strike',
  '143': 'Conduct strike or boycott',
  '144': 'Obstruct passage or block',
  '145': 'Protest violently or riot',
  '15': 'Exhibit force posture',
  '150': 'Demonstrate military or police power',
  '151': 'Increase police alert status',
  '152': 'Increase military alert status',
  '153': 'Mobilize or increase armed forces',
  '154': 'Fortify',
  '17': 'Coerce',
  '170': 'Coerce',
  '171': 'Seize or damage property',
  '172': 'Impose blockade or restrict movement',
  '173': 'Impose curfew',
  '174': 'Arrest or detain',
  '175': 'Use tactics of violent repression',
  '18': 'Assault',
  '180': 'Use unconventional violence',
  '181': 'Abduct or hijack',
  '182': 'Physically assault',
  '183': 'Conduct suicide, car, or other non-military bombing',
  '184': 'Use as human shield',
  '185': 'Attempt to assassinate',
  '186': 'Assassinate',
  '19': 'Fight',
  '190': 'Use conventional military force',
  '191': 'Impose blockade',
  '192': 'Occupy territory',
  '193': 'Fight with small arms and light weapons',
  '194': 'Fight with artillery and tanks',
  '195': 'Employ aerial weapons',
  '196': 'Violate ceasefire',
  '20': 'Use unconventional mass violence',
  '200': 'Use unconventional mass violence',
  '201': 'Engage in mass expulsion',
  '202': 'Engage in mass killings',
  '203': 'Engage in ethnic cleansing',
  '204': 'Use weapons of mass destruction',
}

// --- Raw GDELT DOC 2.0 ArtList article shape ---

interface GdeltDocArticle {
  url: string
  url_mobile: string
  title: string
  seendate: string        // YYYYMMDDTHHMMSSZ
  socialimage: string
  domain: string
  language: string
  sourcecountry: string   // Full country name (e.g. "United States", "Iran", "South Korea")
}

interface GdeltDocResponse {
  articles: GdeltDocArticle[]
}

// --- Country name → centroid + ISO code lookup ---
// GDELT DOC API returns full country names in sourcecountry field

const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number; iso: string }> = {
  'afghanistan': { lat: 33.93, lng: 67.71, iso: 'AF' },
  'algeria': { lat: 28.03, lng: 1.66, iso: 'DZ' },
  'angola': { lat: -11.2, lng: 17.87, iso: 'AO' },
  'bangladesh': { lat: 23.68, lng: 90.36, iso: 'BD' },
  'burkina faso': { lat: 12.24, lng: -1.56, iso: 'BF' },
  'cameroon': { lat: 7.37, lng: 12.35, iso: 'CM' },
  'central african republic': { lat: 6.61, lng: 20.94, iso: 'CF' },
  'chad': { lat: 15.45, lng: 18.73, iso: 'TD' },
  'china': { lat: 35.86, lng: 104.2, iso: 'CN' },
  'colombia': { lat: 4.57, lng: -74.3, iso: 'CO' },
  'democratic republic of the congo': { lat: -4.04, lng: 21.76, iso: 'CD' },
  'congo': { lat: -4.04, lng: 21.76, iso: 'CD' },
  'egypt': { lat: 26.82, lng: 30.8, iso: 'EG' },
  'eritrea': { lat: 15.18, lng: 39.78, iso: 'ER' },
  'ethiopia': { lat: 9.15, lng: 40.49, iso: 'ET' },
  'gaza': { lat: 31.35, lng: 34.31, iso: 'PS' },
  'haiti': { lat: 18.97, lng: -72.29, iso: 'HT' },
  'india': { lat: 20.59, lng: 78.96, iso: 'IN' },
  'indonesia': { lat: -0.79, lng: 113.92, iso: 'ID' },
  'iran': { lat: 32.43, lng: 53.69, iso: 'IR' },
  'iraq': { lat: 33.22, lng: 43.68, iso: 'IQ' },
  'israel': { lat: 31.05, lng: 34.85, iso: 'IL' },
  'kenya': { lat: -0.02, lng: 37.91, iso: 'KE' },
  'lebanon': { lat: 33.85, lng: 35.86, iso: 'LB' },
  'libya': { lat: 26.34, lng: 17.23, iso: 'LY' },
  'mali': { lat: 17.57, lng: -4.0, iso: 'ML' },
  'mexico': { lat: 23.63, lng: -102.55, iso: 'MX' },
  'mozambique': { lat: -18.67, lng: 35.53, iso: 'MZ' },
  'myanmar': { lat: 21.91, lng: 95.96, iso: 'MM' },
  'niger': { lat: 17.61, lng: 8.08, iso: 'NE' },
  'nigeria': { lat: 9.08, lng: 7.49, iso: 'NG' },
  'north korea': { lat: 40.34, lng: 127.51, iso: 'KP' },
  'pakistan': { lat: 30.38, lng: 69.35, iso: 'PK' },
  'palestine': { lat: 31.95, lng: 35.23, iso: 'PS' },
  'philippines': { lat: 12.88, lng: 121.77, iso: 'PH' },
  'russia': { lat: 61.52, lng: 105.32, iso: 'RU' },
  'saudi arabia': { lat: 23.89, lng: 45.08, iso: 'SA' },
  'somalia': { lat: 5.15, lng: 46.2, iso: 'SO' },
  'south korea': { lat: 35.91, lng: 127.77, iso: 'KR' },
  'south sudan': { lat: 6.88, lng: 31.31, iso: 'SS' },
  'sri lanka': { lat: 7.87, lng: 80.77, iso: 'LK' },
  'sudan': { lat: 12.86, lng: 30.22, iso: 'SD' },
  'syria': { lat: 34.8, lng: 38.99, iso: 'SY' },
  'thailand': { lat: 15.87, lng: 100.99, iso: 'TH' },
  'tunisia': { lat: 33.89, lng: 9.54, iso: 'TN' },
  'turkey': { lat: 38.96, lng: 35.24, iso: 'TR' },
  'ukraine': { lat: 48.38, lng: 31.17, iso: 'UA' },
  'united kingdom': { lat: 55.38, lng: -3.44, iso: 'GB' },
  'united states': { lat: 37.09, lng: -95.71, iso: 'US' },
  'venezuela': { lat: 6.42, lng: -66.59, iso: 'VE' },
  'yemen': { lat: 15.55, lng: 48.52, iso: 'YE' },
  'zimbabwe': { lat: -19.02, lng: 29.15, iso: 'ZW' },
}

// --- Severity mapping (Goldstein scale — kept for contract compatibility) ---

export function getSeverityLabel(goldstein: number): Severity {
  if (goldstein < -7) return 'critical'
  if (goldstein < -4) return 'high'
  if (goldstein < -1) return 'medium'
  return 'low'
}

// --- Infer severity from article title keywords ---

function inferSeverityFromTitle(title: string): Severity {
  const text = title.toLowerCase()
  const criticalWords = ['massacre', 'genocide', 'mass killing', 'chemical weapon', 'nuclear']
  const highWords = ['bomb', 'airstrike', 'invasion', 'attack', 'killed', 'dead', 'casualties', 'war', 'strike']
  const mediumWords = ['clash', 'protest', 'riot', 'unrest', 'tension', 'conflict', 'militant']

  if (criticalWords.some((w) => text.includes(w))) return 'critical'
  if (highWords.some((w) => text.includes(w))) return 'high'
  if (mediumWords.some((w) => text.includes(w))) return 'medium'
  return 'low'
}

// --- Resolve country from sourcecountry field or title text ---

function resolveCountry(
  sourcecountry: string,
  title: string,
): { lat: number; lng: number; iso: string; name: string } {
  // Priority 1: Extract country from the article title.
  // This tells us where the event HAPPENED, not where it was published.
  // sourcecountry is the publisher's country (e.g. CNN → "United States" even for Iran articles).
  const titleLower = (title ?? '').toLowerCase()
  for (const [name, coords] of Object.entries(COUNTRY_CENTROIDS)) {
    if (titleLower.includes(name)) {
      return { ...coords, name: name.charAt(0).toUpperCase() + name.slice(1) }
    }
  }

  // Priority 2: Fall back to sourcecountry if nothing found in title
  const scLower = (sourcecountry ?? '').toLowerCase().trim()
  if (scLower && COUNTRY_CENTROIDS[scLower]) {
    const entry = COUNTRY_CENTROIDS[scLower]
    return { ...entry, name: sourcecountry }
  }

  return { lat: 0, lng: 0, iso: '', name: '' }
}

// --- Normalise GDELT DOC article → GdeltEvent ---

export function normaliseEvent(raw: GdeltDocArticle): GdeltEvent {
  const location = resolveCountry(raw.sourcecountry, raw.title)

  // Parse seendate: YYYYMMDDTHHMMSSZ → ISO string
  const timestamp = parseGdeltSeenDate(raw.seendate)

  return {
    id: `gdelt-${hashString(raw.url)}`,
    title: raw.title || 'Untitled',
    eventCode: '19', // DOC API doesn't have CAMEO codes; default to conflict
    eventDescription: 'Conflict event (via GDELT)',
    lat: location.lat,
    lng: location.lng,
    country: location.iso,
    timestamp,
    severity: inferSeverityFromTitle(raw.title || ''),
    sourceUrl: raw.url || '',
    actionGeo: location.name,
  }
}

function parseGdeltSeenDate(seendate: string): string {
  if (!seendate || seendate.length < 8) return new Date().toISOString()
  // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDHHMMSS
  const cleaned = seendate.replace('T', '').replace('Z', '')
  const y = cleaned.slice(0, 4)
  const m = cleaned.slice(4, 6)
  const d = cleaned.slice(6, 8)
  const h = cleaned.slice(8, 10) || '00'
  const min = cleaned.slice(10, 12) || '00'
  const s = cleaned.slice(12, 14) || '00'
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`).toISOString()
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// --- In-memory cache ---

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<GdeltEvent[]>>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

function getCached(key: string): GdeltEvent[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: GdeltEvent[]): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export function clearGdeltCache(): void {
  cache.clear()
}

// --- GDELT DOC 2.0 API ---

const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc'
const FETCH_TIMEOUT_MS = 45_000

const CONFLICT_QUERY = 'war attack conflict bombing airstrike protest sourcelang:english'

export class GdeltService {
  /**
   * Fetch the latest conflict events from GDELT DOC 2.0 API.
   * Returns normalised GdeltEvent[] — never throws, returns [] on failure.
   */
  async fetchLiveEvents(limit: number = 50): Promise<GdeltEvent[]> {
    const cacheKey = `live-${limit}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    try {
      const maxrecords = Math.min(limit, 250)
      const url =
        `${GDELT_DOC_API}?query=${encodeURIComponent(CONFLICT_QUERY)}` +
        `&mode=ArtList&maxrecords=${maxrecords}&format=json&sort=datedesc`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (!res.ok) {
        console.warn(`[GDELT] HTTP ${res.status} fetching live events`)
        return []
      }

      const raw = await res.json()

      // ── Console log raw response for debugging ──
      console.log('[GDELT] Raw DOC API response:', JSON.stringify(raw, null, 2))

      const events = this.parseDocResponse(raw)
      setCache(cacheKey, events)
      return events
    } catch (err) {
      console.warn('[GDELT] Failed to fetch live events:', err)
      return []
    }
  }

  /**
   * Fetch historic events matching a filter.
   * Returns normalised GdeltEvent[] — never throws, returns [] on failure.
   */
  async fetchHistoricEvents(filter: EventFilter): Promise<GdeltEvent[]> {
    const cacheKey = `historic-${JSON.stringify(filter)}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    try {
      let query = CONFLICT_QUERY

      // Country filter using GDELT sourcecountry operator
      if (filter.countries.length > 0) {
        const countryClause = filter.countries
          .map((c) => `sourcecountry:${c}`)
          .join(' OR ')
        query += ` (${countryClause})`
      }

      // Date formatting for GDELT DOC API: YYYYMMDDHHMMSS
      const startDate = formatDateForGdelt(filter.timeRange.from)
      const endDate = formatDateForGdelt(filter.timeRange.to)

      const url =
        `${GDELT_DOC_API}?query=${encodeURIComponent(query)}` +
        `&mode=ArtList&maxrecords=250&format=json&sort=datedesc` +
        `&startdatetime=${startDate}&enddatetime=${endDate}`

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (!res.ok) {
        console.warn(`[GDELT] HTTP ${res.status} fetching historic events`)
        return []
      }

      const raw = await res.json()

      // ── Console log raw response for debugging ──
      console.log('[GDELT] Raw DOC API historic response:', JSON.stringify(raw, null, 2))

      const events = this.parseDocResponse(raw)

      // Apply verifiedOnly filter client-side (severity-based)
      const filtered = filter.verifiedOnly
        ? events.filter((e) => e.severity === 'critical' || e.severity === 'high')
        : events

      setCache(cacheKey, filtered)
      return filtered
    } catch (err) {
      console.warn('[GDELT] Failed to fetch historic events:', err)
      return []
    }
  }

  /**
   * Parse GDELT DOC 2.0 ArtList JSON response.
   * Response shape: { articles: [{ url, url_mobile, title, seendate, socialimage, domain, language, sourcecountry }] }
   */
  private parseDocResponse(raw: unknown): GdeltEvent[] {
    if (!raw || typeof raw !== 'object') return []

    const response = raw as Partial<GdeltDocResponse>
    const articles = response.articles

    if (!Array.isArray(articles)) {
      console.warn('[GDELT] No articles array in response:', Object.keys(raw as object))
      return []
    }

    return articles
      .map((article) => {
        try {
          return normaliseEvent(article)
        } catch {
          console.warn('[GDELT] Failed to normalise article:', article)
          return null
        }
      })
      .filter((e): e is GdeltEvent => e !== null && e.lat !== 0 && e.lng !== 0)
  }
}

function formatDateForGdelt(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}${m}${d}${h}${min}${s}`
}

// Default singleton export
export const gdeltService = new GdeltService()
