import type { Metadata } from 'next'
import { UiLabClientOnly } from './UiLabClientOnly'

export const metadata: Metadata = {
  title: 'Drop UI Lab',
  description: 'Refined Drop mobile app preview.',
}

export default function UiLabPage() {
  return <UiLabClientOnly />
}
