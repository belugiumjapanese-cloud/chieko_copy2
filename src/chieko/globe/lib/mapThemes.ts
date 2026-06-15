export type DropMapThemeId = 'drop'

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
  setPaintProperty: (layerId: string, property: string, value: string | number) => unknown
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

function paint(map: ThemeableMap, layerId: string, property: string, value: string | number) {
  try {
    map.setPaintProperty(layerId, property, value)
  } catch {
    // Some imported/custom Mapbox Studio layers do not expose all paint properties.
  }
}

function layerText(layer: ThemeableMapLayer) {
  return `${layer.id} ${layer['source-layer'] ?? ''}`.toLowerCase()
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
      paint(map, layer.id, 'background-color', theme.colors.background)
      return
    }

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
}
