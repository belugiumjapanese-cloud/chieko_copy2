import type { Metadata } from 'next'
import { ChiekoPageClient } from '../chieko/ChiekoPageClient'
import emergencyStyles from '../chieko/drop-emergency-overrides.module.css'
import { DropUiLabRuntimeFixes } from './DropUiLabRuntimeFixes'

export const metadata: Metadata = {
  title: 'Drop UI Lab',
  description: 'Refined Drop mobile app preview.',
}

export default function UiLabPage() {
  return (
    <div className={emergencyStyles.dropEmergencyRoot}>
      <DropUiLabRuntimeFixes />
      <ChiekoPageClient />
    </div>
  )
}
