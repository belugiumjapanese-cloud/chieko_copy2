'use client'

import { Folder, Images, MapPinned, UploadCloud, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { DropUploader, FolderList, OnThisDayBanner, ProfileMap, UndropedMemories } from '../../src/chieko'
import { hasFirebaseConfig } from '../../src/chieko/lib/firebase'
import styles from './chieko-page.module.css'

type ChiekoView = 'drop' | 'memories' | 'map' | 'folders'

const views: Array<{ id: ChiekoView; label: string; Icon: LucideIcon }> = [
  { id: 'drop', label: 'Drop', Icon: UploadCloud },
  { id: 'memories', label: 'Memories', Icon: Images },
  { id: 'map', label: 'Map', Icon: MapPinned },
  { id: 'folders', label: 'Folders', Icon: Folder },
]

export function ChiekoPageClient() {
  const [activeView, setActiveView] = useState<ChiekoView>('drop')
  const firebaseReady = hasFirebaseConfig()

  return (
    <main className={styles.shell}>
      <div className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Drop</p>
          <h1 className={styles.title}>Chieko</h1>
        </div>
        <div className={firebaseReady ? styles.ready : styles.previewOnly}>{firebaseReady ? 'Firebase ready' : 'Preview only'}</div>
      </div>

      <div className={styles.tabs} aria-label="Chieko views">
        {views.map(({ id, label, Icon }) => (
          <button
            className={activeView === id ? styles.activeTab : styles.tab}
            key={id}
            type="button"
            onClick={() => setActiveView(id)}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className={styles.bannerSlot}>
        <OnThisDayBanner />
      </div>

      <section className={activeView === 'map' ? styles.mapStage : styles.stage}>
        {activeView === 'drop' ? <DropUploader /> : null}
        {activeView === 'memories' ? <UndropedMemories /> : null}
        {activeView === 'map' ? <ProfileMap /> : null}
        {activeView === 'folders' ? <FolderList onFolderSelect={() => setActiveView('map')} /> : null}
      </section>
    </main>
  )
}
