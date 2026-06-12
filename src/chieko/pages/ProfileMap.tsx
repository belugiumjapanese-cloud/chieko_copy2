'use client'

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { auth } from '../lib/firebase'
import { listDrops, listFolders } from '../lib/dropService'
import { calculateStats, formatDropDate } from '../lib/geo'
import type { DropDoc, DropFolder } from '../lib/types'
import styles from '../components/chieko.module.css'

type ProfileMapProps = {
  userId?: string
  mapboxToken?: string
  initialFolderId?: string
}

const DEFAULT_CENTER: [number, number] = [4.3517, 50.8503]

function createPopup(drop: DropDoc) {
  const root = document.createElement('div')
  root.className = styles.popup

  const image = document.createElement('img')
  image.src = drop.imageUrl
  image.alt = drop.placeName

  const title = document.createElement('strong')
  title.textContent = drop.placeName

  const date = document.createElement('span')
  date.textContent = formatDropDate(drop.takenAt)

  root.append(image, title, date)
  return root
}

export function ProfileMap({ userId, mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '', initialFolderId = 'all' }: ProfileMapProps) {
  const activeUserId = userId ?? auth.currentUser?.uid ?? ''
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [drops, setDrops] = useState<DropDoc[]>([])
  const [folders, setFolders] = useState<DropFolder[]>([])
  const [activeFolderId, setActiveFolderId] = useState(initialFolderId)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeUserId) return

    let ignore = false
    Promise.all([listDrops(activeUserId), listFolders(activeUserId)])
      .then(([nextDrops, nextFolders]) => {
        if (ignore) return
        setDrops(nextDrops)
        setFolders(nextFolders)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'プロフィール地図を読み込めませんでした'))

    return () => {
      ignore = true
    }
  }, [activeUserId])

  useEffect(() => {
    if (!containerRef.current || !mapboxToken || mapRef.current) return

    mapboxgl.accessToken = mapboxToken
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: 11,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [mapboxToken])

  const filteredDrops = useMemo(() => {
    if (activeFolderId === 'all') return drops
    return drops.filter((drop) => drop.folderId === activeFolderId)
  }, [activeFolderId, drops])
  const stats = useMemo(() => calculateStats(drops), [drops])

  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    if (!filteredDrops.length) return

    const bounds = new mapboxgl.LngLatBounds()
    filteredDrops.forEach((drop) => {
      const marker = new mapboxgl.Marker({ color: '#111f1a' })
        .setLngLat([drop.lng, drop.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setDOMContent(createPopup(drop)))
        .addTo(mapRef.current as mapboxgl.Map)

      markersRef.current.push(marker)
      bounds.extend([drop.lng, drop.lat])
    })

    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 })
  }, [filteredDrops])

  return (
    <section className={styles.mapShell} aria-label="プロフィール地図">
      {mapboxToken ? <div ref={containerRef} className={styles.mapCanvas} /> : <div className={styles.emptyMap}>Mapbox tokenが必要です。</div>}

      <div className={styles.mapOverlay}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>Countries</span>
            <strong>{stats.countries}</strong>
          </div>
          <div className={styles.stat}>
            <span>Cities</span>
            <strong>{stats.cities}</strong>
          </div>
          <div className={styles.stat}>
            <span>Drops</span>
            <strong>{stats.drops}</strong>
          </div>
        </div>

        <div className={styles.tabs} aria-label="フォルダフィルター">
          <button className={activeFolderId === 'all' ? styles.activeTab : styles.tab} type="button" onClick={() => setActiveFolderId('all')}>
            All
          </button>
          {folders.map((folder) => (
            <button
              className={activeFolderId === folder.id ? styles.activeTab : styles.tab}
              key={folder.id}
              type="button"
              onClick={() => setActiveFolderId(folder.id)}
            >
              {folder.name}
            </button>
          ))}
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </section>
  )
}
