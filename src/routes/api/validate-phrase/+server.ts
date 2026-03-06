import { json } from '@sveltejs/kit'
import Anthropic from '@anthropic-ai/sdk'
import { ANTHROPIC_API_KEY } from '$env/static/private'
import type { RequestHandler } from './$types'

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a Dutch language teacher. A student is practicing writing Dutch sentences.
They are given a Dutch word and must write a sentence in Dutch using that word in the specified tense.
Evaluate their sentence for grammatical correctness, proper use of the word, and correct tense.
Respond ONLY with valid JSON — no markdown, no extra text.`

export const POST: RequestHandler = async ({ request }) => {
  const { word, wordTranslation, phrase, tense } = await request.json() as {
    word: string
    wordTranslation: string
    phrase: string
    tense: 'present' | 'past' | 'future'
  }

  if (!word || !phrase || !tense) {
    return json({ correct: false, phrase: '', explanation: 'Missing required fields.' }, { status: 400 })
  }

  const userPrompt = `Word: ${word} (${wordTranslation})
Required tense: ${tense}
Student's sentence: ${phrase}

Respond with this exact JSON format:
{"correct": true/false, "phrase": "the corrected sentence or the original if correct", "explanation": "brief explanation of any mistakes, or empty string if correct"}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const result = JSON.parse(text) as { correct: boolean; phrase: string; explanation: string }

    return json({
      correct: result.correct,
      phrase: result.phrase,
      explanation: result.explanation
    })
  } catch (err) {
    console.error('Claude API error:', err)
    return json(
      { correct: false, phrase: '', explanation: 'Failed to validate phrase. Please try again.' },
      { status: 500 }
    )
  }
}
