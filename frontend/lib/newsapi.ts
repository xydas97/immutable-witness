// ============================================================
// NewsAPI Fallback Service — fetch conflict news when GDELT is unavailable
// Returns GdeltEvent[] shape so callers treat both services identically
// ============================================================

import type { GdeltEvent, EventFilter, Severity } from '@/types'
import { gdeltService } from './gdelt'

// --- NewsAPI article shape ---

interface NewsApiArticle {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

interface NewsApiResponse {
  status: string
  totalResults: number
  articles: NewsApiArticle[]
}

// --- Country centroid lookup (top 50 conflict-prone countries) ---

const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number; code: string }> = {
  'afghanistan': { lat: 33.93, lng: 67.71, code: 'AF' },
  'algeria': { lat: 28.03, lng: 1.66, code: 'DZ' },
  'angola': { lat: -11.2, lng: 17.87, code: 'AO' },
  'bangladesh': { lat: 23.68, lng: 90.36, code: 'BD' },
  'burkina faso': { lat: 12.24, lng: -1.56, code: 'BF' },
  'cameroon': { lat: 7.37, lng: 12.35, code: 'CM' },
  'central african republic': { lat: 6.61, lng: 20.94, code: 'CF' },
  'chad': { lat: 15.45, lng: 18.73, code: 'TD' },
  'china': { lat: 35.86, lng: 104.2, code: 'CN' },
  'colombia': { lat: 4.57, lng: -74.3, code: 'CO' },
  'democratic republic of the congo': { lat: -4.04, lng: 21.76, code: 'CD' },
  'congo': { lat: -4.04, lng: 21.76, code: 'CD' },
  'drc': { lat: -4.04, lng: 21.76, code: 'CD' },
  'egypt': { lat: 26.82, lng: 30.8, code: 'EG' },
  'eritrea': { lat: 15.18, lng: 39.78, code: 'ER' },
  'ethiopia': { lat: 9.15, lng: 40.49, code: 'ET' },
  'gaza': { lat: 31.35, lng: 34.31, code: 'PS' },
  'haiti': { lat: 18.97, lng: -72.29, code: 'HT' },
  'india': { lat: 20.59, lng: 78.96, code: 'IN' },
  'indonesia': { lat: -0.79, lng: 113.92, code: 'ID' },
  'iran': { lat: 32.43, lng: 53.69, code: 'IR' },
  'iraq': { lat: 33.22, lng: 43.68, code: 'IQ' },
  'israel': { lat: 31.05, lng: 34.85, code: 'IL' },
  'kenya': { lat: -0.02, lng: 37.91, code: 'KE' },
  'lebanon': { lat: 33.85, lng: 35.86, code: 'LB' },
  'libya': { lat: 26.34, lng: 17.23, code: 'LY' },
  'mali': { lat: 17.57, lng: -4.0, code: 'ML' },
  'mexico': { lat: 23.63, lng: -102.55, code: 'MX' },
  'mozambique': { lat: -18.67, lng: 35.53, code: 'MZ' },
  'myanmar': { lat: 21.91, lng: 95.96, code: 'MM' },
  'niger': { lat: 17.61, lng: 8.08, code: 'NE' },
  'nigeria': { lat: 9.08, lng: 7.49, code: 'NG' },
  'north korea': { lat: 40.34, lng: 127.51, code: 'KP' },
  'pakistan': { lat: 30.38, lng: 69.35, code: 'PK' },
  'palestine': { lat: 31.95, lng: 35.23, code: 'PS' },
  'philippines': { lat: 12.88, lng: 121.77, code: 'PH' },
  'russia': { lat: 61.52, lng: 105.32, code: 'RU' },
  'saudi arabia': { lat: 23.89, lng: 45.08, code: 'SA' },
  'somalia': { lat: 5.15, lng: 46.2, code: 'SO' },
  'south sudan': { lat: 6.88, lng: 31.31, code: 'SS' },
  'sudan': { lat: 12.86, lng: 30.22, code: 'SD' },
  'syria': { lat: 34.8, lng: 38.99, code: 'SY' },
  'thailand': { lat: 15.87, lng: 100.99, code: 'TH' },
  'tunisia': { lat: 33.89, lng: 9.54, code: 'TN' },
  'turkey': { lat: 38.96, lng: 35.24, code: 'TR' },
  'ukraine': { lat: 48.38, lng: 31.17, code: 'UA' },
  'venezuela': { lat: 6.42, lng: -66.59, code: 'VE' },
  'yemen': { lat: 15.55, lng: 48.52, code: 'YE' },
  'zimbabwe': { lat: -19.02, lng: 29.15, code: 'ZW' },
}

// --- Map article to GdeltEvent ---

export function mapArticleToEvent(article: NewsApiArticle): GdeltEvent {
  const location = extractLocation(article)

  return {
    id: `news-${hashString(article.url)}`,
    title: article.title || 'Untitled',
    eventCode: '19', // Default to "Fight" for conflict news
    eventDescription: 'Conflict event (via NewsAPI)',
    lat: location.lat,
    lng: location.lng,
    country: location.code,
    timestamp: article.publishedAt || new Date().toISOString(),
    severity: inferSeverity(article.title, article.description),
    sourceUrl: article.url,
    actionGeo: location.name,
  }
}

