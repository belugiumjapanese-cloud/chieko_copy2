'use client'

import { onAuthStateChanged } from 'firebase/auth'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { listDrops, listFolders } from '../lib/dropService'
import { auth, hasFirebaseConfig } from '../lib/firebase'
import { calculateStats, formatDropDate } from '../lib/geo'
import type { DropDoc, DropFolder } from '../lib/types'
import { createPhotoBadge } from './lib/badges'
import { DEMO_DROPS, DEMO_FOLDERS } from './lib/demoDrops'
import { buildEarthTexture } from './lib/earthTexture'
import { GlobeEngine, type GlobeView } from './lib/globeEngine'
import { buildDropHeatData, HEAT_LAYER_PAINT } from './lib/heat'
import {
  DEFAULT_MAP_THEME_ID,
  DROP_MAP_THEMES,
  applyDropMapTheme,
  createCustomMapTheme,
  getDropMapTheme,
  isDropMapThemeId,
  type DropMapColorKey,
  type DropMapTheme,
  type DropMapThemeColors,
} from './lib/mapThemes'
import styles from './snap-globe.module.css'

type DropGlobeProps = {
  mapboxToken?: string
  mapboxStyle?: string
  userId?: string
  /** 親アプリのヘッダー分だけUIを下げる(px) */
  topInset?: number
  /** 親アプリの下部ナビ分だけUIを上げる(px) */
  bottomInset?: number
  onRequestDrop?: () => void
  /** ライブラリ等から飛んできたとき、この座標へダイブする */
  focusTarget?: { id?: string; lng: number; lat: number } | null
  onFocusConsumed?: () => void
  /** Profileの地球プレビューから、直接Three.js地球状態を開くためのシグナル */
  showGlobeSignal?: number
}

type Phase = 'loading' | 'globe' | 'diving' | 'map' | 'surfacing'

const GLOBE_SWITCH_ZOOM = 4
const MAP_RETURN_ZOOM = 5.2
const MAP_DEFAULT_ZOOM = 11.4
const DIVE_START_ZOOM = 4.6
const FADE_MS = 420
const THEME_STORAGE_KEY = 'chieko-drop-map-theme'
const CUSTOM_COLORS_STORAGE_KEY = 'chieko-drop-map-custom-colors'
const DEFAULT_THEME = getDropMapTheme(DEFAULT_MAP_THEME_ID)
const DEFAULT_MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL ??
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ??
  'mapbox://styles/belgium-jap/cmp8riesh001j01sngrwfbdsz'

const CUSTOM_COLOR_FIELDS: { key: DropMapColorKey; label: string }[] = [
  { key: 'water', label: '海' },
  { key: 'land', label: '陸' },
  { key: 'park', label: '公園' },
  { key: 'road', label: '道路' },
  { key: 'building', label: '建物' },
  { key: 'text', label: '文字' },
  { key: 'halo', label: '文字ふち' },
  { key: 'fog', label: '空気感' },
  { key: 'highFog', label: '遠景' },
  { key: 'space', label: '宇宙' },
]

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

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

function readStoredColors(baseColors: DropMapThemeColors): DropMapThemeColors {
  try {
    const raw = window.localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY)
    if (!raw) return baseColors
    const parsed = JSON.parse(raw) as Partial<Record<DropMapColorKey, unknown>>
    return CUSTOM_COLOR_FIELDS.reduce<DropMapThemeColors>(
      (colors, field) => ({ ...colors, [field.key]: isHexColor(parsed[field.key]) ? parsed[field.key] : colors[field.key] }),
      { ...baseColors },
    )
  } catch {
    return baseColors
  }
}

