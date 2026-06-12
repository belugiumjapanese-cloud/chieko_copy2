'use client'

import { onAuthStateChanged } from 'firebase/auth'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { listDrops, listFolders } from '../lib/dropService'
import { auth, hasFirebaseConfig } from '../lib/firebase'
import { calculateStats, formatDropDate } from '../lib/geo'
import type { DropDoc, DropFolder } from '../lib/types'
import { createPhotoBadge } from './lib/badges'
import { DEMO_DROPS, DEMO_FOLDERS } from './lib/demoDrops'
import { buildEarthTexture } from './lib/earthTexture'
import { GlobeEngine, type GlobeView } from './lib/globeEngine'
import { buildDropHeatData, HEAT_LAYER_PAINT } from './lib/heat'
import styles from './snap-globe.module.css'

type DropGlobeProps = {
  mapboxToken?: string
  userId?: string
  /** 親アプリのヘッダー分だけUIを下げる(px) */
  topInset?: number
  /** 親アプリの下部ナビ分だけUIを上げる(px) */
  bottomInset?: number
  onRequestDrop?: () => void
}

type Phase = 'loading' | 'globe' | 'diving' | 'map' | 'surfacing'

const SURFACE_ZOOM = 2.05
const DIVE_START_ZOOM = 2.2
const FADE_MS = 480

function createMapDropElement(drop: DropDoc, onSelect: () => void) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = styles.mapDropPin
  element.setAttribute('aria-label', drop.placeName)

  const image = document.createElement('img')
  image.className = styles.mapDropPinImage
  image.src = drop.imageUrl
  image.alt = ''

  const name = document.createElement('span')
  name.className = styles.mapDropPinName
  name.textContent = drop.placeName

  element.append(image, name)
  element.addEventListener('click', (event) => {
    event.stopPropagation()
    onSelect()
  })
  return element
}

