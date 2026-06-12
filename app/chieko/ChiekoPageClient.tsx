'use client'

import mapboxgl from 'mapbox-gl'
import {
  BookOpen,
  Camera,
  Folder,
  Heart,
  MapPinned,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DropUploader, FolderList, OnThisDayBanner, UndropedMemories } from '../../src/chieko'
import { hasFirebaseConfig } from '../../src/chieko/lib/firebase'
import styles from './chieko-page.module.css'

type AppTab = 'community' | 'library' | 'drop' | 'profile'
type SheetMode = 'drop' | 'memories' | 'folders' | null

const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11'
const DEFAULT_CENTER: [number, number] = [4.3517, 50.8503]

const navItems: Array<{ id: AppTab; label: string; Icon: LucideIcon }> = [
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'library', label: 'Library', Icon: BookOpen },
  { id: 'drop', label: 'Drop', Icon: MapPinned },
  { id: 'profile', label: 'Profile', Icon: UserRound },
]

const mapFilters = ['My pins', 'Follow', 'Chaos', 'Wish', 'Architecture', 'Cafe', 'Shops']

const mapSpots = [
  {
    id: 'home-corner',
    label: 'Corner sign',
    area: 'Ixelles',
    x: 35,
    y: 37,
    color: '#ffcf3f',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'museum-day',
    label: 'Museum day',
    area: 'Parc Leopold',
    x: 63,
    y: 30,
    color: '#57c7ff',
    imageUrl: 'https://images.unsplash.com/photo-1565060169187-2f105f0b8f51?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'window-walk',
    label: 'Quiet window',
    area: 'Louise',
    x: 55,
    y: 57,
    color: '#ff8db3',
    imageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=240&q=80',
  },
  {
    id: 'coffee-note',
    label: 'Cafe note',
    area: 'Saint-Gilles',
    x: 24,
    y: 62,
    color: '#6ee7b7',
    imageUrl: 'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=240&q=80',
  },
]

const communityCards = [
  { title: 'City Details', meta: '803 members', tone: '#57c7ff' },
  { title: 'Architecture Club', meta: '412 pins', tone: '#ffcf3f' },
  { title: 'Cafe windows', meta: '88 new drops', tone: '#ff8db3' },
]

const libraryCards = [
  { title: 'My pins', body: '写真から作った自分だけの世界地図', Icon: Heart },
  { title: 'Folders', body: 'To Visit / Wish / Cafe / Shops', Icon: Folder },
  { title: 'Memories', body: 'まだDropしていない写真を探す', Icon: Sparkles },
]

function SnapMapSurface({ onOpenSheet }: { onOpenSheet: (mode: SheetMode) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [selectedSpotId, setSelectedSpotId] = useState(mapSpots[0].id)
  const selectedSpot = useMemo(
    () => mapSpots.find((spot) => spot.id === selectedSpotId) ?? mapSpots[0],
    [selectedSpotId],
  )

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
    if (!containerRef.current || !token) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: DEFAULT_CENTER,
      zoom: 12,
      attributionControl: false,
      interactive: true,
    })
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <section className={styles.mapScreen} aria-label="Drop map">
      <div className={styles.mapBackground}>
        <div className={styles.fallbackMap} aria-hidden="true">
          <span className={styles.waterOne} />
          <span className={styles.waterTwo} />
          <span className={styles.parkOne} />
          <span className={styles.parkTwo} />
          <span className={styles.roadOne} />
          <span className={styles.roadTwo} />
          <span className={styles.roadThree} />
        </div>
        <div ref={containerRef} className={styles.mapCanvas} />
      </div>

      <div className={styles.mapTopLayer}>
        <button className={styles.searchPill} type="button">
          <Search aria-hidden="true" size={18} />
          <span>場所、pinを検索</span>
        </button>
        <div className={styles.filterRail} aria-label="map filters">
          {mapFilters.map((filter) => (
            <button className={styles.filterChip} key={filter} type="button">
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.storyRail} aria-label="friend drops">
        {mapSpots.map((spot) => (
          <button
            className={spot.id === selectedSpotId ? styles.activeStory : styles.storyBubble}
            key={spot.id}
            type="button"
            onClick={() => setSelectedSpotId(spot.id)}
          >
            <img src={spot.imageUrl} alt="" />
            <span>{spot.area}</span>
          </button>
        ))}
      </div>

      <div className={styles.pinLayer} aria-label="map pins">
        {mapSpots.map((spot) => (
          <button
            className={styles.snapPin}
            key={spot.id}
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, borderColor: spot.color }}
            type="button"
            onClick={() => setSelectedSpotId(spot.id)}
            aria-label={spot.label}
          >
            <img src={spot.imageUrl} alt="" />
          </button>
        ))}
      </div>

      <div className={styles.mapPeek}>
        <img src={selectedSpot.imageUrl} alt="" />
        <div>
          <strong>{selectedSpot.label}</strong>
          <span>{selectedSpot.area} · 今日のDrop候補</span>
        </div>
        <button className={styles.peekButton} type="button" onClick={() => onOpenSheet('drop')}>
          Drop
        </button>
      </div>
    </section>
  )
}