/**
 * Attempt to extract a country/location from article title + description,
 * then look up its centroid. Falls back to 0,0 (filtered out later).
 */
function extractLocation(article: NewsApiArticle): {
  lat: number
  lng: number
  code: string
  name: string
} {
  const text = `${article.title ?? ''} ${article.description ?? ''}`.toLowerCase()

  for (const [country, coords] of Object.entries(COUNTRY_CENTROIDS)) {
    if (text.includes(country)) {
      return { ...coords, name: country.charAt(0).toUpperCase() + country.slice(1) }
    }
  }

  return { lat: 0, lng: 0, code: '', name: '' }
}

/**
 * Infer severity from keywords in title/description.
 */
function inferSeverity(title: string, description: string | null): Severity {
  const text = `${title} ${description ?? ''}`.toLowerCase()

  const criticalWords = ['massacre', 'genocide', 'mass killing', 'chemical weapon', 'nuclear']
  const highWords = ['bomb', 'airstrike', 'invasion', 'attack', 'killed', 'dead', 'casualties', 'war']
  const mediumWords = ['clash', 'protest', 'riot', 'unrest', 'tension', 'conflict', 'strike']

  if (criticalWords.some((w) => text.includes(w))) return 'critical'
  if (highWords.some((w) => text.includes(w))) return 'high'
  if (mediumWords.some((w) => text.includes(w))) return 'medium'
  return 'low'
}

/**
 * Simple string hash for generating deterministic IDs.
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32-bit int
  }
  return Math.abs(hash).toString(36)
}

// --- NewsAPI Service ---

const NEWS_API_BASE = 'https://newsapi.org/v2/everything'
const CONFLICT_KEYWORDS = 'conflict OR war OR bombing OR airstrike OR protest OR uprising OR military'

export class NewsApiService {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWS_API_KEY || ''
  }

  /**
   * Fetch conflict-related news and return as GdeltEvent[].
   * Never throws — returns [] on failure.
   */
  async fetchConflictNews(filter?: Partial<EventFilter>): Promise<GdeltEvent[]> {
    if (!this.apiKey) {
      console.warn('[NewsAPI] No API key configured — skipping fallback')
      return []
    }

    try {
      const params = new URLSearchParams({
        q: CONFLICT_KEYWORDS,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: '50',
        apiKey: this.apiKey,
      })

      // Apply date filters if provided
      if (filter?.timeRange?.from) {
        params.set('from', filter.timeRange.from.toISOString().slice(0, 10))
      }
      if (filter?.timeRange?.to) {
        params.set('to', filter.timeRange.to.toISOString().slice(0, 10))
      }

      const url = `${NEWS_API_BASE}?${params.toString()}`
      const res = await fetch(url)

      if (!res.ok) {
        console.warn(`[NewsAPI] HTTP ${res.status}`)
        return []
      }

      const data: NewsApiResponse = await res.json()

      // ── Console log raw response for debugging ──
      console.log('[NewsAPI] Raw response:', JSON.stringify(data, null, 2))

      if (data.status !== 'ok' || !Array.isArray(data.articles)) {
        console.warn('[NewsAPI] Unexpected response status:', data.status)
        return []
      }

      const events = data.articles
        .map(mapArticleToEvent)
        .filter((e) => e.lat !== 0 && e.lng !== 0) // Only keep geo-locatable articles

      // Apply country filter if provided
      if (filter?.countries && filter.countries.length > 0) {
        return events.filter((e) => filter.countries!.includes(e.country))
      }

      return events
    } catch (err) {
      console.warn('[NewsAPI] Failed to fetch conflict news:', err)
      return []
    }
  }
}

// --- Unified getEvents — tries GDELT first, falls back to NewsAPI ---

/**
 * Primary entry point for fetching events.
 * Tries GDELT first, falls back to NewsAPI, merges and deduplicates by sourceUrl.
 */
export async function getEvents(filter?: Partial<EventFilter>): Promise<GdeltEvent[]> {
  const newsApiService = new NewsApiService()

  // Try GDELT first
  let gdeltEvents: GdeltEvent[] = []
  try {
    if (filter && 'countries' in filter && 'eventCodes' in filter && 'timeRange' in filter && 'verifiedOnly' in filter) {
      gdeltEvents = await gdeltService.fetchHistoricEvents(filter as EventFilter)
    } else {
      gdeltEvents = await gdeltService.fetchLiveEvents()
    }
  } catch {
    console.warn('[getEvents] GDELT fetch failed, falling back to NewsAPI')
  }

  // Fall back to NewsAPI if GDELT returned nothing
  let newsEvents: GdeltEvent[] = []
  if (gdeltEvents.length === 0) {
    console.log('[getEvents] GDELT returned no results, trying NewsAPI fallback...')
    newsEvents = await newsApiService.fetchConflictNews(filter)
  }

  // Merge and deduplicate by sourceUrl
  const seen = new Set<string>()
  const merged: GdeltEvent[] = []

  for (const event of [...gdeltEvents, ...newsEvents]) {
    if (event.sourceUrl && seen.has(event.sourceUrl)) continue
    if (event.sourceUrl) seen.add(event.sourceUrl)
    merged.push(event)
  }

  return merged
}

// Default singleton
export const newsApiService = new NewsApiService()
