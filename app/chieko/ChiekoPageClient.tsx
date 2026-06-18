'use client'

import {
  BookOpen,
  Camera,
  MapPinned,
  Plus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { DropGlobe, DropLibrary, DropUploader, FolderList, OnThisDayBanner, UndropedMemories } from '../../src/chieko'
import { hasFirebaseConfig } from '../../src/chieko/lib/firebase'
import type { LibraryPin } from '../../src/chieko/library/libraryData'
import overrideStyles from './drop-ui-overrides.module.css'
import styles from './chieko-page.module.css'

type PinFocus = { id?: string; lng: number; lat: number } | null

type AppTab = 'community' | 'library' | 'drop' | 'profile'
type SheetMode = 'drop' | 'memories' | 'folders' | null

const navItems: Array<{ id: AppTab; label: string; Icon: LucideIcon }> = [
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'library', label: 'Library', Icon: BookOpen },
  { id: 'drop', label: 'Drop', Icon: MapPinned },
  { id: 'profile', label: 'Profile', Icon: UserRound },
]

const communityCards = [
  { title: 'City Details', meta: '803 members', tone: '#2f453e' },
  { title: 'Architecture Club', meta: '412 pins', tone: '#7f7566' },
  { title: 'Cafe Windows', meta: '88 new drops', tone: '#596b73' },
]

function DropSplash() {
  return (
    <div className={styles.dropSplash} aria-hidden="true">
      <span className={styles.dropSplashDrop} />
      <span className={styles.dropSplashRing} />
      <span className={styles.dropSplashRing} />
      <span className={styles.dropSplashMist} />
    </div>
  )
}

function DropGlobeSurface({
  onOpenSheet,
  focusTarget,
  onFocusConsumed,
  showGlobeSignal,
}: {
  onOpenSheet: (mode: SheetMode) => void
  focusTarget: PinFocus
  onFocusConsumed: () => void
  showGlobeSignal: number
}) {
  return (
    <section className={styles.mapScreen} aria-label="Drop globe">
      <DropGlobe
        topInset={48}
        bottomInset={92}
        onRequestDrop={() => onOpenSheet('drop')}
        focusTarget={focusTarget}
        onFocusConsumed={onFocusConsumed}
        showGlobeSignal={showGlobeSignal}
      />
    </section>
  )
}

function CommunityView({ onBackToMap }: { onBackToMap: () => void }) {
  return (
    <section className={styles.panelScreen} aria-label="Community">
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Community</span>
          <h2>Shared worlds</h2>
        </div>
        <button className={styles.smallIconButton} type="button" onClick={onBackToMap} aria-label="地図へ戻る">
          <MapPinned size={18} />
        </button>
      </div>
      <div className={styles.communityHero}>
        <div className={styles.communityGlobe} />
        <div>
          <strong>City Details</strong>
          <span>Signs, windows, stairs, and the small discoveries that make a city feel personal.</span>
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

function LibraryView({
  onOpenSheet,
  onOpenPin,
}: {
  onOpenSheet: (mode: SheetMode) => void
  onOpenPin: (pin: LibraryPin) => void
}) {
  return (
    <section className={styles.mapScreen} aria-label="Library">
      <DropLibrary onOpenPin={onOpenPin} onOpenSheet={onOpenSheet} />
    </section>
  )
}

function ProfileView({ onOpenWorld }: { onOpenWorld: () => void }) {
  const handlePreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpenWorld()
  }

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
          <p>Places collected as a small personal world.</p>
        </div>
      </div>

      <div
        className={styles.profileGlobePreview}
        role="button"
        tabIndex={0}
        onClick={onOpenWorld}
        onKeyDown={handlePreviewKeyDown}
      >
        <span className={styles.profileRealGlobe} aria-hidden>
          <DropGlobe topInset={0} bottomInset={0} showGlobeSignal={1} />
        </span>
        <strong>自分の世界を見る</strong>
        <small>World preview</small>
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
        <strong>Folders</strong>
      </div>
    </section>
  )
}

