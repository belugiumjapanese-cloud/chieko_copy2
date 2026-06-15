export type DropMapThemeId = 'drop' | 'sage' | 'ink' | 'marine' | 'dusk' | 'clay' | 'moss' | 'plum' | 'bloom'

export type DropMapTheme = {
  id: DropMapThemeId
  name: string
  standardTheme: 'default' | 'monochrome' | 'faded'
  lightPreset: 'day' | 'dawn' | 'dusk' | 'night'
  colors: {
    background: string
    water: string
    land: string
    park: string
    road: string
    building: string
    text: string
    halo: string
    fog: string
    highFog: string
    space: string
  }
  globe: {
    oceanTop: string
    oceanMid: string
    oceanBottom: string
    grid: string
    tint: string
    tintAlpha: number
  }
}

export type DropMapThemeColors = DropMapTheme['colors']
export type DropMapColorKey = keyof DropMapThemeColors

type ThemeableMapLayer = {
  id: string
  type?: string
  'source-layer'?: string
}

type ThemeableMap = {
  getStyle: () => { layers?: ThemeableMapLayer[] }
  getSource?: (sourceId: string) => unknown
  addSource?: (sourceId: string, source: unknown) => unknown
  getLayer?: (layerId: string) => unknown
  addLayer?: (layer: unknown, beforeId?: string) => unknown
  moveLayer?: (layerId: string, beforeId?: string) => unknown
  setPaintProperty: (layerId: string, property: string, value: string | number | unknown[]) => unknown
  setConfigProperty?: (importId: string, configName: string, value: unknown) => unknown
}

export const DEFAULT_MAP_THEME_ID: DropMapThemeId = 'drop'

export const DROP_MAP_THEMES: DropMapTheme[] = [
  {
    id: 'drop',
    name: 'Drop',
    standardTheme: 'monochrome',
    lightPreset: 'day',
    colors: {
      background: '#edf1ed',
      water: '#b8ccc2',
      land: '#dfe7e1',
      park: '#c8d8cc',
      road: '#f7faf7',
      building: '#cfd8d1',
      text: '#17241e',
      halo: '#f7faf7',
      fog: '#d6e2da',
      highFog: '#9fb9ad',
      space: '#080d0b',
    },
    globe: {
      oceanTop: '#0c2034',
      oceanMid: '#123150',
      oceanBottom: '#071018',
      grid: 'rgba(215, 226, 218, 0.12)',
      tint: '#d7e2da',
      tintAlpha: 0.08,
    },
  },
]

const DROP_COLOR_SOURCE_ID = 'drop-custom-streets'
const DROP_COLOR_LAYERS = [
  'drop-custom-water',
  'drop-custom-park',
  'drop-custom-building',
  'drop-custom-road-casing',
  'drop-custom-road',
]

export function isDropMapThemeId(value: string): value is DropMapThemeId {
  return DROP_MAP_THEMES.some((theme) => theme.id === value)
}

export function getDropMapTheme(themeId: string): DropMapTheme {
  return DROP_MAP_THEMES.find((theme) => theme.id === themeId) ?? DROP_MAP_THEMES[0]
}

export function createCustomMapTheme(baseTheme: DropMapTheme, colors: DropMapThemeColors): DropMapTheme {
  return {
    ...baseTheme,
    colors: { ...colors },
    globe: {
      ...baseTheme.globe,
      tint: colors.land,
      tintAlpha: 0.06,
    },
  }
}

function paint(map: ThemeableMap, layerId: string, property: string, value: string | number | unknown[]) {
  try {
    map.setPaintProperty(layerId, property, value)
  } catch {
    // Some imported/custom Mapbox Studio layers do not expose all paint properties.
  }
}

function layerText(layer: ThemeableMapLayer) {
  return `${layer.id} ${layer['source-layer'] ?? ''}`.toLowerCase()
}

function firstSymbolLayerId(map: ThemeableMap) {
  return (map.getStyle().layers ?? []).find((layer) => layer.type === 'symbol')?.id
}

