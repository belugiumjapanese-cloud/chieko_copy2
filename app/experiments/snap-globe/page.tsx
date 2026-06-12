import type { Metadata } from 'next'
import { SnapGlobe } from '../../../src/chieko/globe/SnapGlobe'

export const metadata: Metadata = {
  title: 'Snap Globe Demo',
  description: 'A Snap Map-style 3D globe built with Three.js and Mapbox.',
}

export default function SnapGlobeExperimentPage() {
  return <SnapGlobe />
}
