'use client'

import dynamic from 'next/dynamic'
import emergencyStyles from '../chieko/drop-emergency-overrides.module.css'
import { DropUiLabRuntimeFixes } from './DropUiLabRuntimeFixes'

const ChiekoPageClient = dynamic(
  () => import('../chieko/ChiekoPageClient').then((mod) => mod.ChiekoPageClient),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#07110f',
          color: '#f7fbf9',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <span>Dropを読み込み中...</span>
      </div>
    ),
  },
)

export function UiLabClientOnly() {
  return (
    <div className={emergencyStyles.dropEmergencyRoot}>
      <DropUiLabRuntimeFixes />
      <ChiekoPageClient />
    </div>
  )
}
