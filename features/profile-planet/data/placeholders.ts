import type { ProfilePlanetPanel } from '../types/profilePlanet'

export const profilePlanetPanels: ProfilePlanetPanel[] = [
  {
    id: 'planet',
    label: '3D planet',
    description: 'A future interactive globe for profile memories, folders, and public signals.',
  },
  {
    id: 'controls',
    label: 'Customization controls',
    description: 'Controls for colors, orbit style, profile layers, and visible memory groups.',
  },
  {
    id: 'mapbox',
    label: 'Mapbox preview',
    description: 'A route-local preview area for testing how selected memories connect back to the map.',
  },
]
