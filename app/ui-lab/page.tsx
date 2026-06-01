'use client'

import {
  BookmarkPlus,
  Droplet,
  Folder,
  Heart,
  LayoutGrid,
  List,
  LocateFixed,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  folderThumbnail,
  labCommunities,
  labCurrentUserId,
  labFolders,
  labPins,
  labRecommendItems,
  labUsers,
  pinsForCommunity,
  pinsForFolder,
  userById,
  type LabFolder,
  type LabPin,
} from '../../lib/mock-data/ui-lab'
import styles from './ui-lab.module.css'

type LabTab = 'find' | 'recommend' | 'drop' | 'library' | 'profile'
type CommunityTab = 'discover' | 'private' | 'joined'
type FolderViewMode = 'grid' | 'list'

const navItems: Array<{ id: LabTab; Icon: LucideIcon; label: string }> = [
  { id: 'find', Icon: Search, label: 'Find' },
  { id: 'recommend', Icon: Sparkles, label: 'Recommend' },
  { id: 'drop', Icon: Droplet, label: 'Drop' },
  { id: 'library', Icon: Folder, label: 'Library' },
  { id: 'profile', Icon: UserRound, label: 'Profile' },
]

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
}

function formatCount(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
}

function PinMarker({
  pin,
  selected,
  onClick,
}: {
  pin: LabPin
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`${styles.pinMarker} ${selected ? styles.selectedPinMarker : ''}`}
      style={{ left: `${pin.x}%`, top: `${pin.y}%`, borderColor: pin.color }}
      type="button"
      onClick={onClick}
      aria-label={pin.title}
    >
      <img src={pin.imageUrl} alt="" />
    </button>
  )
}

function MockMap({
  pins,
  selectedPinId,
  onSelectPin,
  compact = false,
}: {
  pins: LabPin[]
  selectedPinId: string | null
  onSelectPin: (pinId: string) => void
  compact?: boolean
}) {
  return (
    <div className={`${styles.mockMap} ${compact ? styles.compactMap : ''}`}>
      <span className={`${styles.mapLabel} ${styles.mapLabelOne}`}>Brussels</span>
      <span className={`${styles.mapLabel} ${styles.mapLabelTwo}`}>Canal</span>
      <span className={`${styles.mapLabel} ${styles.mapLabelThree}`}>Station</span>
      <span className={styles.mockRoad} />
      <span className={styles.mockRoadAlt} />
      {pins.map((pin) => (
        <PinMarker key={pin.id} pin={pin} selected={pin.id === selectedPinId} onClick={() => onSelectPin(pin.id)} />
      ))}
    </div>
  )
}

