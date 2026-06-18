import type { Metadata } from 'next'
import { ChiekoPageClient } from './ChiekoPageClient'

export const metadata: Metadata = {
  title: 'Drop Chieko',
  description: 'Chieko Drop workspace preview.',
}

export default function ChiekoPage() {
  return (
    <>
      <style>{`
        main[class] div[class*='friendDetail__'] {
          top: 206px !important;
          max-height: calc(100% - 270px) !important;
        }

        main[class] div[class*='friendDetailActions'] [class*='closeAction'] {
          z-index: 3 !important;
          pointer-events: auto !important;
        }
      `}</style>
      <ChiekoPageClient />
    </>
  )
}
