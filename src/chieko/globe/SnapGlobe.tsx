'use client'

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef, useState } from 'react'
import { buildEarthTexture } from './lib/earthTexture'
import { createAvatarBadge, DEMO_FRIENDS, DEMO_ME, formatLastActive, type GlobeFriend } from './lib/friends'
import { GlobeEngine, type GlobeView } from './lib/globeEngine'
import { buildHeatData, HEAT_LAYER_PAINT } from './lib/heat'
import styles from './snap-globe.module.css'

type SnapGlobeProps = {
  mapboxToken?: string
  friends?: GlobeFriend[]
  me?: GlobeFriend
}

type Phase = 'loading' | 'globe' | 'diving' | 'map' | 'surfacing'

const SURFACE_ZOOM = 2.05
const DIVE_START_ZOOM = 2.2
const FADE_MS = 480

function createMapAvatarElement(friend: GlobeFriend, isMe: boolean, onSelect: () => void) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = isMe ? `${styles.mapFriend} ${styles.mapMe}` : styles.mapFriend
  element.setAttribute('aria-label', friend.name)

  if (isMe) {
    const pulse = document.createElement('span')
    pulse.className = styles.mePulse
    element.append(pulse)
  }

  const avatar = document.createElement('span')
  avatar.className = styles.mapFriendAvatar
  avatar.textContent = friend.emoji

  const name = document.createElement('span')
  name.className = styles.mapFriendName
  name.textContent = isMe ? '自分' : friend.name

  element.append(avatar, name)
  element.addEventListener('click', (event) => {
    event.stopPropagation()
    onSelect()
  })
  return element
}

