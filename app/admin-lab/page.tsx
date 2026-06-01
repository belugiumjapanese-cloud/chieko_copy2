'use client'

import {
  BarChart3,
  BookmarkPlus,
  Check,
  ChevronsUpDown,
  Flag,
  FolderPlus,
  Heart,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  folderThumbnail,
  labAdminStats,
  labCommunities,
  labFolders,
  labPins,
  labRecommendItems,
  labUsers,
  pinsForFolder,
  userById,
  type LabFolder,
  type LabRecommendItem,
} from '../../lib/mock-data/ui-lab'
import styles from './admin-lab.module.css'

type AdminSection = 'overview' | 'recommend' | 'folders' | 'communities' | 'moderation' | 'ops'

const menuItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'recommend', label: 'Recommend', icon: Sparkles },
  { id: 'folders', label: 'Folders', icon: FolderPlus },
  { id: 'communities', label: 'Communities', icon: Users },
  { id: 'moderation', label: 'Moderation', icon: ShieldCheck },
  { id: 'ops', label: 'Ops notes', icon: BarChart3 },
]

function SourceBadge({ value }: { value: string }) {
  return <span className={styles.sourceBadge}>{value}</span>
}

function AdminFolderRow({
  folder,
  selected,
  onToggle,
}: {
  folder: LabFolder
  selected: boolean
  onToggle: () => void
}) {
  const owner = userById(folder.ownerId)

  return (
    <article className={styles.catalogRow}>
      <img src={folderThumbnail(folder)} alt="" />
      <div>
        <strong>{folder.name}</strong>
        <span>@{owner.username} / {folder.pinIds.length} pins / {folder.visibility}</span>
        <small>{folder.description}</small>
      </div>
      <button className={selected ? styles.selectedButton : ''} type="button" onClick={onToggle}>
        {selected ? <Check size={18} /> : <Plus size={18} />}
        {selected ? 'Queued' : 'Pick'}
      </button>
    </article>
  )
}

function RecommendPreview({
  item,
  onRemove,
}: {
  item: LabRecommendItem
  onRemove: () => void
}) {
  return (
    <article className={styles.recommendPreview}>
      <img src={item.imageUrl} alt="" />
      <div>
        <SourceBadge value={item.type} />
        <strong>{item.title}</strong>
        <p>{item.description}</p>
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove">
        <Trash2 size={18} />
      </button>
    </article>
  )
}

