export type DropMapThemeId = 'sage' | 'ink' | 'marine' | 'dusk' | 'clay' | 'moss' | 'plum' | 'bloom'

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

export const DEFAULT_MAP_THEME_ID: DropMapThemeId = 'sage'

export const DROP_MAP_THEMES: DropMapTheme[] = [
  {
    id: 'sage',
    name: 'Sage',
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
      oceanTop: '#20352e',
      oceanMid: '#35524a',
      oceanBottom: '#14231f',
      grid: 'rgba(215, 226, 218, 0.16)',
      tint: '#d7e2da',
      tintAlpha: 0.22,
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    standardTheme: 'monochrome',
    lightPreset: 'night',
    colors: {
      background: '#0f1512',
      water: '#1e353a',
      land: '#17231e',
      park: '#213629',
      road: '#6d7b73',
      building: '#26332d',
      text: '#f4f7f4',
      halo: '#0f1512',
      fog: '#0f1b19',
      highFog: '#304c4f',
      space: '#050807',
    },
    globe: {
      oceanTop: '#071110',
      oceanMid: '#152a2d',
      oceanBottom: '#070b0a',
      grid: 'rgba(247, 250, 247, 0.12)',
      tint: '#5f7f78',
      tintAlpha: 0.28,
    },
  },
  {
    id: 'marine',
    name: 'Marine',
    standardTheme: 'faded',
    lightPreset: 'day',
    colors: {
      background: '#eaf1f2',
      water: '#8fb6c0',
      land: '#e5ebe5',
      park: '#b8cfbd',
      road: '#f8f6ef',
      building: '#cdd8d8',
      text: '#18313a',
      halo: '#f8fbfa',
      fog: '#c8dde3',
      highFog: '#6f9fac',
      space: '#081014',
    },
    globe: {
      oceanTop: '#173640',
      oceanMid: '#3a6b78',
      oceanBottom: '#0f2228',
      grid: 'rgba(200, 221, 227, 0.2)',
      tint: '#8fb6c0',
      tintAlpha: 0.2,
    },
  },
  {
    id: 'dusk',
    name: 'Dusk',
    standardTheme: 'faded',
    lightPreset: 'dusk',
    colors: {
      background: '#eee9e2',
      water: '#a9a7b8',
      land: '#e2d8cd',
      park: '#c9c0a8',
      road: '#fff8ef',
      building: '#cfc3bb',
      text: '#332d35',
      halo: '#f8f1e9',
      fog: '#dfd2c7',
      highFog: '#9b8da4',
      space: '#16121a',
    },
    globe: {
      oceanTop: '#2d2635',
      oceanMid: '#594e63',
      oceanBottom: '#17131b',
      grid: 'rgba(238, 233, 226, 0.16)',
      tint: '#d9c7be',
      tintAlpha: 0.24,
    },
  },
  {
    id: 'clay',
    name: 'Clay',
    standardTheme: 'faded',
    lightPreset: 'dawn',
    colors: {
      background: '#f1ede7',
      water: '#b4bbb4',
      land: '#e6d7ca',
      park: '#c9c5a9',
      road: '#fffaf2',
      building: '#d0bbae',
      text: '#35251f',
      halo: '#f8f1e9',
      fog: '#e2cfc2',
      highFog: '#af8f7e',
      space: '#120c0a',
    },
    globe: {
      oceanTop: '#27332f',
      oceanMid: '#6d695e',
      oceanBottom: '#17110e',
      grid: 'rgba(246, 237, 226, 0.15)',
      tint: '#c7957f',
      tintAlpha: 0.22,
    },
  },
  {
    id: 'moss',
    name: 'Moss',
    standardTheme: 'monochrome',
    lightPreset: 'day',
    colors: {
      background: '#eef2e6',
      water: '#a7bba5',
      land: '#dfe8d0',
      park: '#b3ca97',
      road: '#f8f9ef',
      building: '#cbd8b8',
      text: '#203019',
      halo: '#f8faef',
      fog: '#d7e2c4',
      highFog: '#91a973',
      space: '#0b0f08',
    },
    globe: {
      oceanTop: '#1b2b26',
      oceanMid: '#516949',
      oceanBottom: '#11170d',
      grid: 'rgba(224, 236, 200, 0.16)',
      tint: '#b3ca97',
      tintAlpha: 0.24,
    },
  },
  {
    id: 'plum',
    name: 'Plum',
    standardTheme: 'monochrome',
    lightPreset: 'dusk',
    colors: {
      background: '#eeeaf0',
      water: '#b7aabd',
      land: '#e4dce6',
      park: '#cabfd0',
      road: '#faf6fb',
      building: '#d2c5d2',
      text: '#2e2032',
      halo: '#fbf7fb',
      fog: '#ded0e2',
      highFog: '#9a83a5',
      space: '#120e15',
    },
    globe: {
      oceanTop: '#291f30',
      oceanMid: '#5b4864',
      oceanBottom: '#120e15',
      grid: 'rgba(238, 230, 242, 0.16)',
      tint: '#b7aabd',
      tintAlpha: 0.24,
    },
  },
  {
    id: 'bloom',
    name: 'Bloom',
    standardTheme: 'faded',
    lightPreset: 'dawn',
    colors: {
      background: '#f3eeee',
      water: '#c5b5b8',
      land: '#eaded8',
      park: '#d4c5b1',
      road: '#fff8f2',
      building: '#d8c8c0',
      text: '#382723',
      halo: '#fff8f4',
      fog: '#e7d4cf',
      highFog: '#b28e8d',
      space: '#160f0e',
    },
    globe: {
      oceanTop: '#322525',
      oceanMid: '#785e5f',
      oceanBottom: '#160f0e',
      grid: 'rgba(247, 231, 226, 0.16)',
      tint: '#d9a6a2',
      tintAlpha: 0.22,
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
      oceanTop: colors.space,
      oceanMid: colors.water,
      oceanBottom: colors.space,
      tint: colors.land,
      tintAlpha: 0.14,
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