export function DropGlobe({
  mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
  userId,
  topInset = 0,
  bottomInset = 0,
  onRequestDrop,
}: DropGlobeProps) {
  const globeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<GlobeEngine | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapMarkersRef = useRef<mapboxgl.Marker[]>([])
  const badgeCacheRef = useRef(new Map<string, HTMLCanvasElement>())
  const phaseRef = useRef<Phase>('loading')
  const pendingDropRef = useRef<DropDoc | null>(null)
  const selectDropRef = useRef<(drop: DropDoc) => void>()
  const heatOnRef = useRef(true)
  const dropsRef = useRef<DropDoc[]>([])

  const [phase, setPhaseState] = useState<Phase>('loading')
  const [engineReady, setEngineReady] = useState(false)
  const [mapVisible, setMapVisible] = useState(false)
  const [drops, setDrops] = useState<DropDoc[]>([])
  const [folders, setFolders] = useState<DropFolder[]>([])
  const [isPreview, setIsPreview] = useState(false)
  const [activeFolderId, setActiveFolderId] = useState('all')
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [heatOn, setHeatOn] = useState(true)

  const setPhase = (next: Phase) => {
    phaseRef.current = next
    setPhaseState(next)
  }

  const filteredDrops = useMemo(
    () => (activeFolderId === 'all' ? drops : drops.filter((drop) => drop.folderId === activeFolderId)),
    [activeFolderId, drops],
  )
  const stats = useMemo(() => calculateStats(drops), [drops])
  const selectedDrop = drops.find((drop) => drop.id === selectedDropId) ?? null
  const selectedFolderName = selectedDrop ? folders.find((folder) => folder.id === selectedDrop.folderId)?.name : undefined

  selectDropRef.current = (drop: DropDoc) => {
    setSelectedDropId(drop.id)
    if (phaseRef.current === 'map' && mapRef.current) {
      mapRef.current.flyTo({ center: [drop.lng, drop.lat], zoom: 14.5, duration: 1600, essential: true })
    } else if (phaseRef.current === 'globe' && engineRef.current) {
      pendingDropRef.current = drop
      engineRef.current.flyToAndDive(drop.lng, drop.lat)
    }
  }

  // ----- 地球儀とMapboxの初期化(マウント時に一度だけ) -----
  useEffect(() => {
    const canvas = globeCanvasRef.current
    const shell = shellRef.current
    const mapContainer = mapContainerRef.current
    if (!canvas || !shell || !mapContainer) return

    let cancelled = false

    const handleDive = (center: GlobeView) => {
      const map = mapRef.current
      if (!map) {
        engineRef.current?.resetView(center.lng, center.lat)
        return
      }
      setPhase('diving')
      map.jumpTo({ center: [center.lng, center.lat], zoom: DIVE_START_ZOOM, bearing: 0, pitch: 0 })
      setMapVisible(true)
      window.setTimeout(() => {
        if (cancelled) return
        setPhase('map')
        engineRef.current?.setPaused(true)
        const pending = pendingDropRef.current
        pendingDropRef.current = null
        if (pending) {
          map.flyTo({ center: [pending.lng, pending.lat], zoom: 14.5, duration: 2400, essential: true })
        } else {
          map.easeTo({ zoom: 4.4, duration: 1400 })
        }
      }, FADE_MS + 40)
    }

    const surfaceToGlobe = () => {
      const map = mapRef.current
      const engine = engineRef.current
      if (!map || !engine || phaseRef.current !== 'map') return
      setPhase('surfacing')
      const center = map.getCenter()
      engine.resetView(center.lng, center.lat)
      engine.setPaused(false)
      setMapVisible(false)
      window.setTimeout(() => {
        if (!cancelled) setPhase('globe')
      }, FADE_MS + 40)
    }

    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken
      const map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        projection: { name: 'globe' },
        center: [139.7, 35.66],
        zoom: DIVE_START_ZOOM,
        attributionControl: true,
      })
      mapRef.current = map

      map.on('style.load', () => {
        map.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(5, 7, 15)',
          'star-intensity': 0.6,
        })
        if (!map.getSource('chieko-heat')) {
          map.addSource('chieko-heat', { type: 'geojson', data: buildDropHeatData(dropsRef.current) })
          map.addLayer({ id: 'chieko-heat', type: 'heatmap', source: 'chieko-heat', paint: HEAT_LAYER_PAINT as never })
          map.setLayoutProperty('chieko-heat', 'visibility', heatOnRef.current ? 'visible' : 'none')
        }
      })

      map.on('zoomend', () => {
        if (map.getZoom() < SURFACE_ZOOM) surfaceToGlobe()
      })

      map.on('click', () => setSelectedDropId(null))
    }

    buildEarthTexture(mapboxToken)
      .then((earthTexture) => {
        if (cancelled || !globeCanvasRef.current) return
        engineRef.current = new GlobeEngine({
          canvas: globeCanvasRef.current,
          earthTexture,
          onDive: handleDive,
          onMarkerSelect: (id) => {
            const drop = dropsRef.current.find((item) => item.id === id)
            if (drop) selectDropRef.current?.(drop)
          },
        })
        engineRef.current.resize(shell.clientWidth, shell.clientHeight)
        setEngineReady(true)
        setPhase('globe')
      })
      .catch(() => {
        if (!cancelled) setPhase('globe')
      })

    const observer = new ResizeObserver(() => {
      engineRef.current?.resize(shell.clientWidth, shell.clientHeight)
      mapRef.current?.resize()
    })
    observer.observe(shell)

    return () => {
      cancelled = true
      observer.disconnect()
      engineRef.current?.dispose()
      engineRef.current = null
      mapMarkersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
    // マウント時に一度だけ初期化する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Dropデータの読み込み(ログイン時はFirestore、未ログインはデモ) -----
  useEffect(() => {
    let ignore = false

    const applyDemo = () => {
      if (ignore) return
      setDrops(DEMO_DROPS)
      setFolders(DEMO_FOLDERS)
      setIsPreview(true)
    }

    const load = (uid: string) => {
      Promise.all([listDrops(uid), listFolders(uid)])
        .then(([nextDrops, nextFolders]) => {
          if (ignore) return
          setDrops(nextDrops)
          setFolders(nextFolders)
          setIsPreview(false)
        })
        .catch(() => applyDemo())
    }

    if (!hasFirebaseConfig()) {
      applyDemo()
      return
    }

    if (userId) {
      load(userId)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) load(user.uid)
      else applyDemo()
    })
    return () => {
      ignore = true
      unsubscribe()
    }
  }, [userId])

  // ----- Drop→マーカー反映(地球儀スプライトと地図ピン) -----
  useEffect(() => {
    dropsRef.current = drops
    let cancelled = false

    const applyGlobeMarkers = async () => {
      const markers = await Promise.all(
        filteredDrops.map(async (drop) => {
          let badge = badgeCacheRef.current.get(drop.id)
          if (!badge) {
            badge = await createPhotoBadge(drop.imageUrl)
            badgeCacheRef.current.set(drop.id, badge)
          }
          return { id: drop.id, lat: drop.lat, lng: drop.lng, image: badge, size: 0.105 }
        }),
      )
      if (!cancelled) engineRef.current?.setMarkers(markers)
    }
    if (engineReady) applyGlobeMarkers()

    mapMarkersRef.current.forEach((marker) => marker.remove())
    mapMarkersRef.current = []
    const map = mapRef.current
    if (map) {
      filteredDrops.forEach((drop) => {
        const element = createMapDropElement(drop, () => selectDropRef.current?.(drop))
        mapMarkersRef.current.push(
          new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat([drop.lng, drop.lat]).addTo(map),
        )
      })
      const source = map.getSource('chieko-heat') as mapboxgl.GeoJSONSource | undefined
      source?.setData(buildDropHeatData(drops) as never)
    }

    return () => {
      cancelled = true
    }
  }, [drops, filteredDrops, engineReady])

  useEffect(() => {
    heatOnRef.current = heatOn
    const map = mapRef.current
    if (map?.getLayer('chieko-heat')) {
      map.setLayoutProperty('chieko-heat', 'visibility', heatOn ? 'visible' : 'none')
    }
  }, [heatOn])

  const handleBackToGlobe = () => {
    mapRef.current?.easeTo({ zoom: 1.6, duration: 1000 })
  }

  const shellStyle = { '--globe-top': `${topInset}px`, '--globe-bottom': `${bottomInset}px` } as CSSProperties

  return (
    <div className={styles.shell} ref={shellRef} style={shellStyle}>
      <canvas className={styles.globeCanvas} ref={globeCanvasRef} aria-label="Dropの地球儀" />
      <div className={mapVisible ? `${styles.mapWrap} ${styles.mapWrapVisible}` : styles.mapWrap} ref={mapContainerRef} />

      <header className={styles.topBar}>
        <div className={styles.searchPill} role="search">
          <span aria-hidden>🔍</span>
          <span>場所、Dropを検索</span>
        </div>
        <button
          className={styles.roundBtn}
          type="button"
          aria-label="マップ設定"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          ⚙️
        </button>
      </header>

      <div className={styles.statsRow} aria-label="Dropの統計">
        <span className={styles.statChip}>
          <strong>{stats.countries}</strong>カ国
        </span>
        <span className={styles.statChip}>
          <strong>{stats.cities}</strong>都市
        </span>
        <span className={styles.statChip}>
          <strong>{stats.drops}</strong>Drops
        </span>
      </div>

      {isPreview ? <span className={styles.previewTag}>デモデータ</span> : null}

      <div className={styles.chipsRow} aria-label="フォルダフィルター">
        <button
          className={activeFolderId === 'all' ? `${styles.chip} ${styles.chipActive}` : styles.chip}
          type="button"
          onClick={() => setActiveFolderId('all')}
        >
          All
        </button>
        {folders.map((folder) => (
          <button
            className={activeFolderId === folder.id ? `${styles.chip} ${styles.chipActive}` : styles.chip}
            key={folder.id}
            type="button"
            onClick={() => setActiveFolderId(folder.id)}
          >
            {folder.name}
          </button>
        ))}
      </div>

      {settingsOpen ? (
        <div className={styles.settingsCard}>
          <strong>マップ設定</strong>
          <button className={styles.settingRow} type="button" onClick={() => setHeatOn((value) => !value)} aria-pressed={heatOn}>
            <span>
              <span aria-hidden>🔥</span> 足あとヒート
            </span>
            <span className={heatOn ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}>
              <span className={styles.toggleKnob} />
            </span>
          </button>
          <p className={styles.settingHint}>Dropした場所が地図上で熱として光ります。</p>
        </div>
      ) : null}

      {!mapboxToken ? (
        <p className={styles.tokenWarn}>NEXT_PUBLIC_MAPBOX_TOKEN を設定すると衛星写真と地図が表示されます。</p>
      ) : null}

      {phase !== 'loading' && drops.length === 0 ? (
        <div className={styles.emptyCard}>
          <strong>まだDropがありません</strong>
          <p>写真をDropすると、あなたの地球に思い出のピンが立ちます。</p>
          {onRequestDrop ? (
            <button className={styles.primaryAction} type="button" onClick={onRequestDrop}>
              📸 最初のDropをする
            </button>
          ) : null}
        </div>
      ) : null}

      {selectedDrop ? (
        <div className={styles.friendDetail}>
          <img className={styles.dropDetailImage} src={selectedDrop.imageUrl} alt={selectedDrop.placeName} />
          <div className={styles.friendDetailBody}>
            <strong>{selectedDrop.placeName}</strong>
            <span>
              {formatDropDate(selectedDrop.takenAt)}
              {selectedFolderName ? ` ・ ${selectedFolderName}` : ''}
            </span>
            {selectedDrop.caption ? <span>{selectedDrop.caption}</span> : null}
          </div>
          <div className={styles.friendDetailActions}>
            <button className={styles.primaryAction} type="button" onClick={() => selectDropRef.current?.(selectedDrop)}>
              場所へ
            </button>
            <button className={styles.closeAction} type="button" aria-label="閉じる" onClick={() => setSelectedDropId(null)}>
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <footer className={styles.bottomArea}>
        <div className={styles.friendsScroller} aria-label="Drop一覧">
          {filteredDrops.map((drop) => (
            <button
              className={drop.id === selectedDropId ? `${styles.friendCard} ${styles.friendCardActive}` : styles.friendCard}
              key={drop.id}
              type="button"
              onClick={() => selectDropRef.current?.(drop)}
            >
              <img className={styles.dropThumb} src={drop.imageUrl} alt="" />
              <span className={styles.friendCardBody}>
                <strong>{drop.placeName}</strong>
                <span>{formatDropDate(drop.takenAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </footer>

      {phase === 'map' ? (
        <button className={styles.globeBtn} type="button" aria-label="地球儀に戻る" onClick={handleBackToGlobe}>
          🌍
        </button>
      ) : null}

      {phase === 'loading' ? (
        <div className={styles.loadingOverlay}>
          <span className={styles.spinner} aria-hidden />
          <p>あなたの地球を準備中…</p>
        </div>
      ) : null}
    </div>
  )
}
