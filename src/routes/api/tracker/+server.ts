import { json } from '@sveltejs/kit'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { RequestHandler } from './$types'

const TRACKER_PATH = join(process.cwd(), 'tracker.json')
const DECAY_PER_CORRECT = 0.2

function readTracker(): Record<string, number> {
  if (!existsSync(TRACKER_PATH)) return {}
  try {
    return JSON.parse(readFileSync(TRACKER_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

export const GET: RequestHandler = () => {
  return json(readTracker())
}

// Body: string[] — list of question words that were answered wrong
export const POST: RequestHandler = async ({ request }) => {
  const words: string[] = await request.json()
  const tracker = readTracker()
  for (const word of words) {
    tracker[word] = (tracker[word] ?? 0) + 1
  }
  writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2))
  return json(tracker)
}

// Body: string[] — list of question words that were answered correctly (decay)
export const PUT: RequestHandler = async ({ request }) => {
  const words: string[] = await request.json()
  const tracker = readTracker()
  for (const word of words) {
    if (tracker[word] != null) {
      const newVal = tracker[word] - DECAY_PER_CORRECT
      if (newVal <= 0) {
        delete tracker[word]
      } else {
        tracker[word] = newVal
      }
    }
  }
  writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2))
  return json(tracker)
}