function CommunityView({ onBackToMap }: { onBackToMap: () => void }) {
  return (
    <section className={styles.panelScreen} aria-label="Community">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Community</span>
          <h2>みんなの地図</h2>
        </div>
        <button className={styles.smallIconButton} type="button" onClick={onBackToMap} aria-label="地図へ戻る">
          <MapPinned size={18} />
        </button>
      </div>
      <div className={styles.communityHero}>
        <div className={styles.communityGlobe} />
        <div>
          <strong>City Details</strong>
          <span>看板、窓、階段、街の小さい発見を共有</span>
        </div>
      </div>
      <div className={styles.cardStack}>
        {communityCards.map((card) => (
          <article className={styles.communityCard} key={card.title} style={{ borderColor: card.tone }}>
            <span style={{ background: card.tone }} />
            <div>
              <strong>{card.title}</strong>
              <p>{card.meta}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function LibraryView({ onOpenSheet }: { onOpenSheet: (mode: SheetMode) => void }) {
  return (
    <section className={styles.panelScreen} aria-label="Library">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Library</span>
          <h2>保存した世界</h2>
        </div>
      </div>
      <div className={styles.libraryGrid}>
        {libraryCards.map(({ title, body, Icon }) => (
          <button
            className={styles.libraryCard}
            key={title}
            type="button"
            onClick={() => {
              if (title === 'Folders') onOpenSheet('folders')
              if (title === 'Memories') onOpenSheet('memories')
            }}
          >
            <Icon aria-hidden="true" size={22} />
            <strong>{title}</strong>
            <span>{body}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function ProfileView() {
  return (
    <section className={styles.panelScreen} aria-label="Profile">
      <div className={styles.profileTop}>
        <img
          className={styles.profileAvatar}
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80"
          alt="Chieko"
        />
        <div>
          <span className={styles.eyebrow}>@chieko_nh</span>
          <h2>Chieko</h2>
          <p>Facade hunter. Windows, corners, street textures.</p>
        </div>
      </div>
      <div className={styles.profileStats}>
        <span>
          <strong>12</strong>
          Countries
        </span>
        <span>
          <strong>53</strong>
          Cities
        </span>
        <span>
          <strong>482</strong>
          Drops
        </span>
      </div>
      <div className={styles.profileMapPreview}>
        <span />
        <span />
        <span />
        <strong>My World</strong>
      </div>
    </section>
  )
}

function Sheet({ mode, onClose }: { mode: SheetMode; onClose: () => void }) {
  if (!mode) return null

  const title = mode === 'drop' ? 'Dropする' : mode === 'memories' ? 'まだDropしていない記憶' : 'Folders'

  return (
    <div className={styles.sheetBackdrop} role="presentation" onClick={onClose}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <strong>{title}</strong>
          <button className={styles.smallIconButton} type="button" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>
        <div className={styles.sheetBody}>
          {mode === 'drop' ? <DropUploader /> : null}
          {mode === 'memories' ? <UndropedMemories /> : null}
          {mode === 'folders' ? <FolderList /> : null}
        </div>
      </section>
    </div>
  )
}

export function ChiekoPageClient() {
  const [activeTab, setActiveTab] = useState<AppTab>('drop')
  const [sheetMode, setSheetMode] = useState<SheetMode>(null)
  const firebaseReady = hasFirebaseConfig()

  return (
    <main className={styles.shell}>
      <div className={styles.phoneApp}>
        <header className={styles.statusBar}>
          <span>Drop</span>
          <span className={firebaseReady ? styles.ready : styles.previewOnly}>{firebaseReady ? 'Firebase ready' : 'Preview'}</span>
        </header>

        <div className={styles.memoryBannerSlot}>
          <OnThisDayBanner />
        </div>

        <div className={styles.screenSlot}>
          {activeTab === 'drop' ? <SnapMapSurface onOpenSheet={setSheetMode} /> : null}
          {activeTab === 'community' ? <CommunityView onBackToMap={() => setActiveTab('drop')} /> : null}
          {activeTab === 'library' ? <LibraryView onOpenSheet={setSheetMode} /> : null}
          {activeTab === 'profile' ? <ProfileView /> : null}
        </div>

        <nav className={styles.bottomNav} aria-label="Primary">
          {navItems.slice(0, 2).map(({ id, label, Icon }) => (
            <button
              className={activeTab === id ? styles.activeNavButton : styles.navButton}
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
            >
              <Icon aria-hidden="true" size={21} />
              <span>{label}</span>
            </button>
          ))}
          <span className={styles.navCenterGap} aria-hidden="true" />
          {navItems.slice(2).map(({ id, label, Icon }) => (
            <button
              className={activeTab === id ? styles.activeNavButton : styles.navButton}
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
            >
              <Icon aria-hidden="true" size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className={styles.dropFab} type="button" onClick={() => setSheetMode('drop')} aria-label="Dropする">
          <Plus aria-hidden="true" size={30} />
          <Camera aria-hidden="true" size={17} />
        </button>

        <Sheet mode={sheetMode} onClose={() => setSheetMode(null)} />
      </div>
    </main>
  )
}