function Sheet({ mode, onClose, onDropCreated }: { mode: SheetMode; onClose: () => void; onDropCreated: () => void }) {
  if (!mode) return null

  const title = mode === 'drop' ? 'New Drop' : mode === 'memories' ? 'Undropped memories' : 'Folders'

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
          {mode === 'drop' ? <DropUploader onCreated={onDropCreated} /> : null}
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
  const [pinFocus, setPinFocus] = useState<PinFocus>(null)
  const [dropSplashId, setDropSplashId] = useState(0)
  const [showGlobeSignal, setShowGlobeSignal] = useState(0)
  const firebaseReady = hasFirebaseConfig()

  const playDropSplash = () => {
    setDropSplashId((current) => current + 1)
  }

  const openDropSheet = () => {
    setActiveTab('drop')
    playDropSplash()
    window.setTimeout(() => setSheetMode('drop'), 320)
  }

  const handleOpenSheet = (mode: SheetMode) => {
    if (mode === 'drop') {
      openDropSheet()
      return
    }
    setSheetMode(mode)
  }

  const handleDropCreated = () => {
    setActiveTab('drop')
    setSheetMode(null)
    playDropSplash()
  }

  const handleOpenPin = (pin: LibraryPin) => {
    setPinFocus({ id: pin.id, lng: pin.lng, lat: pin.lat })
    setActiveTab('drop')
  }

  const handleOpenWorld = () => {
    setActiveTab('drop')
    setShowGlobeSignal((current) => current + 1)
  }

  return (
    <main className={`${styles.shell} ${overrideStyles.dropUiOverridesRoot}`}>
      <style>{`
        .${overrideStyles.dropUiOverridesRoot} [class*='shell']::before {
          position: absolute;
          inset: 0 0 auto;
          z-index: 5;
          height: 230px;
          content: '';
          pointer-events: none;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0));
        }

        .${overrideStyles.dropUiOverridesRoot} [class*='momentumBadge'] {
          top: calc(20px + env(safe-area-inset-top)) !important;
          padding: 5px 10px !important;
          color: rgba(255, 255, 255, 0.58) !important;
          font-size: 0.6rem !important;
          font-weight: 720 !important;
          background: rgba(0, 0, 0, 0.26) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          box-shadow: none !important;
        }

        .${overrideStyles.dropUiOverridesRoot} [class*='statsRow'] {
          top: calc(82px + env(safe-area-inset-top)) !important;
        }

        .${overrideStyles.dropUiOverridesRoot} [class*='chipsRow'] {
          position: fixed !important;
          top: calc(var(--globe-bottom) + 308px - 100dvh) !important;
          left: 50% !important;
          z-index: 44 !important;
          display: flex !important;
          width: min(430px, 100vw) !important;
          max-height: 56px !important;
          padding: 4px 12px 10px !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          visibility: visible !important;
          transform: translateX(-50%) !important;
        }

        .${overrideStyles.dropUiOverridesRoot} [class*='bottomArea'] {
          height: auto !important;
          min-height: 104px !important;
          max-height: min(70%, 470px) !important;
          overflow-x: visible !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          transition: max-height 0.2s ease, background 0.2s ease !important;
        }

        .${overrideStyles.dropUiOverridesRoot} [class*='bottomAreaExpanded'] {
          height: auto !important;
          min-height: 128px !important;
          max-height: min(70%, 470px) !important;
        }

        .${overrideStyles.dropUiOverridesRoot} [class*='friendsScroller'] {
          padding-bottom: 16px !important;
        }

        .${overrideStyles.dropUiOverridesRoot} button[class*='mapDropPin'] {
          width: 58px !important;
          min-height: 82px !important;
          overflow: visible !important;
          padding: 0 0 26px !important;
          filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.34)) !important;
        }

        .${overrideStyles.dropUiOverridesRoot} img[class*='mapDropPinImage'] {
          box-sizing: border-box !important;
          width: 48px !important;
          min-width: 48px !important;
          max-width: 48px !important;
          height: 48px !important;
          min-height: 48px !important;
          max-height: 48px !important;
          aspect-ratio: 1 / 1 !important;
          object-fit: cover !important;
          border: 3px solid rgba(247, 251, 249, 0.98) !important;
          border-radius: 50% !important;
          clip-path: none !important;
          box-shadow: 0 0 0 5px rgba(91, 193, 178, 0.12), 0 10px 20px rgba(0, 0, 0, 0.32) !important;
          transform: none !important;
        }

        .${overrideStyles.dropUiOverridesRoot} span[class*='mapDropPinName'] {
          width: auto !important;
          min-width: 0 !important;
          max-width: 120px !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          margin-top: 8px !important;
          padding: 3px 8px !important;
          background: rgba(8, 13, 11, 0.82) !important;
          border-color: rgba(91, 193, 178, 0.22) !important;
          border-radius: 999px !important;
        }

        .${overrideStyles.dropUiOverridesRoot} button[class*='mapDropPin']::before {
          bottom: 18px !important;
          width: 28px !important;
          height: 8px !important;
          border: 2px solid rgba(91, 193, 178, 0.42) !important;
          border-radius: 50% !important;
        }

        .${overrideStyles.dropUiOverridesRoot} button[class*='mapDropPin']::after {
          top: 46px !important;
          left: 50% !important;
          width: 0 !important;
          height: 0 !important;
          content: '' !important;
          background: transparent !important;
          border-top: 24px solid rgba(247, 251, 249, 0.98) !important;
          border-right: 11px solid transparent !important;
          border-bottom: 0 !important;
          border-left: 11px solid transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          transform: translateX(-50%) !important;
          animation: none !important;
          pointer-events: none !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetail__'] {
          position: absolute !important;
          top: 112px !important;
          right: auto !important;
          bottom: auto !important;
          left: 50% !important;
          z-index: 45 !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 12px !important;
          width: min(356px, calc(100% - 32px)) !important;
          height: auto !important;
          max-height: calc(100% - 176px) !important;
          padding: 14px !important;
          overflow-y: auto !important;
          color: #101814 !important;
          background: rgba(247, 250, 247, 0.98) !important;
          border: 1px solid rgba(16, 24, 20, 0.1) !important;
          border-radius: 18px !important;
          box-shadow: 0 24px 58px rgba(0, 0, 0, 0.36) !important;
          transform: translateX(-50%) !important;
          backdrop-filter: blur(18px) saturate(1.12) !important;
          -webkit-backdrop-filter: blur(18px) saturate(1.12) !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetail__']::before {
          display: none !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetail__'] img[class*='dropDetailImage'] {
          position: static !important;
          width: 100% !important;
          height: 176px !important;
          object-fit: cover !important;
          border-radius: 14px !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetailBody'] {
          position: static !important;
          display: grid !important;
          gap: 5px !important;
          width: auto !important;
          height: auto !important;
          padding: 0 !important;
          color: #101814 !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetailBody'] strong,
        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetailBody'] span {
          white-space: normal !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetailActions'] {
          position: static !important;
          display: flex !important;
          gap: 8px !important;
          align-items: center !important;
          justify-content: flex-start !important;
          width: auto !important;
          height: auto !important;
          padding: 0 !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetailActions'] [class*='primaryAction'] {
          min-width: 92px !important;
        }

        .${overrideStyles.dropUiOverridesRoot} div[class*='friendDetailActions'] [class*='closeAction'] {
          position: absolute !important;
          top: 22px !important;
          right: 22px !important;
          width: 34px !important;
          height: 34px !important;
          background: rgba(247, 250, 247, 0.92) !important;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18) !important;
        }
      `}</style>
      <div className={styles.phoneApp}>
        <header className={styles.statusBar}>
          <span>Drop</span>
          <span className={firebaseReady ? styles.ready : styles.previewOnly}>{firebaseReady ? 'Live' : 'Preview'}</span>
        </header>

        <div className={styles.memoryBannerSlot}>
          <OnThisDayBanner />
        </div>

        <div className={styles.screenSlot}>
          {activeTab === 'drop' ? (
            <DropGlobeSurface
              onOpenSheet={handleOpenSheet}
              focusTarget={pinFocus}
              onFocusConsumed={() => setPinFocus(null)}
              showGlobeSignal={showGlobeSignal}
            />
          ) : null}
          {activeTab === 'community' ? <CommunityView onBackToMap={() => setActiveTab('drop')} /> : null}
          {activeTab === 'library' ? <LibraryView onOpenSheet={handleOpenSheet} onOpenPin={handleOpenPin} /> : null}
          {activeTab === 'profile' ? <ProfileView onOpenWorld={handleOpenWorld} /> : null}
        </div>

        {dropSplashId > 0 ? <DropSplash key={dropSplashId} /> : null}

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

        <button className={styles.dropFab} type="button" onClick={openDropSheet} aria-label="Dropする">
          <Plus aria-hidden="true" size={30} />
          <Camera aria-hidden="true" size={16} />
        </button>

        <Sheet mode={sheetMode} onClose={() => setSheetMode(null)} onDropCreated={handleDropCreated} />
      </div>
    </main>
  )
}