export function DropGlobe({
  mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
  mapboxStyle = DEFAULT_MAPBOX_STYLE,
  userId,
  topInset = 0,
  bottomInset = 0,
  onRequestDrop,
  focusTarget = null,
  onFocusConsumed,
  showGlobeSignal = 0,
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
  const activeThemeRef = useRef<DropMapTheme>(DEFAULT_THEME)
  const sheetTouchStartRef = useRef<number | null>(null)
  const lastMapViewRef = useRef({ lng: 139.7, lat: 35.66, zoom: MAP_DEFAULT_ZOOM })

  const [phase, setPhaseState] = useState<Phase>('loading')
  const [engineReady, setEngineReady] = useState(false)
  const [mapVisible, setMapVisible] = useState(false)
  const [drops, setDrops] = useState<DropDoc[]>([])
  const [folders, setFolders] = useState<DropFolder[]>([])
  const [isPreview, setIsPreview] = useState(false)
  const [activeFolderId, setActiveFolderId] = useState('all')
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [focusFlashId, setFocusFlashId] = useState(0)
  const [heatOn, setHeatOn] = useState(true)
  const [activeThemeId, setActiveThemeId] = useState(DEFAULT_MAP_THEME_ID)
  const [customColors, setCustomColors] = useState<DropMapThemeColors>(DEFAULT_THEME.colors)

  const activeTheme = useMemo(
    () => createCustomMapTheme(getDropMapTheme(activeThemeId), customColors),
    [activeThemeId, customColors],
  )

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhaseState(next)
  }, [])

  const rememberMapView = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const center = map.getCenter()
    lastMapViewRef.current = { lng: center.lng, lat: center.lat, zoom: map.getZoom() }
  }, [])

  const enterGlobe = useCallback(() => {
    const map = mapRef.current
    const engine = engineRef.current
    rememberMapView()
    if (map && engine) {
      const center = map.getCenter()
      engine.resetView(center.lng, center.lat)
      engine.setPaused(false)
    }
    setPhase('surfacing')
    setMapVisible(false)
    window.setTimeout(() => setPhase('globe'), FADE_MS)
  }, [rememberMapView, setPhase])

  const enterMap = useCallback(
    (target?: { lng: number; lat: number; zoom?: number }) => {
      const map = mapRef.current
      if (!map) return
      const view = target ?? lastMapViewRef.current
      setPhase('diving')
      setMapVisible(true)
      engineRef.current?.setPaused(true)
      map.easeTo({
        center: [view.lng, view.lat],
        zoom: Math.max(view.zoom ?? MAP_RETURN_ZOOM, MAP_RETURN_ZOOM),
        duration: 420,
        essential: true,
      })
      window.setTimeout(() => setPhase('map'), FADE_MS)
    },
    [setPhase],
  )

  const applyThemeToMap = useCallback((theme: DropMapTheme) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    applyDropMapTheme(map, theme)
    map.setFog({
      color: theme.colors.fog,
      'high-color': theme.colors.highFog,
      'horizon-blend': 0.035,
      'space-color': theme.colors.space,
      'star-intensity': theme.id === 'ink' ? 0.32 : 0.18,
    })
  }, [])

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const nextThemeId = savedTheme && isDropMapThemeId(savedTheme) ? savedTheme : DEFAULT_MAP_THEME_ID
    const nextTheme = getDropMapTheme(nextThemeId)
    setActiveThemeId(nextThemeId)
    setCustomColors(readStoredColors(nextTheme.colors))
  }, [])

  useEffect(() => {
    activeThemeRef.current = activeTheme
    applyThemeToMap(activeTheme)
  }, [activeTheme, applyThemeToMap])

  useEffect(() => {
    if (!engineReady) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      buildEarthTexture(mapboxToken, { styleUrl: mapboxStyle, palette: activeTheme.globe })
        .then((earthTexture) => {
          if (!cancelled) engineRef.current?.setEarthTexture(earthTexture)
        })
        .catch(() => undefined)
    }, 420)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeTheme, engineReady, mapboxStyle, mapboxToken])

  useEffect(() => {
    if (!showGlobeSignal || !engineReady) return
    enterGlobe()
  }, [enterGlobe, engineReady, showGlobeSignal])

  const handleThemeChange = (themeId: string) => {
    if (!isDropMapThemeId(themeId)) return
    const nextTheme = getDropMapTheme(themeId)
    setActiveThemeId(themeId)
    setCustomColors(nextTheme.colors)
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
    window.localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(nextTheme.colors))
  }

  const handleCustomColorChange = (key: DropMapColorKey, value: string) => {
    if (!isHexColor(value)) return
    setCustomColors((current) => {
      const next = { ...current, [key]: value }
      window.localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleResetCustomColors = () => {
    const nextColors = getDropMapTheme(activeThemeId).colors
    setCustomColors(nextColors)
    window.localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(nextColors))
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
    setSheetExpanded(true)
    setFocusFlashId((current) => current + 1)
    if (phaseRef.current === 'map' && mapRef.current) {
      rememberMapView()
      mapRef.current.flyTo({ center: [drop.lng, drop.lat], zoom: 14.5, duration: 600, essential: true })
    } else if (phaseRef.current === 'globe' && engineRef.current) {
      pendingDropRef.current = drop
      engineRef.current.flyToAndDive(drop.lng, drop.lat)
    }
  }

  // ----- 地球儀とMapboxの初期化 -----
  useEffect(() => {
    const canvas = globeCanvasRef.current
    const shell = shellRef.current
    const mapContainer = mapContainerRef.current
    if (!canvas || !shell || !mapContainer) return

    let cancelled = false
    setEngineReady(false)
    setMapVisible(false)
    setPhase('loading')

    const handleDive = (center: GlobeView) => {
      const map = mapRef.current
      if (!map) {
        engineRef.current?.resetView(center.lng, center.lat)
        return
      }
      setPhase('diving')
      setMapVisible(true)
      engineRef.current?.setPaused(true)
      map.easeTo({ center: [center.lng, center.lat], zoom: MAP_RETURN_ZOOM, bearing: 0, pitch: 0, duration: 420 })
      window.setTimeout(() => {
        if (cancelled) return
        setPhase('map')
        const pending = pendingDropRef.current
        pendingDropRef.current = null
        if (pending) {
          map.flyTo({ center: [pending.lng, pending.lat], zoom: 14.5, duration: 600, essential: true })
        }
      }, FADE_MS)
    }

    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken
      const map = new mapboxgl.Map({
        container: mapContainer,
        style: mapboxStyle,
        projection: { name: 'globe' },
        center: [139.7, 35.66],
        zoom: MAP_DEFAULT_ZOOM,
        attributionControl: true,
      })
      mapRef.current = map

      map.on('style.load', () => {
        const theme = activeThemeRef.current
        applyThemeToMap(theme)
        if (!map.getSource('chieko-heat')) {
          map.addSource('chieko-heat', { type: 'geojson', data: buildDropHeatData(dropsRef.current) })
          map.addLayer({ id: 'chieko-heat', type: 'heatmap', source: 'chieko-heat', paint: HEAT_LAYER_PAINT as never })
          map.setLayoutProperty('chieko-heat', 'visibility', heatOnRef.current ? 'visible' : 'none')
        }
      })

      map.on('moveend', rememberMapView)
      map.on('zoomend', () => {
        rememberMapView()
        if (map.getZoom() < GLOBE_SWITCH_ZOOM) enterGlobe()
      })

      map.on('click', () => {
        setSelectedDropId(null)
        setSheetExpanded(false)
      })
    }

    buildEarthTexture(mapboxToken, { styleUrl: mapboxStyle, palette: activeThemeRef.current.globe })
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
        if (mapboxToken && mapRef.current) {
          engineRef.current.setPaused(true)
          setMapVisible(true)
          setPhase('map')
        } else {
          setPhase('globe')
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (mapboxToken && mapRef.current) {
            setMapVisible(true)
            setPhase('map')
          } else {
            setPhase('globe')
          }
        }
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
  }, [applyThemeToMap, enterGlobe, mapboxStyle, mapboxToken, rememberMapView, setPhase])

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

  // ----- ライブラリ等から渡されたピンへ飛ぶ -----
  useEffect(() => {
    if (!focusTarget || !engineReady) return
    const drop = dropsRef.current.find((item) => item.id === focusTarget.id)
    if (drop) {
      selectDropRef.current?.(drop)
    } else if (phaseRef.current === 'map' && mapRef.current) {
      mapRef.current.flyTo({ center: [focusTarget.lng, focusTarget.lat], zoom: 14.5, duration: 600, essential: true })
    } else if (phaseRef.current === 'globe') {
      engineRef.current?.flyToAndDive(focusTarget.lng, focusTarget.lat)
    }
    onFocusConsumed?.()
    // フォーカス対象が変わったときだけ実行する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget, engineReady])

  const handleBackToGlobe = () => {
    enterGlobe()
  }

  const handleGlobeWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (phaseRef.current === 'globe' && event.deltaY < -18) enterMap()
  }

  const handleSheetTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    sheetTouchStartRef.current = event.touches[0]?.clientY ?? null
  }

  const handleSheetTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = sheetTouchStartRef.current
    sheetTouchStartRef.current = null
    if (start === null) return
    const end = event.changedTouches[0]?.clientY ?? start
    const distance = start - end
    if (distance > 32) setSheetExpanded(true)
    if (distance < -32) setSheetExpanded(false)
  }

  const closeSelectedDrop = () => {
    const view = lastMapViewRef.current
    setSelectedDropId(null)
    setSheetExpanded(false)
    if (phaseRef.current === 'map') {
      mapRef.current?.easeTo({ center: [view.lng, view.lat], zoom: view.zoom, duration: 420, essential: true })
    }
  }

  const shellStyle = { '--globe-top': `${topInset}px`, '--globe-bottom': `${bottomInset}px` } as CSSProperties

  return (
    <div className={styles.shell} ref={shellRef} style={shellStyle}>
      <canvas className={styles.globeCanvas} ref={globeCanvasRef} aria-label="Dropの地球儀" onWheel={handleGlobeWheel} />
      <div className={mapVisible ? `${styles.mapWrap} ${styles.mapWrapVisible}` : styles.mapWrap} ref={mapContainerRef} />

      {selectedDrop ? <button className={styles.pinFocusBackdrop} type="button" aria-label="Drop詳細を閉じる" onClick={closeSelectedDrop} /> : null}
      {focusFlashId > 0 && selectedDrop ? <span className={styles.pinFocusFlash} key={focusFlashId} aria-hidden /> : null}
      {searchOpen ? <button className={styles.searchDismiss} type="button" aria-label="検索を閉じる" onClick={() => setSearchOpen(false)} /> : null}

      <header className={searchOpen ? `${styles.topBar} ${styles.topBarSearchOpen}` : styles.topBar}>
        {searchOpen ? (
          <div className={styles.searchPill} role="search">
            <span aria-hidden>検索</span>
            <span>場所、Dropを検索</span>
          </div>
        ) : (
          <button className={styles.searchIconBtn} type="button" aria-label="検索を開く" onClick={() => setSearchOpen(true)}>
            <span aria-hidden>検索</span>
          </button>
        )}
        <button
          className={styles.roundBtn}
          type="button"
          aria-label="マップ設定"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          設定
        </button>
      </header>

      <div className={styles.momentumBadge}>今週 3 Drops · 周辺に {filteredDrops.length} pins</div>

      <div className={styles.statsRow} aria-label="Dropの統計">
        <span className={styles.statChip}>
          <strong>{stats.countries}</strong>
          <span>カ国</span>
        </span>
        <span className={styles.statChip}>
          <strong>{stats.cities}</strong>
          <span>都市</span>
        </span>
        <span className={styles.statChip}>
          <strong>{stats.drops}</strong>
          <span>Drops</span>
        </span>
      </div>

      {isPreview && process.env.NODE_ENV === 'development' ? <span className={styles.previewTag}>デモデータ</span> : null}

      {settingsOpen ? (
        <div className={styles.settingsCard}>
          <strong>マップ設定</strong>
          <button className={styles.settingRow} type="button" onClick={() => setHeatOn((value) => !value)} aria-pressed={heatOn}>
            <span>
              <span aria-hidden>heat</span> 足あとヒート
            </span>
            <span className={heatOn ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}>
              <span className={styles.toggleKnob} />
            </span>
          </button>
          <p className={styles.settingHint}>Dropした場所が地図上で熱として光ります。</p>
          <div className={styles.themeSection}>
            <span className={styles.themeLabel}>地図の色</span>
            <div className={styles.themeGrid} aria-label="地図の色テーマ">
              {DROP_MAP_THEMES.map((theme) => (
                <button
                  className={theme.id === activeTheme.id ? `${styles.themeButton} ${styles.themeButtonActive}` : styles.themeButton}
                  key={theme.id}
                  type="button"
                  aria-pressed={theme.id === activeTheme.id}
                  onClick={() => handleThemeChange(theme.id)}
                >
                  <span
                    className={styles.themeSwatch}
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.water} 0 48%, ${theme.colors.land} 49% 100%)`,
                    }}
                    aria-hidden
                  />
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.customColorSection}>
            <div className={styles.customColorHeader}>
              <span className={styles.themeLabel}>細かく調整</span>
              <button className={styles.resetColorsButton} type="button" onClick={handleResetCustomColors}>
                Reset
              </button>
            </div>
            <div className={styles.customColorGrid} aria-label="地図色の詳細設定">
              {CUSTOM_COLOR_FIELDS.map((field) => (
                <label className={styles.colorControl} key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type="color"
                    value={customColors[field.key]}
                    aria-label={`${field.label}の色`}
                    onChange={(event) => handleCustomColorChange(field.key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!mapboxToken ? (
        <p className={styles.tokenWarn}>NEXT_PUBLIC_MAPBOX_TOKEN を設定するとMapboxの地図が表示されます。</p>
      ) : null}

      {phase !== 'loading' && drops.length === 0 ? (
        <div className={styles.emptyCard}>
          <strong>まだDropがありません</strong>
          <p>写真をDropすると、あなたの地球に思い出のピンが立ちます。</p>
          {onRequestDrop ? (
            <button className={styles.primaryAction} type="button" onClick={onRequestDrop}>
              最初のDropをする
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
            <button className={styles.closeAction} type="button" aria-label="閉じる" onClick={closeSelectedDrop}>
              ×
            </button>
          </div>
        </div>
      ) : null}

      <footer
        className={sheetExpanded ? `${styles.bottomArea} ${styles.bottomAreaExpanded}` : styles.bottomArea}
        onTouchStart={handleSheetTouchStart}
        onTouchEnd={handleSheetTouchEnd}
      >
        <button
          className={styles.sheetHandleBtn}
          type="button"
          aria-label={sheetExpanded ? 'Dropカードを小さくする' : 'Dropカードを広げる'}
          onClick={() => setSheetExpanded((expanded) => !expanded)}
        />
        <div
          className={sheetExpanded ? `${styles.chipsRow} ${styles.chipsRowVisible}` : styles.chipsRow}
          aria-label="フォルダフィルター"
        >
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
          Globe
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
