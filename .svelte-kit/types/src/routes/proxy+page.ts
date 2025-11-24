// @ts-nocheck
import type { PageLoad } from './$types'

export const load = async ({ fetch }: Parameters<PageLoad>[0]) => {
  const res = await fetch('/cards.json')
  const data: Record<string, string> = await res.json()
  const cards = Object.entries(data).map(([question, answer]) => ({ question, answer }))
  return { cards }
}