import type mapboxgl from 'mapbox-gl'
import type { LayerSpecification } from 'mapbox-gl'
import type { UserMapTheme } from '../types/map'

type PaintProperty =
  | 'background-color'
  | 'building-color'
  | 'fill-color'
  | 'fill-extrusion-color'
  | 'line-color'
  | 'text-color'

const waterTokens = ['water', 'ocean', 'river', 'lake', 'canal']
const landTokens = ['land', 'landuse', 'landcover', 'park', 'green', 'wood', 'grass', 'sand']
const roadTokens = ['road', 'street', 'bridge', 'tunnel', 'path', 'motorway', 'trunk']
const buildingTokens = ['building', 'house', 'structure']
const labelTokens = ['label', 'place', 'poi', 'settlement', 'country', 'state', 'admin', 'road-number']

function layerText(layer: LayerSpecification) {
  const sourceLayer = 'source-layer' in layer && typeof layer['source-layer'] === 'string' ? layer['source-layer'] : ''

  return `${layer.id} ${sourceLayer}`.toLowerCase()
}

function matchesLayer(layer: LayerSpecification, tokens: string[]) {
  const text = layerText(layer)

  return tokens.some((token) => text.includes(token))
}

function safeSetPaintProperty(
  map: mapboxgl.Map,
  layerId: string,
  property: PaintProperty,
  color: string,
) {
  if (!map.getLayer(layerId)) return

  try {
    map.setPaintProperty(layerId, property, color)
  } catch {
    // Mapbox styles vary by version and style family. Unsupported paint
    // properties are intentionally ignored so this experiment stays portable.
  }
}

export function applyThemeToMapbox(map: mapboxgl.Map, theme: UserMapTheme) {
  const layers = map.getStyle().layers ?? []

  layers.forEach((layer) => {
    if (layer.type === 'background') {
      safeSetPaintProperty(map, layer.id, 'background-color', theme.landColor)
      return
    }

    if (layer.type === 'fill') {
      if (matchesLayer(layer, waterTokens)) {
        safeSetPaintProperty(map, layer.id, 'fill-color', theme.oceanColor)
        return
      }

      if (matchesLayer(layer, buildingTokens)) {
        safeSetPaintProperty(map, layer.id, 'fill-color', theme.buildingColor)
        return
      }

      if (matchesLayer(layer, landTokens)) {
        safeSetPaintProperty(map, layer.id, 'fill-color', theme.landColor)
      }

      return
    }

    if (layer.type === 'line') {
      if (matchesLayer(layer, roadTokens)) {
        safeSetPaintProperty(map, layer.id, 'line-color', theme.roadColor)
        return
      }

      if (matchesLayer(layer, waterTokens)) {
        safeSetPaintProperty(map, layer.id, 'line-color', theme.oceanColor)
      }

      return
    }

    if (layer.type === 'fill-extrusion') {
      if (matchesLayer(layer, buildingTokens)) {
        safeSetPaintProperty(map, layer.id, 'fill-extrusion-color', theme.buildingColor)
      }

      return
    }

    if (layer.type === 'building') {
      if (matchesLayer(layer, buildingTokens)) {
        safeSetPaintProperty(map, layer.id, 'building-color', theme.buildingColor)
      }

      return
    }

    if (layer.type === 'symbol' && matchesLayer(layer, labelTokens)) {
      safeSetPaintProperty(map, layer.id, 'text-color', theme.labelColor)
    }
  })
}