export default function AdminLabPage() {
  const [section, setSection] = useState<AdminSection>('overview')
  const [queuedFolderIds, setQueuedFolderIds] = useState<string[]>(['f_architecture'])
  const [savedState, setSavedState] = useState('Draft changes are local to admin-lab')
  const [officialFolderTitle, setOfficialFolderTitle] = useState('Official weekend walk')
  const [officialFolderNote, setOfficialFolderNote] = useState('Short editorial copy for a curated route or official guide.')
  const [searchValue, setSearchValue] = useState('')

  const publicFolders = labFolders.filter((folder) => folder.visibility === 'public')
  const filteredFolders = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return publicFolders
    return publicFolders.filter((folder) => {
      const owner = userById(folder.ownerId)
      return `${folder.name} ${folder.description} ${owner.username}`.toLowerCase().includes(query)
    })
  }, [publicFolders, searchValue])

  const queuedItems: LabRecommendItem[] = [
    ...labRecommendItems,
    ...queuedFolderIds
      .filter((folderId) => !labRecommendItems.some((item) => item.targetId === folderId))
      .map((folderId) => {
        const folder = labFolders.find((item) => item.id === folderId) ?? labFolders[0]
        return {
          id: `queued-${folder.id}`,
          type: 'folder' as const,
          title: folder.name,
          description: folder.description,
          imageUrl: folderThumbnail(folder),
          targetId: folder.id,
          publishedAt: new Date().toISOString(),
        }
      }),
  ]

  const toggleFolder = (folderId: string) => {
    setQueuedFolderIds((current) => (
      current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [...current, folderId]
    ))
    setSavedState('Unsaved recommendation changes')
  }

  const saveChanges = () => {
    setSavedState(`Saved mock state at ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`)
  }

  return (
    <main className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <span>UI Lab</span>
          <strong>Admin</strong>
          <small>No Supabase connection</small>
        </div>
        <nav>
          {menuItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? styles.activeMenuItem : ''} type="button" onClick={() => setSection(id)}>
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.adminHeader}>
          <div>
            <span>Mock operations studio</span>
            <h1>{menuItems.find((item) => item.id === section)?.label}</h1>
          </div>
          <button type="button" onClick={saveChanges}>
            <Save size={18} />
            Save
          </button>
        </header>

        <p className={styles.statusLine}>{savedState}</p>

        {section === 'overview' && (
          <>
            <div className={styles.statGrid}>
              {labAdminStats.map((stat) => (
                <article key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>{stat.delta}</small>
                </article>
              ))}
            </div>
            <div className={styles.twoColumn}>
              <section className={styles.panel}>
                <h2>Fast checks for launch discussion</h2>
                <ul className={styles.checkList}>
                  <li><Check size={18} /> User app mock at <code>/ui-lab</code></li>
                  <li><Check size={18} /> Admin mock at <code>/admin-lab</code></li>
                  <li><Check size={18} /> All seed data is in <code>lib/mock-data/ui-lab.ts</code></li>
                  <li><Check size={18} /> Safe to iterate while Supabase is down</li>
                </ul>
              </section>
              <section className={styles.panel}>
                <h2>Signals to watch later</h2>
                <div className={styles.signalList}>
                  <span><Heart size={18} /> folder likes by source</span>
                  <span><BookmarkPlus size={18} /> save-to-library conversion</span>
                  <span><Flag size={18} /> reports per community</span>
                  <span><Users size={18} /> member approval backlog</span>
                </div>
              </section>
            </div>
          </>
        )}

        {section === 'recommend' && (
          <div className={styles.twoColumn}>
            <section className={styles.panel}>
              <div className={styles.panelTitle}>
                <h2>Recommendation board</h2>
                <button type="button" onClick={saveChanges}><Save size={16} /> Save board</button>
              </div>
              <div className={styles.recommendList}>
                {queuedItems.map((item) => (
                  <RecommendPreview
                    key={item.id}
                    item={item}
                    onRemove={() => {
                      if (item.targetId) toggleFolder(item.targetId)
                    }}
                  />
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitle}>
                <h2>Create official folder</h2>
                <SourceBadge value="Mock only" />
              </div>
              <label>
                Folder title
                <input value={officialFolderTitle} onChange={(event) => setOfficialFolderTitle(event.target.value)} />
              </label>
              <label>
                Editorial note
                <textarea value={officialFolderNote} onChange={(event) => setOfficialFolderNote(event.target.value)} />
              </label>
              <div className={styles.mockOfficialCard}>
                <img src={labPins[0].imageUrl} alt="" />
                <div>
                  <strong>{officialFolderTitle}</strong>
                  <p>{officialFolderNote}</p>
                </div>
              </div>
              <button className={styles.primaryAction} type="button" onClick={saveChanges}>
                <Megaphone size={18} />
                Save as official draft
              </button>
            </section>
          </div>
        )}

        {section === 'folders' && (
          <section className={styles.panel}>
            <div className={styles.panelTitle}>
              <h2>Public folder catalog</h2>
              <label className={styles.searchBox}>
                <Search size={18} />
                <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search folder, owner, tags" />
              </label>
            </div>
            <div className={styles.catalogList}>
              {filteredFolders.map((folder) => (
                <AdminFolderRow
                  key={folder.id}
                  folder={folder}
                  selected={queuedFolderIds.includes(folder.id)}
                  onToggle={() => toggleFolder(folder.id)}
                />
              ))}
            </div>
          </section>
        )}

        {section === 'communities' && (
          <section className={styles.panel}>
            <div className={styles.panelTitle}>
              <h2>Community health</h2>
              <SourceBadge value="Hierarchy mock" />
            </div>
            <div className={styles.communityAdminGrid}>
              {labCommunities.map((community) => {
                const owner = userById(community.ownerId)
                return (
                  <article key={community.id}>
                    <img src={community.thumbnailUrl} alt="" />
                    <div>
                      <SourceBadge value={community.joinPolicy} />
                      <h3>{community.name}</h3>
                      <p>{community.description}</p>
                      <small>Owner @{owner.username} / {community.memberCount} members / {community.pinIds.length} pins</small>
                    </div>
                    <button type="button">
                      <ChevronsUpDown size={18} />
                      Review levels
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {section === 'moderation' && (
          <div className={styles.twoColumn}>
            <section className={styles.panel}>
              <h2>Action queue</h2>
              <div className={styles.queueList}>
                <span><MessageSquareWarning size={20} /> Reported content <b>0</b></span>
                <span><ShieldCheck size={20} /> Pending posts <b>3</b></span>
                <span><Users size={20} /> Member requests <b>5</b></span>
                <span><Flag size={20} /> Badge requests <b>2</b></span>
              </div>
            </section>
            <section className={styles.panel}>
              <h2>Mock report detail</h2>
              <div className={styles.mockReport}>
                <img src={labPins[2].imageUrl} alt="" />
                <div>
                  <strong>{labPins[2].title}</strong>
                  <p>Keep this shape for future report triage: content preview, author, reason, action history.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {section === 'ops' && (
          <section className={styles.panel}>
            <h2>Operating questions to decide</h2>
            <div className={styles.opsList}>
              <article>
                <strong>Cold start</strong>
                <p>Pin the first screen with cached Follow drops, then refresh Chaos, Recommend, and community data in the background.</p>
              </article>
              <article>
                <strong>Recommendation policy</strong>
                <p>Separate official folders, picked folders, picked communities, and events so the product message stays clean.</p>
              </article>
              <article>
                <strong>Community governance</strong>
                <p>Track owner, moderator, contributor levels, pending posts, and badge requests per community.</p>
              </article>
              <article>
                <strong>Growth loop</strong>
                <p>Measure saves from Find into Library and follows from folder/profile views.</p>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}
