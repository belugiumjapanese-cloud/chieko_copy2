import type { Metadata } from 'next'
import { ChiekoPageClient } from '../chieko/ChiekoPageClient'

export const metadata: Metadata = {
  title: 'Drop UI Lab',
  description: 'Refined Drop mobile app preview.',
}

export default function UiLabPage() {
  return <ChiekoPageClient />
}
