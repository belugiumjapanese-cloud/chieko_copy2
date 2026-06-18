import type { Metadata } from 'next'
import { ChiekoPageClient } from './ChiekoPageClient'
import emergencyStyles from './drop-emergency-overrides.module.css'

export const metadata: Metadata = {
  title: 'Drop Chieko',
  description: 'Chieko Drop workspace preview.',
}

export default function ChiekoPage() {
  return (
    <div className={emergencyStyles.dropEmergencyRoot}>
      <ChiekoPageClient />
    </div>
  )
}