export function SnapGlobe({
  mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
  friends = DEMO_FRIENDS,
  me = DEMO_ME,
}: SnapGlobeProps) {
  const globeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<GlobeEngine | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const meMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const phaseRef = useRef<Phase>('loading')
  const pendingFriendRef = useRef<GlobeFriend | null>(null)
  const friendsRef = useRef(friends)
  friendsRef.current = friends

  const [phase, setPhaseState] = useState<Phase>('loading')
  const [mapVisible, setMapVisible] = useState(false)
  const [ghostMode, setGhostMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)

  const setPhase = (next: Phase) => {
    phaseRef.current = next
    setPhaseState(next)
  }

  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId) ?? null

  useEffect(() => {
    const canvas = globeCanvasRef.current
    const shell = shellRef.current
    const mapContainer = mapContainerRef.current
    if (!canvas || !shell || !mapContainer) return

    let cancelled = false

    const handleDive = (center: GlobeView) => {
      const map = mapRef.current
      if (!map) {
        // Mapbox が使えないときは少し戻して地球儀のまま続行する。
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
        const pending = pendingFriendRef.current
        pendingFriendRef.current = null
        if (pending) {
          map.flyTo({ center: [pending.lng, pending.lat], zoom: 13.5, duration: 2400, essential: true })
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

    const selectFriendFromGlobe = (id: string) => {
      const friend = friendsRef.current.find((item) => item.id === id)
      if (!friend || id === 'me') return
      setSelectedFriendId(id)
      pendingFriendRef.current = friend
      engineRef.current?.flyToAndDive(friend.lng, friend.lat)
    }

    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken
      const map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        projection: { name: 'globe' },
        center: [me.lng, me.lat],
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
          map.addSource('chieko-heat', { type: 'geojson', data: buildHeatData() })
          map.addLayer({
            id: 'chieko-heat',
            type: 'heatmap',
            source: 'chieko-heat',
            paint: HEAT_LAYER_PAINT as never,
          })
        }
      })

      map.on('zoomend', () => {
        if (map.getZoom() < SURFACE_ZOOM) surfaceToGlobe()
      })

      friendsRef.current.forEach((friend) => {
        const element = createMapAvatarElement(friend, false, () => {
          setSelectedFriendId(friend.id)
          map.flyTo({ center: [friend.lng, friend.lat], zoom: 14, duration: 1600, essential: true })
        })
        new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat([friend.lng, friend.lat]).addTo(map)
      })

      const meElement = createMapAvatarElement(me, true, () => setSelectedFriendId(null))
      meMarkerRef.current = new mapboxgl.Marker({ element: meElement, anchor: 'bottom' })
        .setLngLat([me.lng, me.lat])
        .addTo(map)
    }

    buildEarthTexture(mapboxToken)
      .then((earthTexture) => {
        if (cancelled || !globeCanvasRef.current) return
        const markers = [
          ...friendsRef.current.map((friend) => ({
            id: friend.id,
            lat: friend.lat,
            lng: friend.lng,
            image: createAvatarBadge(friend.emoji),
          })),
          { id: 'me', lat: me.lat, lng: me.lng, image: createAvatarBadge(me.emoji, { ring: '#fffc00' }), size: 0.125 },
        ]
        engineRef.current = new GlobeEngine({
          canvas: globeCanvasRef.current,
          earthTexture,
          markers,
          onDive: handleDive,
          onMarkerSelect: selectFriendFromGlobe,
        })
        engineRef.current.resize(shell.clientWidth, shell.clientHeight)
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
      mapRef.current?.remove()
      mapRef.current = null
      meMarkerRef.current = null
    }
    // マウント時に一度だけ初期化する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.setMarkerHidden('me', ghostMode)
    const element = meMarkerRef.current?.getElement()
    if (element) element.style.display = ghostMode ? 'none' : ''
  }, [ghostMode, phase])

  const handleFriendCardSelect = (friend: GlobeFriend) => {
    setSelectedFriendId(friend.id)
    if (phaseRef.current === 'map' && mapRef.current) {
      mapRef.current.flyTo({ center: [friend.lng, friend.lat], zoom: 14, duration: 1600, essential: true })
    } else if (phaseRef.current === 'globe') {
      pendingFriendRef.current = friend
      engineRef.current?.flyToAndDive(friend.lng, friend.lat)
    }
  }

  const handleBackToGlobe = () => {
    mapRef.current?.easeTo({ zoom: 1.6, duration: 1000 })
  }

  const handleGoToSelected = () => {
    if (!selectedFriend) return
    handleFriendCardSelect(selectedFriend)
  }

  return (
    <div className={styles.shell} ref={shellRef}>
      <canvas className={styles.globeCanvas} ref={globeCanvasRef} aria-label="地球儀" />
      <div className={mapVisible ? `${styles.mapWrap} ${styles.mapWrapVisible}` : styles.mapWrap} ref={mapContainerRef} />

      <header className={styles.topBar}>
        <button className={styles.roundBtn} type="button" aria-label="プロフィール">
          {me.emoji}
        </button>
        <div className={styles.searchPill} role="search">
          <span aria-hidden>🔍</span>
          <span>検索</span>
        </div>
        <button
          className={styles.roundBtn}
          type="button"
          aria-label="設定"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          ⚙️
        </button>
      </header>

      {ghostMode ? (
        <div className={styles.ghostBanner}>
          <span aria-hidden>👻</span>
          ゴーストモード中 — 友達からは見えません
        </div>
      ) : null}

      {settingsOpen ? (
        <div className={styles.settingsCard}>
          <strong>マップ設定</strong>
          <button
            className={styles.settingRow}
            type="button"
            onClick={() => setGhostMode((value) => !value)}
            aria-pressed={ghostMode}
          >
            <span>
              <span aria-hidden>👻</span> ゴーストモード
            </span>
            <span className={ghostMode ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}>
              <span className={styles.toggleKnob} />
            </span>
          </button>
          <p className={styles.settingHint}>オンにすると自分の現在地がマップに表示されなくなります。</p>
        </div>
      ) : null}

      {!mapboxToken ? (
        <p className={styles.tokenWarn}>NEXT_PUBLIC_MAPBOX_TOKEN を設定すると衛星写真と地図が表示されます。</p>
      ) : null}

      {selectedFriend ? (
        <div className={styles.friendDetail}>
          <span className={styles.friendDetailAvatar} aria-hidden>
            {selectedFriend.emoji}
          </span>
          <div className={styles.friendDetailBody}>
            <strong>{selectedFriend.name}</strong>
            <span>
              {selectedFriend.place} ・ {formatLastActive(selectedFriend.lastActiveMinutes)}
            </span>
            <span>{selectedFriend.status}</span>
          </div>
          <div className={styles.friendDetailActions}>
            <button className={styles.primaryAction} type="button" onClick={handleGoToSelected}>
              場所へ
            </button>
            <button className={styles.closeAction} type="button" aria-label="閉じる" onClick={() => setSelectedFriendId(null)}>
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <footer className={styles.bottomArea}>
        <div className={styles.friendsScroller} aria-label="フレンド一覧">
          {friends.map((friend) => (
            <button
              className={
                friend.id === selectedFriendId ? `${styles.friendCard} ${styles.friendCardActive}` : styles.friendCard
              }
              key={friend.id}
              type="button"
              onClick={() => handleFriendCardSelect(friend)}
            >
              <span className={styles.friendCardAvatar} aria-hidden>
                {friend.emoji}
              </span>
              <span className={styles.friendCardBody}>
                <strong>{friend.name}</strong>
                <span>
                  {friend.place} ・ {formatLastActive(friend.lastActiveMinutes)}
                </span>
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
          <p>地球を準備中…</p>
        </div>
      ) : null}
    </div>
  )
}
