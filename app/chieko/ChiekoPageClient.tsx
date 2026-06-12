'use client'

import {
  BookOpen,
  Camera,
  Folder,
  Heart,
  MapPinned,
  Plus,
  Sparkles,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { DropGlobe, DropUploader, FolderList, OnThisDayBanner, UndropedMemories } from '../../src/chieko'
import { hasFirebaseConfig } from '../../src/chieko/lib/firebase'
import styles from './chieko-page.module.css'

type AppTab = 'community' | 'library' | 'drop' | 'profile'
type SheetMode = 'drop' | 'memories' | 'folders' | null

const navItems: Array<{ id: AppTab; label: string; Icon: LucideIcon }> = [
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'library', label: 'Library', Icon: BookOpen },
  { id: 'drop', label: 'Drop', Icon: MapPinned },
  { id: 'profile', label: 'Profile', Icon: UserRound },
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

function DropGlobeSurface({ onOpenSheet }: { onOpenSheet: (mode: SheetMode) => void }) {
  return (
    <section className={styles.mapScreen} aria-label="Drop globe">
      <DropGlobe topInset={48} bottomInset={92} onRequestDrop={() => onOpenSheet('drop')} />
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
          {activeTab === 'drop' ? <DropGlobeSurface onOpenSheet={setSheetMode} /> : null}
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
