import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/cards.json')
  const data: Record<string, string> = await res.json()
  const cards = Object.entries(data).map(([question, answer]) => ({ question, answer }))
  return { cards }
}