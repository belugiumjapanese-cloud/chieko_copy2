import type { FeatureCollection, Point } from 'geojson'

type Hotspot = {
  lng: number
  lat: number
  strength: number
}

const HOTSPOTS: Hotspot[] = [
  { lng: 139.77, lat: 35.68, strength: 1 },
  { lng: 135.5, lat: 34.69, strength: 0.85 },
  { lng: 130.4, lat: 33.59, strength: 0.6 },
  { lng: 126.98, lat: 37.57, strength: 0.85 },
  { lng: 121.56, lat: 25.03, strength: 0.7 },
  { lng: 103.85, lat: 1.29, strength: 0.65 },
  { lng: 100.5, lat: 13.75, strength: 0.7 },
  { lng: 151.21, lat: -33.87, strength: 0.6 },
  { lng: -73.99, lat: 40.73, strength: 0.95 },
  { lng: -118.24, lat: 34.05, strength: 0.8 },
  { lng: -87.63, lat: 41.88, strength: 0.6 },
  { lng: -99.13, lat: 19.43, strength: 0.6 },
  { lng: -0.13, lat: 51.51, strength: 0.85 },
  { lng: 2.35, lat: 48.86, strength: 0.8 },
  { lng: 13.4, lat: 52.52, strength: 0.6 },
  { lng: 28.98, lat: 41.01, strength: 0.65 },
  { lng: 55.27, lat: 25.2, strength: 0.6 },
  { lng: 72.88, lat: 19.08, strength: 0.75 },
  { lng: -46.63, lat: -23.55, strength: 0.7 },
  { lng: 31.24, lat: 30.04, strength: 0.55 },
]

export function buildHeatData(): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = []
  HOTSPOTS.forEach((hotspot) => {
    const count = Math.round(30 + hotspot.strength * 40)
    for (let i = 0; i < count; i++) {
      // Cluster points near each city center with a roughly gaussian spread.
      const spread = 0.55
      const offsetLng = (Math.random() + Math.random() - 1) * spread
      const offsetLat = (Math.random() + Math.random() - 1) * spread * 0.8
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [hotspot.lng + offsetLng, hotspot.lat + offsetLat] },
        properties: { weight: hotspot.strength * (0.4 + Math.random() * 0.6) },
      })
    }
  })
  return { type: 'FeatureCollection', features }
}

export const HEAT_LAYER_PAINT = {
  'heatmap-weight': ['get', 'weight'],
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.9, 9, 1.6],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(0, 0, 0, 0)',
    0.18,
    'rgba(64, 196, 255, 0.5)',
    0.42,
    'rgba(96, 255, 140, 0.65)',
    0.62,
    'rgba(255, 252, 0, 0.75)',
    0.82,
    'rgba(255, 150, 40, 0.85)',
    1,
    'rgba(255, 70, 60, 0.92)',
  ],
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 14, 6, 34, 10, 56],
  'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.85, 11, 0.5, 13, 0],
}
