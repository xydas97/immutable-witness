import { NextResponse } from 'next/server'
import type { RelevanceResult } from '@/types'

interface RelevanceRequest {
  eventTitle: string
  eventDescription: string
  eventLocation: string
  proofDescription: string
  proofUrl?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as RelevanceRequest

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Return varied mock scores for demo — some will be deletable (below threshold)
    const hash = Array.from(body.proofDescription || 'x').reduce((a, c) => a + c.charCodeAt(0), 0)
    const mockScores = [42, 55, 68, 75, 82, 90, 38, 71, 60, 85]
    const score = mockScores[hash % mockScores.length]
    return NextResponse.json<RelevanceResult>({
      score,
      reason: `Mock score (${score}/100) — configure ANTHROPIC_API_KEY for real AI relevance analysis.`,
    })
  }

  try {
    const prompt = `You are a relevance scorer for an evidence archival system. Given an event and submitted proof, rate relevance 0-100.

Event: "${body.eventTitle}" — ${body.eventDescription}
Location: ${body.eventLocation}

Submitted proof description: "${body.proofDescription}"
${body.proofUrl ? `Proof URL: ${body.proofUrl}` : ''}

Respond with JSON only: {"score": <number 0-100>, "reason": "<1-2 sentence explanation>"}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json<RelevanceResult>({
        score: 65,
        reason: 'Relevance API unavailable — returning estimated score.',
      })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    const parsed = JSON.parse(text) as RelevanceResult
    return NextResponse.json<RelevanceResult>(parsed)
  } catch {
    return NextResponse.json<RelevanceResult>({
      score: 65,
      reason: 'Failed to parse AI response — returning estimated score.',
    })
  }
}
