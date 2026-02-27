// @ts-nocheck
import type { PageLoad } from './$types'

export const load = async ({ fetch }: Parameters<PageLoad>[0]) => {
  const [cardsRes, trackerRes] = await Promise.all([
    fetch('/cards.json'),
    fetch('/api/tracker')
  ])
  const data: Record<string, { word: string; example: string; exampleTranslation: string }> = await cardsRes.json()
  const tracker: Record<string, number> = trackerRes.ok ? await trackerRes.json() : {}
  const cards = Object.entries(data).map(([question, { word, example, exampleTranslation }]) => ({ question, answer: word, example, exampleTranslation }))
  return { cards, tracker }
}