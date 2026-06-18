import type { Metadata } from 'next'
import { ChiekoPageClient } from './ChiekoPageClient'

export const metadata: Metadata = {
  title: 'Drop Chieko',
  description: 'Chieko Drop workspace preview.',
}

export default function ChiekoPage() {
  return <ChiekoPageClient />
}
