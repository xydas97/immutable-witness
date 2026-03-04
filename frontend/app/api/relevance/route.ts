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
    // Return mock result when Claude API key not configured
    return NextResponse.json<RelevanceResult>({
      score: 75,
      reason: 'Mock score — configure ANTHROPIC_API_KEY for real AI relevance analysis.',
      status: 'unconfirmed',
    })
  }

  try {
    const prompt = `You are a relevance scorer for an evidence archival system. Given an event and submitted proof, rate relevance 0-100.

Event: "${body.eventTitle}" — ${body.eventDescription}
Location: ${body.eventLocation}

Submitted proof description: "${body.proofDescription}"
${body.proofUrl ? `Proof URL: ${body.proofUrl}` : ''}

Respond with JSON only: {"score": <number 0-100>, "reason": "<1-2 sentence explanation>", "status": "<verified|unconfirmed|blocked>"}`

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
        status: 'unconfirmed',
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
      status: 'unconfirmed',
    })
  }
}