function FolderCard({
  folder,
  liked,
  saved,
  onOpen,
  onLike,
  onSave,
  onProfile,
}: {
  folder: LabFolder
  liked: boolean
  saved: boolean
  onOpen: () => void
  onLike: () => void
  onSave: () => void
  onProfile: (userId: string) => void
}) {
  const owner = userById(folder.ownerId)
  const pinCount = folder.pinIds.length

  return (
    <article className={styles.folderCard}>
      <button className={styles.folderImageButton} type="button" onClick={onOpen}>
        <img src={folderThumbnail(folder)} alt="" />
      </button>
      <div className={styles.folderBody}>
        <button className={styles.folderTitleButton} type="button" onClick={onOpen}>
          <strong>{folder.name}</strong>
        </button>
        <button className={styles.byline} type="button" onClick={() => onProfile(owner.id)}>
          @{owner.username}
        </button>
        <span>{pinCount} pins</span>
        <div className={styles.inlineActions}>
          <button type="button" onClick={onLike} aria-label="Like folder">
            <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
            <span>{folder.likes + (liked ? 1 : 0)}</span>
          </button>
          <button type="button" onClick={onSave} aria-label="Save folder">
            <BookmarkPlus size={22} fill={saved ? 'currentColor' : 'none'} />
            <span>{folder.saves + (saved ? 1 : 0)}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

function PinDetail({
  pin,
  onClose,
  onProfile,
}: {
  pin: LabPin
  onClose: () => void
  onProfile: (userId: string) => void
}) {
  const owner = userById(pin.ownerId)

  return (
    <aside className={styles.pinSheet}>
      <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Close">
        <X size={18} />
      </button>
      <img src={pin.imageUrl} alt="" />
      <div>
        <button className={styles.byline} type="button" onClick={() => onProfile(owner.id)}>
          @{owner.username}
        </button>
        <h3>{pin.title}</h3>
        <p>{pin.note}</p>
        <div className={styles.tagRow}>
          {pin.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <div className={styles.inlineActions}>
          <button type="button"><Heart size={22} /> {pin.likes}</button>
          <button type="button"><MessageCircle size={22} /> {pin.comments}</button>
          <button type="button"><BookmarkPlus size={22} /> {pin.saves}</button>
        </div>
      </div>
    </aside>
  )
}

function FolderDetail({
  folder,
  savedFolderIds,
  likedFolderIds,
  onBack,
  onToggleSave,
  onToggleLike,
  onOpenProfile,
}: {
  folder: LabFolder
  savedFolderIds: string[]
  likedFolderIds: string[]
  onBack: () => void
  onToggleSave: (id: string) => void
  onToggleLike: (id: string) => void
  onOpenProfile: (id: string) => void
}) {
  const [mode, setMode] = useState<FolderViewMode>('grid')
  const [selectedPinId, setSelectedPinId] = useState(folder.pinIds[0] ?? null)
  const pins = pinsForFolder(folder)
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? pins[0]
  const owner = userById(folder.ownerId)
  const liked = likedFolderIds.includes(folder.id)
  const saved = savedFolderIds.includes(folder.id)

  return (
    <section className={styles.detailPage}>
      <button className={styles.textBack} type="button" onClick={onBack}>Back</button>
      <div className={styles.detailHeader}>
        <div>
          <h1>{folder.name}</h1>
          <button className={styles.byline} type="button" onClick={() => onOpenProfile(owner.id)}>
            @{owner.username}
          </button>
          <p>{folder.description}</p>
        </div>
        <img src={folderThumbnail(folder)} alt="" />
      </div>
      <MockMap pins={pins} selectedPinId={selectedPin?.id ?? null} onSelectPin={setSelectedPinId} compact />
      <div className={styles.detailToolbar}>
        <button type="button" onClick={() => onToggleLike(folder.id)}>
          <Heart size={22} fill={liked ? 'currentColor' : 'none'} /> {folder.likes + (liked ? 1 : 0)}
        </button>
        <button type="button" onClick={() => onToggleSave(folder.id)}>
          <BookmarkPlus size={22} fill={saved ? 'currentColor' : 'none'} /> {folder.saves + (saved ? 1 : 0)}
        </button>
        <span />
        <button className={mode === 'grid' ? styles.activeIconButton : ''} type="button" onClick={() => setMode('grid')} aria-label="Grid">
          <LayoutGrid size={22} />
        </button>
        <button className={mode === 'list' ? styles.activeIconButton : ''} type="button" onClick={() => setMode('list')} aria-label="List">
          <List size={22} />
        </button>
      </div>
      {selectedPin && (
        <div className={styles.folderPinPreview}>
          <img src={selectedPin.imageUrl} alt="" />
          <div>
            <h2>{selectedPin.title}</h2>
            <p>{selectedPin.note}</p>
          </div>
        </div>
      )}
      <div className={mode === 'grid' ? styles.pinGrid : styles.pinList}>
        {pins.map((pin) => (
          <button key={pin.id} type="button" onClick={() => setSelectedPinId(pin.id)}>
            <img src={pin.imageUrl} alt="" />
            {mode === 'list' && (
              <span>
                <strong>{pin.title}</strong>
                <small>{pin.tags.map((tag) => `#${tag}`).join(' ')}</small>
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

function CommunityPanel({
  onBack,
  onOpenProfile,
}: {
  onBack: () => void
  onOpenProfile: (id: string) => void
}) {
  const [communityTab, setCommunityTab] = useState<CommunityTab>('discover')
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'pins' | 'timeline' | 'map'>('pins')
  const selectedCommunity = selectedCommunityId ? labCommunities.find((community) => community.id === selectedCommunityId) : null
  const communities = labCommunities.filter((community) => {
    if (communityTab === 'private') return community.privacy === 'private'
    if (communityTab === 'joined') return community.ownerId === labCurrentUserId || community.pinIds.some((pinId) => labPins.find((pin) => pin.id === pinId)?.ownerId === labCurrentUserId)
    return community.privacy === 'public'
  })

  if (selectedCommunity) {
    const pins = pinsForCommunity(selectedCommunity)
    const owner = userById(selectedCommunity.ownerId)
    return (
      <section className={styles.detailPage}>
        <button className={styles.textBack} type="button" onClick={() => setSelectedCommunityId(null)}>Back</button>
        <div className={styles.communityHero}>
          <img src={selectedCommunity.thumbnailUrl} alt="" />
          <div>
            <button className={styles.byline} type="button" onClick={() => onOpenProfile(owner.id)}>
              @{owner.username}
            </button>
            <h1>{selectedCommunity.name}</h1>
            <p>{selectedCommunity.description}</p>
            <small>{formatCount(selectedCommunity.memberCount)} members / {pins.length} pins</small>
          </div>
        </div>
        <div className={styles.segmented}>
          {(['pins', 'timeline', 'map'] as const).map((item) => (
            <button key={item} className={detailTab === item ? styles.activeSegment : ''} type="button" onClick={() => setDetailTab(item)}>
              {item}
            </button>
          ))}
        </div>
        {detailTab === 'pins' && (
          <div className={styles.pinGrid}>
            {pins.map((pin) => (
              <button key={pin.id} type="button">
                <img src={pin.imageUrl} alt="" />
              </button>
            ))}
          </div>
        )}
        {detailTab === 'timeline' && (
          <div className={styles.timelineList}>
            {selectedCommunity.messages.map((message) => {
              const user = userById(message.userId)
              return (
                <article key={message.id}>
                  <img src={user.avatarUrl} alt="" />
                  <div>
                    <button type="button" onClick={() => onOpenProfile(user.id)}>@{user.username}</button>
                    <p>{message.body}</p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        {detailTab === 'map' && <MockMap pins={pins} selectedPinId={null} onSelectPin={() => undefined} compact />}
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <button className={styles.textBack} type="button" onClick={onBack}>Back to Find</button>
      <div className={styles.topTitle}>
        <h1>Community</h1>
        <button className={styles.iconPill} type="button"><Plus size={18} /> Create</button>
      </div>
      <div className={styles.segmented}>
        <button className={communityTab === 'discover' ? styles.activeSegment : ''} type="button" onClick={() => setCommunityTab('discover')}>Discover</button>
        <button className={communityTab === 'private' ? styles.activeSegment : ''} type="button" onClick={() => setCommunityTab('private')}>Private</button>
        <button className={communityTab === 'joined' ? styles.activeSegment : ''} type="button" onClick={() => setCommunityTab('joined')}>Joined</button>
      </div>
      <label className={styles.searchBar}>
        <Search size={22} />
        <input placeholder="Search community" />
      </label>
      <div className={styles.communityList}>
        {communities.map((community) => (
          <button key={community.id} type="button" onClick={() => setSelectedCommunityId(community.id)}>
            <img src={community.thumbnailUrl} alt="" />
            <span>
              <strong>{community.name}</strong>
              <small>{formatCount(community.memberCount)} members / {community.joinPolicy}</small>
              <em>{community.description}</em>
            </span>
            <b>{community.privacy === 'public' ? 'Join' : 'Invite'}</b>
          </button>
        ))}
      </div>
    </section>
  )
}

export default function UiLabPage() {
  const [tab, setTab] = useState<LabTab>('drop')
  const [dropScope, setDropScope] = useState('follow')
  const [selectedPinId, setSelectedPinId] = useState<string | null>(labPins[0].id)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [profileUserId, setProfileUserId] = useState(labCurrentUserId)
  const [likedFolderIds, setLikedFolderIds] = useState<string[]>([])
  const [savedFolderIds, setSavedFolderIds] = useState<string[]>(['f_to_visit'])
  const [libraryMode, setLibraryMode] = useState<'folders' | 'pins'>('folders')

  const openProfile = (userId: string) => {
    setProfileUserId(userId)
    setTab('profile')
    setCommunityOpen(false)
    setSelectedFolderId(null)
  }

  const publicFolders = labFolders.filter((folder) => folder.visibility === 'public')
  const selectedFolder = selectedFolderId ? labFolders.find((folder) => folder.id === selectedFolderId) ?? null : null
  const selectedPin = selectedPinId ? labPins.find((pin) => pin.id === selectedPinId) ?? null : null
  const profileUser = userById(profileUserId)
  const profilePins = labPins.filter((pin) => pin.ownerId === profileUser.id)

  const dropScopes = useMemo(() => {
    const followingUserIds = ['u_chieko', 'u_arc']
    return [
      { id: 'chaos', label: 'Chaos', pins: labPins },
      { id: 'follow', label: 'Follow', pins: labPins.filter((pin) => followingUserIds.includes(pin.ownerId)) },
      { id: 'recommend', label: 'Recommend', pins: labPins.filter((pin) => pin.saves > 10) },
      { id: 'architecture', label: 'Architecture', pins: labPins.filter((pin) => pin.communityId === 'c_architecture') },
      { id: 'myworld', label: 'My World', pins: labPins.filter((pin) => pin.ownerId === labCurrentUserId) },
      ...labFolders.filter((folder) => folder.ownerId === labCurrentUserId).map((folder) => ({
        id: folder.id,
        label: folder.name,
        pins: pinsForFolder(folder),
      })),
    ]
  }, [])

  const activeScope = dropScopes.find((scope) => scope.id === dropScope) ?? dropScopes[0]

  if (selectedFolder) {
    return (
      <main className={styles.labShell}>
        <FolderDetail
          folder={selectedFolder}
          savedFolderIds={savedFolderIds}
          likedFolderIds={likedFolderIds}
          onBack={() => setSelectedFolderId(null)}
          onToggleSave={(id) => setSavedFolderIds((current) => toggleId(current, id))}
          onToggleLike={(id) => setLikedFolderIds((current) => toggleId(current, id))}
          onOpenProfile={openProfile}
        />
      </main>
    )
  }

  if (communityOpen) {
    return (
      <main className={styles.labShell}>
        <CommunityPanel onBack={() => setCommunityOpen(false)} onOpenProfile={openProfile} />
        <nav className={styles.bottomNav}>
          {navItems.map(({ id, Icon, label }) => (
            <button key={id} className={tab === id ? styles.activeNav : ''} type="button" onClick={() => { setTab(id); setCommunityOpen(false) }}>
              <Icon size={24} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </main>
    )
  }

  return (
    <main className={styles.labShell}>
      {tab === 'find' && (
        <section className={styles.page}>
          <div className={styles.topTitle}>
            <h1>Find</h1>
            <button className={styles.iconPill} type="button" onClick={() => setCommunityOpen(true)}>
              <Users size={18} /> Community
            </button>
          </div>
          <label className={styles.searchBar}>
            <Search size={22} />
            <input placeholder="Search folders, tags, users" />
          </label>
          <button className={styles.communityTeaser} type="button" onClick={() => setCommunityOpen(true)}>
            <img src={labCommunities[0].thumbnailUrl} alt="" />
            <span>
              <strong>Join community</strong>
              <small>Public, approval, and private maps</small>
            </span>
          </button>
          <section className={styles.shelf}>
            <h2>Recent folders</h2>
            <div className={styles.folderGrid}>
              {publicFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  liked={likedFolderIds.includes(folder.id)}
                  saved={savedFolderIds.includes(folder.id)}
                  onOpen={() => setSelectedFolderId(folder.id)}
                  onLike={() => setLikedFolderIds((current) => toggleId(current, folder.id))}
                  onSave={() => setSavedFolderIds((current) => toggleId(current, folder.id))}
                  onProfile={openProfile}
                />
              ))}
            </div>
          </section>
          <section className={styles.shelf}>
            <h2>Random folders</h2>
            <div className={styles.folderGrid}>
              {[...publicFolders].reverse().map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  liked={likedFolderIds.includes(folder.id)}
                  saved={savedFolderIds.includes(folder.id)}
                  onOpen={() => setSelectedFolderId(folder.id)}
                  onLike={() => setLikedFolderIds((current) => toggleId(current, folder.id))}
                  onSave={() => setSavedFolderIds((current) => toggleId(current, folder.id))}
                  onProfile={openProfile}
                />
              ))}
            </div>
          </section>
        </section>
      )}

      {tab === 'recommend' && (
        <section className={styles.page}>
          <div className={styles.topTitle}>
            <h1>Recommend</h1>
            <span>Mock editorial feed</span>
          </div>
          <div className={styles.recommendHero}>
            {labRecommendItems.map((item) => (
              <article key={item.id}>
                <img src={item.imageUrl} alt="" />
                <span>{item.type}</span>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'drop' && (
        <section className={styles.dropScreen}>
          <label className={styles.dropSearch}>
            <Search size={20} />
            <input placeholder="Search place or pin" />
          </label>
          <div className={styles.scopeRail}>
            {dropScopes.map((scope) => (
              <button key={scope.id} className={scope.id === dropScope ? styles.activeScope : ''} type="button" onClick={() => { setDropScope(scope.id); setSelectedPinId(scope.pins[0]?.id ?? null) }}>
                {scope.label}
              </button>
            ))}
          </div>
          <MockMap pins={activeScope.pins} selectedPinId={selectedPinId} onSelectPin={setSelectedPinId} />
          <div className={styles.mapTools}>
            <button type="button" aria-label="Current location"><LocateFixed size={22} /></button>
            <button type="button" aria-label="Add memory"><Plus size={24} /></button>
          </div>
          <div className={styles.scopeBadge}>
            <strong>{activeScope.label}</strong>
            <span>{activeScope.pins.length} drops</span>
          </div>
          {selectedPin && <PinDetail pin={selectedPin} onClose={() => setSelectedPinId(null)} onProfile={openProfile} />}
        </section>
      )}

      {tab === 'library' && (
        <section className={styles.page}>
          <div className={styles.topTitle}>
            <h1>Library</h1>
            <div className={styles.segmented}>
              <button className={libraryMode === 'folders' ? styles.activeSegment : ''} type="button" onClick={() => setLibraryMode('folders')}>Folder</button>
              <button className={libraryMode === 'pins' ? styles.activeSegment : ''} type="button" onClick={() => setLibraryMode('pins')}>Pin</button>
            </div>
          </div>
          {libraryMode === 'folders' ? (
            <div className={styles.libraryList}>
              {labFolders.filter((folder) => folder.ownerId === labCurrentUserId || savedFolderIds.includes(folder.id)).map((folder) => {
                const owner = userById(folder.ownerId)
                return (
                  <button key={folder.id} type="button" onClick={() => setSelectedFolderId(folder.id)}>
                    <img src={folderThumbnail(folder)} alt="" />
                    <span>
                      <strong>{folder.name}</strong>
                      <small>{folder.ownerId === labCurrentUserId ? 'Mine' : `@${owner.username}`} / {folder.pinIds.length} pins</small>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className={styles.libraryList}>
              {labPins.map((pin) => {
                const owner = userById(pin.ownerId)
                const folders = labFolders.filter((folder) => folder.pinIds.includes(pin.id)).map((folder) => folder.name)
                return (
                  <button key={pin.id} type="button" onClick={() => { setTab('drop'); setSelectedPinId(pin.id) }}>
                    <img src={pin.imageUrl} alt="" />
                    <span>
                      <strong>{pin.title}</strong>
                      <small>{pin.ownerId === labCurrentUserId ? 'Mine' : `@${owner.username}`} / {folders.join(', ') || 'No folder'}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'profile' && (
        <section className={styles.page}>
          <div className={styles.profileHeader}>
            <img src={profileUser.avatarUrl} alt="" />
            <div>
              <button className={styles.byline} type="button">@{profileUser.username}</button>
              <h1>{profileUser.displayName}</h1>
              <p>{profileUser.bio}</p>
            </div>
          </div>
          <div className={styles.profileStats}>
            <span><strong>{profilePins.length}</strong> pins</span>
            <span><strong>{profileUser.followers}</strong> followers</span>
            <span><strong>{profileUser.following}</strong> following</span>
          </div>
          <h2>Public world</h2>
          <MockMap pins={profilePins} selectedPinId={selectedPinId} onSelectPin={setSelectedPinId} compact />
          <h2>Recent pins</h2>
          <div className={styles.pinGrid}>
            {profilePins.map((pin) => (
              <button key={pin.id} type="button" onClick={() => { setTab('drop'); setSelectedPinId(pin.id) }}>
                <img src={pin.imageUrl} alt="" />
              </button>
            ))}
          </div>
        </section>
      )}

      <nav className={styles.bottomNav}>
        {navItems.map(({ id, Icon, label }) => (
          <button key={id} className={tab === id ? styles.activeNav : ''} type="button" onClick={() => { setTab(id); setSelectedFolderId(null); setCommunityOpen(false) }}>
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}
