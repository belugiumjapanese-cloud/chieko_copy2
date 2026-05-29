'use client'

import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'
import { SEED_OFFICIAL_PINS } from '../../lib/constants'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export default function BasicMapPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/belgium-jap/cmp8riesh001j01sngrwfbdsz',
      center: [139.7, 35.6],
      zoom: 10,
    })

    map.on('load', () => {
      SEED_OFFICIAL_PINS.forEach((place) => {
        new mapboxgl.Marker({ color: '#d13b35' })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map)
      })
    })

    return () => {
      map.remove()
    }
  }, [])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100vh' }}
    />
  )
}
