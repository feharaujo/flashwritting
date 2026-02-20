import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/cards.json')
  const data: Record<string, { word: string; example: string; exampleTranslation: string }> = await res.json()
  const cards = Object.entries(data).map(([question, { word, example, exampleTranslation }]) => ({ question, answer: word, example, exampleTranslation }))
  return { cards }
}