'use client'

import { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MapFolder, MapPin, UserMapTheme } from '../types/map'
import { applyThemeToMapbox } from '../utils/applyThemeToMapbox'
import styles from '../styles/profile-planet.module.css'

type ProfilePlanetMapboxPreviewProps = {
  pins: MapPin[]
  selectedPin: MapPin | null
  selectedFolder: MapFolder | null
  theme: UserMapTheme
  transitionMessage?: string | null
  onPinSelect?: (pin: MapPin) => void
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
const DEFAULT_CENTER: [number, number] = [4.3517, 50.8503]
const DEFAULT_ZOOM = 2.8
const SELECTED_PIN_ZOOM = 10.5

function getFlyTarget(selectedPin: MapPin | null, selectedFolder: MapFolder | null) {
  if (selectedPin) {
    return {
      center: [selectedPin.lng, selectedPin.lat] as [number, number],
      zoom: SELECTED_PIN_ZOOM,
      label: selectedPin.title,
    }
  }

  if (selectedFolder) {
    return {
      center: [selectedFolder.centerLng, selectedFolder.centerLat] as [number, number],
      zoom: selectedFolder.zoom,
      label: selectedFolder.name,
    }
  }

  return {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    label: 'Default planet view',
  }
}

function createMarkerElement({
  isInSelectedFolder,
  isSelected,
  pin,
  pinColor,
}: {
  isInSelectedFolder: boolean
  isSelected: boolean
  pin: MapPin
  pinColor: string
}) {
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = `${styles.mapboxMarker} ${isSelected ? styles.mapboxMarkerSelected : ''}`
  marker.setAttribute('aria-label', `Select ${pin.title}`)
  marker.title = pin.title
  marker.style.setProperty('--marker-color', pinColor)
  marker.style.opacity = isInSelectedFolder ? '1' : '0.38'

  return marker
}

export function ProfilePlanetMapboxPreview({
  pins,
  selectedPin,
  selectedFolder,
  theme,
  transitionMessage,
  onPinSelect,
}: ProfilePlanetMapboxPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const target = useMemo(() => getFlyTarget(selectedPin, selectedFolder), [selectedFolder, selectedPin])

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: target.center,
      zoom: target.zoom,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
    mapRef.current = map

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
    // The initial target is corrected by the flyTo effect as selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const applyTheme = () => {
      applyThemeToMapbox(map, theme)
    }

    if (map.isStyleLoaded()) {
      applyTheme()
      return
    }

    map.once('style.load', applyTheme)

    return () => {
      map.off('style.load', applyTheme)
    }
  }, [theme])

  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.flyTo({
      center: target.center,
      duration: 650,
      essential: true,
      zoom: target.zoom,
    })
  }, [target.center, target.zoom])

  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = pins.map((pin) => {
      const isInSelectedFolder = !selectedFolder || selectedFolder.pinIds.includes(pin.id) || pin.folderId === selectedFolder.id
      const isSelected = selectedPin?.id === pin.id
      const element = createMarkerElement({
        isInSelectedFolder,
        isSelected,
        pin,
        pinColor: theme.pinColor,
      })

      element.addEventListener('click', () => {
        onPinSelect?.(pin)
      })

      return new mapboxgl.Marker({ anchor: 'bottom', element })
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapRef.current as mapboxgl.Map)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [onPinSelect, pins, selectedFolder, selectedPin, theme.pinColor])

  if (!MAPBOX_TOKEN) {
    return (
      <div className={styles.mapboxMissing}>
        <strong>Mapbox token is missing</strong>
        <span>Add NEXT_PUBLIC_MAPBOX_TOKEN to see the Profile Planet Mapbox preview.</span>
      </div>
    )
  }

  return (
    <div className={`${styles.mapboxPreviewShell} ${transitionMessage ? styles.mapboxPreviewShellActive : ''}`}>
      <div ref={mapContainerRef} className={styles.mapboxMap} />
      <div className={styles.mapboxTargetCard}>
        <span>Mapbox target</span>
        <strong>{target.label}</strong>
        <small>
          {target.center[1].toFixed(4)}, {target.center[0].toFixed(4)} / zoom {target.zoom}
        </small>
      </div>
      {transitionMessage ? (
        <div className={styles.mapboxTransitionStatus} aria-live="polite">
          {transitionMessage}
        </div>
      ) : null}
    </div>
  )
}