function ensureDropColorLayers(map: ThemeableMap) {
  if (!map.addSource || !map.getSource || !map.addLayer || !map.getLayer) return

  try {
    if (!map.getSource(DROP_COLOR_SOURCE_ID)) {
      map.addSource(DROP_COLOR_SOURCE_ID, { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' })
    }
  } catch {
    return
  }

  const beforeId = firstSymbolLayerId(map)
  const add = (layer: Record<string, unknown>) => {
    try {
      if (!map.getLayer?.(layer.id as string)) map.addLayer?.(layer, beforeId)
      else if (map.moveLayer && beforeId) map.moveLayer(layer.id as string, beforeId)
    } catch {
      // If one overlay cannot be added on a specific style, keep the others working.
    }
  }

  add({
    id: 'drop-custom-water',
    type: 'fill',
    source: DROP_COLOR_SOURCE_ID,
    'source-layer': 'water',
    paint: { 'fill-opacity': 0.92 },
  })
  add({
    id: 'drop-custom-park',
    type: 'fill',
    source: DROP_COLOR_SOURCE_ID,
    'source-layer': 'landuse',
    filter: ['in', ['get', 'class'], ['literal', ['park', 'wood', 'grass', 'scrub', 'cemetery', 'golf_course']]],
    paint: { 'fill-opacity': 0.82 },
  })
  add({
    id: 'drop-custom-building',
    type: 'fill',
    source: DROP_COLOR_SOURCE_ID,
    'source-layer': 'building',
    minzoom: 12,
    paint: { 'fill-opacity': 0.78 },
  })
  add({
    id: 'drop-custom-road-casing',
    type: 'line',
    source: DROP_COLOR_SOURCE_ID,
    'source-layer': 'road',
    minzoom: 5,
    paint: {
      'line-opacity': 0.55,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 10, 1.8, 14, 5.5, 18, 18],
    },
  })
  add({
    id: 'drop-custom-road',
    type: 'line',
    source: DROP_COLOR_SOURCE_ID,
    'source-layer': 'road',
    minzoom: 5,
    paint: {
      'line-opacity': 0.94,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.35, 10, 1.1, 14, 3.3, 18, 12],
    },
  })
}

function applyDropColorLayers(map: ThemeableMap, theme: DropMapTheme) {
  ensureDropColorLayers(map)
  paint(map, 'drop-custom-water', 'fill-color', theme.colors.water)
  paint(map, 'drop-custom-park', 'fill-color', theme.colors.park)
  paint(map, 'drop-custom-building', 'fill-color', theme.colors.building)
  paint(map, 'drop-custom-road-casing', 'line-color', theme.colors.halo)
  paint(map, 'drop-custom-road', 'line-color', theme.colors.road)
}

export function applyDropMapTheme(mapInstance: unknown, theme: DropMapTheme) {
  const map = mapInstance as ThemeableMap

  try {
    map.setConfigProperty?.('basemap', 'theme', theme.standardTheme)
    map.setConfigProperty?.('basemap', 'lightPreset', theme.lightPreset)
  } catch {
    // Non-standard custom styles do not support basemap config.
  }

  const layers = (map.getStyle().layers ?? []) as ThemeableMapLayer[]
  layers.forEach((layer) => {
    const label = layerText(layer)

    if (layer.type === 'background') {
      paint(map, layer.id, 'background-color', theme.colors.land)
      return
    }

    if (DROP_COLOR_LAYERS.includes(layer.id)) return

    if (layer.type === 'fill') {
      if (label.includes('water')) paint(map, layer.id, 'fill-color', theme.colors.water)
      else if (label.includes('park') || label.includes('green') || label.includes('landuse')) {
        paint(map, layer.id, 'fill-color', theme.colors.park)
      } else if (label.includes('building')) paint(map, layer.id, 'fill-color', theme.colors.building)
      else paint(map, layer.id, 'fill-color', theme.colors.land)
      return
    }

    if (layer.type === 'line') {
      if (label.includes('road') || label.includes('street') || label.includes('bridge') || label.includes('tunnel')) {
        paint(map, layer.id, 'line-color', theme.colors.road)
      } else if (label.includes('water')) {
        paint(map, layer.id, 'line-color', theme.colors.water)
      }
      return
    }

    if (layer.type === 'symbol') {
      paint(map, layer.id, 'text-color', theme.colors.text)
      paint(map, layer.id, 'text-halo-color', theme.colors.halo)
      paint(map, layer.id, 'icon-color', theme.colors.text)
    }
  })

  applyDropColorLayers(map, theme)
}
