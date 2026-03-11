import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
  const [cardsRes, trackerRes] = await Promise.all([
    fetch('/cards.json'),
    fetch('/api/tracker')
  ])
  const data: Record<string, { word: string[]; context?: string; example: string; exampleTranslation: string }> = await cardsRes.json()
  const tracker: Record<string, number> = trackerRes.ok ? await trackerRes.json() : {}
  const cards = Object.entries(data).map(([key, { word, context, example, exampleTranslation }]) => {
    const question = key.replace(/\s*\(.*?\)\s*$/, '').trim()
    const ctx = context || key.match(/\(([^)]+)\)/)?.[1]
    return { question, answer: word, context: ctx, example, exampleTranslation }
  })
  return { cards, tracker }
}
