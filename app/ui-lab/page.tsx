'use client'

import {
  ArrowLeft,
  BookmarkPlus,
  Droplet,
  Folder,
  Grid2X2,
  Heart,
  List,
  LocateFixed,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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
  type LabCommunity,
  type LabFolder,
  type LabPin,
} from '../../lib/mock-data/ui-lab'
import styles from '../community-map/community-map.module.css'

type AppTab = 'find' | 'home' | 'myworld' | 'tovisit' | 'mypage'
type CommunityBrowseTab = 'discover' | 'limited' | 'joined'
type CommunityDetailTab = 'pins' | 'timeline' | 'map'
type FolderViewMode = 'grid' | 'list'

const navItems: Array<{ id: AppTab; label: string; Icon: LucideIcon }> = [
  { id: 'find', label: 'Find', Icon: Search },
  { id: 'home', label: 'Recommend', Icon: Sparkles },
  { id: 'myworld', label: 'Drop', Icon: Droplet },
  { id: 'tovisit', label: 'Library', Icon: Folder },
  { id: 'mypage', label: 'Profile', Icon: UserRound },
]

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function toggleId(values: string[], id: string) {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
}

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function pinMeta(pin: LabPin) {
  const owner = userById(pin.ownerId)
  const community = labCommunities.find((item) => item.id === pin.communityId)
  return `${community?.name ?? 'Drop'} / @${owner.username}`
}

function mapBackgroundStyle(): CSSProperties {
  return {
    position: 'relative',
    overflow: 'hidden',
    background:
      'linear-gradient(28deg, transparent 0 44%, rgba(255,255,255,.92) 44.2% 47%, transparent 47.2%), linear-gradient(142deg, transparent 0 39%, rgba(255,255,255,.86) 39.2% 42.2%, transparent 42.4%), linear-gradient(90deg, rgba(17,17,17,.1) 1px, transparent 1px), linear-gradient(rgba(17,17,17,.08) 1px, transparent 1px), #dfe8e2',
    backgroundSize: 'auto, auto, 58px 58px, 58px 58px, auto',
  }
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
  const style = {
    position: 'absolute',
    left: `${pin.x}%`,
    top: `${pin.y}%`,
    transform: 'translate(-50%, -100%)',
    '--pin-color': selected ? '#111111' : pin.color,
  } as CSSProperties

  return (
    <button className={cx(styles.marker, selected && styles.markerActive)} style={style} type="button" onClick={onClick}>
      <span>
        <img src={pin.imageUrl} alt="" />
      </span>
      <b>{pin.title}</b>
    </button>
  )
}

function StaticMap({
  pins,
  selectedPinId,
  onPinClick,
  compact = false,
  overlay,
  children,
}: {
  pins: LabPin[]
  selectedPinId: string | null
  onPinClick: (pinId: string) => void
  compact?: boolean
  overlay?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={cx(styles.mapCanvas, compact && styles.mapCompact)} style={mapBackgroundStyle()}>
      <span style={{ position: 'absolute', top: '24%', left: '22%', color: 'rgba(24,35,30,.36)', fontSize: '2rem', fontWeight: 950 }}>Brussels</span>
      <span style={{ position: 'absolute', right: '12%', top: '54%', color: 'rgba(24,35,30,.32)', fontSize: '1.25rem', fontWeight: 900 }}>Canal</span>
      {pins.length > 4 && (
        <button
          className={styles.clusterMarker}
          style={{ position: 'absolute', right: '24%', top: '34%', transform: 'translate(-50%, -50%)' }}
          type="button"
          onClick={() => onPinClick(pins[0].id)}
        >
          <span>{pins.length - 2}</span>
        </button>
      )}
      {pins.map((pin) => (
        <PinMarker key={pin.id} pin={pin} selected={pin.id === selectedPinId} onClick={() => onPinClick(pin.id)} />
      ))}
      {overlay}
      {children}
    </div>
  )
}

function Footer({
  activeTab,
  onTab,
}: {
  activeTab: AppTab
  onTab: (tab: AppTab) => void
}) {
  return (
    <nav className={styles.footer}>
      {navItems.map(({ id, Icon, label }) => (
        <button key={id} className={activeTab === id ? styles.active : ''} type="button" onClick={() => onTab(id)}>
          <Icon size={24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function FolderActionBar({
  folder,
  liked,
  saved,
  onLike,
  onSave,
}: {
  folder: LabFolder
  liked: boolean
  saved: boolean
  onLike: () => void
  onSave: () => void
}) {
  return (
    <div className={styles.folderActionBar}>
      <button className={liked ? styles.liked : ''} type="button" onClick={onLike} aria-label="フォルダーにいいね">
        <Heart fill={liked ? 'currentColor' : 'none'} />
        <span>{folder.likes + (liked ? 1 : 0)}</span>
      </button>
      <button type="button" onClick={onSave} aria-label="Libraryに追加">
        <BookmarkPlus fill={saved ? 'currentColor' : 'none'} />
        <span>{folder.saves + (saved ? 1 : 0)}</span>
      </button>
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
  onOpenProfile,
}: {
  folder: LabFolder
  liked: boolean
  saved: boolean
  onOpen: () => void
  onLike: () => void
  onSave: () => void
  onOpenProfile: (userId: string) => void
}) {
  const owner = userById(folder.ownerId)

  return (
    <article className={styles.findFolderCard}>
      <button className={styles.folderOpenButton} type="button" onClick={onOpen}>
        <img src={folderThumbnail(folder)} alt="" />
        <strong>{folder.name}</strong>
        <small>{folder.pinIds.length} pins</small>
      </button>
      <button className={styles.folderOwnerLink} type="button" onClick={() => onOpenProfile(owner.id)}>
        @{owner.username}
      </button>
      <FolderActionBar folder={folder} liked={liked} saved={saved} onLike={onLike} onSave={onSave} />
    </article>
  )
}

function FolderShelf({
  title,
  folders,
  likedFolderIds,
  savedFolderIds,
  onOpenFolder,
  onToggleLike,
  onSaveFolder,
  onOpenProfile,
}: {
  title: string
  folders: LabFolder[]
  likedFolderIds: string[]
  savedFolderIds: string[]
  onOpenFolder: (folderId: string) => void
  onToggleLike: (folderId: string) => void
  onSaveFolder: (folderId: string) => void
  onOpenProfile: (userId: string) => void
}) {
  return (
    <section className={styles.contentSection}>
      <h2>{title}</h2>
      <div className={styles.findGrid}>
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            liked={likedFolderIds.includes(folder.id)}
            saved={savedFolderIds.includes(folder.id)}
            onOpen={() => onOpenFolder(folder.id)}
            onLike={() => onToggleLike(folder.id)}
            onSave={() => onSaveFolder(folder.id)}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>
    </section>
  )
}

function PinDetailCard({
  pin,
  onClose,
  onOpenProfile,
  onSave,
}: {
  pin: LabPin
  onClose: () => void
  onOpenProfile: (userId: string) => void
  onSave: () => void
}) {
  const owner = userById(pin.ownerId)
  const [expanded, setExpanded] = useState(false)
  const needsMore = pin.note.length > 98

  return (
    <aside className={styles.mapStoryDetail}>
      <img src={pin.imageUrl} alt="" />
      <div>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="閉じる">
          <X size={16} />
        </button>
        <small>
          {pin.communityId ? labCommunities.find((community) => community.id === pin.communityId)?.name : 'Drop'} /{' '}
          <button className={styles.folderOwnerLink} type="button" onClick={() => onOpenProfile(owner.id)}>
            @{owner.username}
          </button>
        </small>
        <h2>{pin.title}</h2>
        <p>{expanded || !needsMore ? pin.note : `${pin.note.slice(0, 96)}...`}</p>
        {needsMore && (
          <button className={styles.ghostButton} type="button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Close' : 'See more'}
          </button>
        )}
        <small>{pin.likes} likes / {pin.comments} comments / {pin.saves} saves</small>
        <span>{pin.tags.map((tag) => `#${tag}`).join(' ')}</span>
        <div className={styles.actionRow}>
          <button type="button"><Heart size={18} /> {pin.likes}</button>
          <button type="button" onClick={onSave}><BookmarkPlus size={18} /> 追加</button>
        </div>
      </div>
    </aside>
  )
}

function DropView({
  scopes,
  activeScopeId,
  selectedPinId,
  onScope,
  onPin,
  onOpenProfile,
  onSavePin,
}: {
  scopes: Array<{ id: string; label: string; pins: LabPin[] }>
  activeScopeId: string
  selectedPinId: string | null
  onScope: (scopeId: string) => void
  onPin: (pinId: string | null) => void
  onOpenProfile: (userId: string) => void
  onSavePin: (pinId: string) => void
}) {
  const activeScope = scopes.find((scope) => scope.id === activeScopeId) ?? scopes[0]
  const selectedPin = activeScope.pins.find((pin) => pin.id === selectedPinId) ?? null

  return (
    <section className={styles.mapPage}>
      <div className={styles.splitMap}>
        <div className={styles.splitMapPane}>
          <StaticMap pins={activeScope.pins} selectedPinId={selectedPinId} onPinClick={onPin}>
            <label className={styles.mapSearchBox}>
              <Search size={18} />
              <input placeholder="場所、pinを検索" />
            </label>
            <div className={styles.dropScopeBar}>
              {scopes.map((scope) => (
                <button key={scope.id} className={scope.id === activeScope.id ? styles.active : ''} type="button" onClick={() => onScope(scope.id)}>
                  {scope.label}
                </button>
              ))}
            </div>
            <div className={styles.dropStatusCard}>
              <strong>{activeScope.label}</strong>
              <span>{activeScope.pins.length} drops</span>
            </div>
            <button className={styles.locateButton} type="button" aria-label="現在地">
              <LocateFixed size={24} />
            </button>
            <div className={styles.mapFloatingAction}>
              <button className={styles.dropPostButton} type="button" aria-label="投稿">
                <Plus size={25} />
              </button>
            </div>
            {selectedPin && (
              <>
                <button className={cx(styles.mapStoryCard, styles.mapStoryCardStatic)} type="button">
                  <img src={selectedPin.imageUrl} alt="" />
                  <div>
                    <small>@{userById(selectedPin.ownerId).username}</small>
                    <strong>{selectedPin.title}</strong>
                    <p>{selectedPin.note}</p>
                    <span>{selectedPin.tags.map((tag) => `#${tag}`).join(' ')}</span>
                  </div>
                </button>
                <button className={styles.mapStoryAddButton} type="button" onClick={() => onSavePin(selectedPin.id)}>
                  追加
                </button>
              </>
            )}
          </StaticMap>
        </div>
      </div>
    </section>
  )
}

function FindView({
  publicFolders,
  likedFolderIds,
  savedFolderIds,
  onOpenFolder,
  onToggleLike,
  onSaveFolder,
  onOpenProfile,
  onOpenCommunityBrowse,
  onOpenCommunity,
}: {
  publicFolders: LabFolder[]
  likedFolderIds: string[]
  savedFolderIds: string[]
  onOpenFolder: (folderId: string) => void
  onToggleLike: (folderId: string) => void
  onSaveFolder: (folderId: string) => void
  onOpenProfile: (userId: string) => void
  onOpenCommunityBrowse: () => void
  onOpenCommunity: (communityId: string) => void
}) {
  return (
    <section className={styles.page}>
      <header className={styles.findSimpleHeader}>
        <h1>Find</h1>
      </header>
      <section className={styles.communitySpotlight}>
        <div className={styles.communitySpotlightHeader}>
          <div>
            <h2>Community</h2>
          </div>
          <button className={styles.primaryButton} type="button" onClick={onOpenCommunityBrowse}>
            Open
          </button>
        </div>
        <label className={styles.communitySearchInline}>
          <Search size={17} />
          <input placeholder="Community search" />
          <button type="button" onClick={onOpenCommunityBrowse}>Open</button>
        </label>
        <div className={styles.communitySpotlightGrid}>
          {labCommunities.map((community) => (
            <button key={community.id} type="button" onClick={() => onOpenCommunity(community.id)}>
              <img src={community.thumbnailUrl} alt="" />
              <span>{community.privacy === 'private' ? 'Private' : 'Public'}</span>
              <strong>{community.name}</strong>
              <small>{community.ownerId === labCurrentUserId ? 'Open' : 'Join'} / {formatCount(community.memberCount)}人</small>
            </button>
          ))}
        </div>
      </section>
      <label className={styles.searchBox}>
        <Search size={18} />
        <input placeholder="キーワードで検索" />
        <button type="button">検索</button>
      </label>
      <div className={styles.findMain}>
        <FolderShelf
          title="最近公開されたフォルダー"
          folders={publicFolders}
          likedFolderIds={likedFolderIds}
          savedFolderIds={savedFolderIds}
          onOpenFolder={onOpenFolder}
          onToggleLike={onToggleLike}
          onSaveFolder={onSaveFolder}
          onOpenProfile={onOpenProfile}
        />
        <FolderShelf
          title="ランダムなフォルダー"
          folders={[...publicFolders].reverse()}
          likedFolderIds={likedFolderIds}
          savedFolderIds={savedFolderIds}
          onOpenFolder={onOpenFolder}
          onToggleLike={onToggleLike}
          onSaveFolder={onSaveFolder}
          onOpenProfile={onOpenProfile}
        />
        <FolderShelf
          title="好きそうなフォルダー"
          folders={publicFolders.filter((folder) => folder.ownerId !== labCurrentUserId)}
          likedFolderIds={likedFolderIds}
          savedFolderIds={savedFolderIds}
          onOpenFolder={onOpenFolder}
          onToggleLike={onToggleLike}
          onSaveFolder={onSaveFolder}
          onOpenProfile={onOpenProfile}
        />
      </div>
    </section>
  )
}

function FolderDetailView({
  folder,
  liked,
  saved,
  selectedPinId,
  onBack,
  onPin,
  onLike,
  onSave,
  onSavePin,
  onOpenProfile,
}: {
  folder: LabFolder
  liked: boolean
  saved: boolean
  selectedPinId: string | null
  onBack: () => void
  onPin: (pinId: string | null) => void
  onLike: () => void
  onSave: () => void
  onSavePin: (pinId: string) => void
  onOpenProfile: (userId: string) => void
}) {
  const [mode, setMode] = useState<FolderViewMode>('grid')
  const pins = pinsForFolder(folder)
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? null
  const owner = userById(folder.ownerId)

  return (
    <section className={`${styles.page} ${styles.findFolderDetailPage}`}>
      <div className={styles.findFolderDetailTop}>
        <button className={styles.iconGhostButton} type="button" onClick={onBack} aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <h1>{folder.name}</h1>
      </div>
      <StaticMap pins={pins} selectedPinId={selectedPinId} onPinClick={onPin} compact />
      <FolderActionBar folder={folder} liked={liked} saved={saved} onLike={onLike} onSave={onSave} />
      <div className={styles.findFolderSummary}>
        <img src={folderThumbnail(folder)} alt="" />
        <div>
          <button className={styles.folderOwnerLink} type="button" onClick={() => onOpenProfile(owner.id)}>
            @{owner.username}
          </button>
          <p>{folder.description}</p>
        </div>
      </div>
      <div className={styles.findFolderViewSwitch}>
        <button className={mode === 'grid' ? styles.active : ''} type="button" onClick={() => setMode('grid')} aria-label="グリッド表示">
          <Grid2X2 size={24} />
        </button>
        <button className={mode === 'list' ? styles.active : ''} type="button" onClick={() => setMode('list')} aria-label="リスト表示">
          <List size={24} />
        </button>
      </div>
      {mode === 'grid' ? (
        <div className={styles.findFolderPinGrid}>
          {pins.map((pin) => (
            <button key={pin.id} className={styles.findFolderGridItem} type="button" onClick={() => onPin(pin.id)}>
              <img src={pin.imageUrl} alt="" />
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.findFolderPinListMode}>
          {pins.map((pin) => (
            <button key={pin.id} className={styles.findFolderListItem} type="button" onClick={() => onPin(pin.id)}>
              <img src={pin.imageUrl} alt="" />
              <div>
                <strong>{pin.title}</strong>
                <small>{pinMeta(pin)}</small>
              </div>
            </button>
          ))}
        </div>
      )}
      {selectedPin && (
        <PinDetailCard pin={selectedPin} onClose={() => onPin(null)} onOpenProfile={onOpenProfile} onSave={() => onSavePin(selectedPin.id)} />
      )}
    </section>
  )
}

function CommunityBrowseView({
  tab,
  onTab,
  onBack,
  onOpenCommunity,
}: {
  tab: CommunityBrowseTab
  onTab: (tab: CommunityBrowseTab) => void
  onBack: () => void
  onOpenCommunity: (communityId: string) => void
}) {
  const communities = labCommunities.filter((community) => {
    if (tab === 'limited') return community.privacy === 'private'
    if (tab === 'joined') return community.ownerId === labCurrentUserId || community.pinIds.some((pinId) => labPins.find((pin) => pin.id === pinId)?.ownerId === labCurrentUserId)
    return community.privacy === 'public'
  })

  return (
    <section className={`${styles.page} ${styles.communityBrowsePage}`}>
      <header className={styles.pageHeaderRow}>
        <div>
          <span>Find</span>
          <h1>コミュニティ</h1>
        </div>
        <button className={styles.ghostButton} type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          戻る
        </button>
      </header>
      <div className={styles.communityBrowseTabs}>
        <button className={tab === 'discover' ? styles.active : ''} type="button" onClick={() => onTab('discover')}>見つける</button>
        <button className={tab === 'limited' ? styles.active : ''} type="button" onClick={() => onTab('limited')}>限定公開</button>
        <button className={tab === 'joined' ? styles.active : ''} type="button" onClick={() => onTab('joined')}>参加中</button>
      </div>
      <div className={styles.communityBrowseTools}>
        <label className={styles.searchBox}>
          <Search size={18} />
          <input placeholder="コミュニティを検索" />
        </label>
        <button className={styles.primaryButton} type="button">作成</button>
      </div>
      <section className={styles.contentSection}>
        <h2>{tab === 'joined' ? '参加中' : tab === 'limited' ? '限定公開' : '見つける'}</h2>
        <div className={styles.communityList}>
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} onOpen={() => onOpenCommunity(community.id)} />
          ))}
        </div>
      </section>
    </section>
  )
}

function CommunityCard({ community, onOpen }: { community: LabCommunity; onOpen: () => void }) {
  const owner = userById(community.ownerId)

  return (
    <article className={styles.communityCard}>
      <div className={styles.communityThumb}>
        <img src={community.thumbnailUrl} alt="" />
      </div>
      <div>
        <strong>@{owner.username}</strong>
        <h2>{community.name}</h2>
        <p>{community.description}</p>
        <span><Users size={14} /> {formatCount(community.memberCount)} members</span>
        <small>{community.privacy === 'private' ? 'Private' : 'Public'} / {community.joinPolicy}</small>
      </div>
      <div className={styles.communityCardActions}>
        <button className={styles.primaryButton} type="button" onClick={onOpen}>
          {community.ownerId === labCurrentUserId ? 'Open' : 'Join'}
        </button>
      </div>
    </article>
  )
}

function CommunityDetailView({
  community,
  detailTab,
  selectedPinId,
  onBack,
  onDetailTab,
  onPin,
  onDelete,
  onOpenProfile,
}: {
  community: LabCommunity
  detailTab: CommunityDetailTab
  selectedPinId: string | null
  onBack: () => void
  onDetailTab: (tab: CommunityDetailTab) => void
  onPin: (pinId: string | null) => void
  onDelete: () => void
  onOpenProfile: (userId: string) => void
}) {
  const pins = pinsForCommunity(community)
  const owner = userById(community.ownerId)
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) ?? null

  return (
    <section className={styles.communityDetailPage}>
      <div className={styles.communityDetailHero}>
        <button className={styles.iconGhostButton} type="button" onClick={onBack} aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.communityDetailCover}>
          <img src={community.thumbnailUrl} alt="" />
        </div>
        <div className={styles.communityDetailInfo}>
          <span>{community.privacy === 'private' ? '限定公開' : '公開共同map'} / 投稿: 参加者</span>
          <h1>{community.name}</h1>
          <p>{community.description}</p>
          <small>{formatCount(community.memberCount)} members / {pins.length} pins / @{owner.username}</small>
        </div>
      </div>
      {community.ownerId === labCurrentUserId && (
        <div className={styles.communityManageBar}>
          <button className={styles.dangerButton} type="button" onClick={onDelete}>
            <Trash2 size={16} />
            Delete community
          </button>
          <button className={styles.ghostButton} type="button">設定</button>
        </div>
      )}
      <button className={styles.communityPostButton} type="button">
        <Plus size={18} />
        投稿
      </button>
      <div className={styles.communityDetailTabs}>
        {(['pins', 'timeline', 'map'] as const).map((tab) => (
          <button key={tab} className={detailTab === tab ? styles.active : ''} type="button" onClick={() => onDetailTab(tab)}>
            {tab === 'pins' ? 'Pins' : tab === 'timeline' ? 'Timeline' : 'Map'}
          </button>
        ))}
      </div>
      {detailTab === 'pins' && (
        <div className={styles.communityPinsPanel}>
          <div className={styles.communityPinsGrid}>
            {pins.map((pin) => (
              <button key={pin.id} className={styles.communityPinTile} type="button" onClick={() => onPin(pin.id)}>
                <img src={pin.imageUrl} alt="" />
              </button>
            ))}
          </div>
          {selectedPin && (
            <article className={styles.communityPinPreview}>
              <img src={selectedPin.imageUrl} alt="" />
              <div>
                <small>@{userById(selectedPin.ownerId).username}</small>
                <strong>{selectedPin.title}</strong>
                <p>{selectedPin.note}</p>
              </div>
            </article>
          )}
        </div>
      )}
      {detailTab === 'timeline' && (
        <div className={styles.timelineListPage}>
          {community.messages.map((message) => {
            const user = userById(message.userId)
            return (
              <article key={message.id}>
                <strong>@{user.username}</strong>
                <span>{message.body}</span>
                <small>{shortDate(message.createdAt)}</small>
              </article>
            )
          })}
          {pins.map((pin) => (
            <article key={`pin-${pin.id}`} className={styles.timelinePostCard}>
              <img src={pin.imageUrl} alt="" />
              <div>
                <em>@{userById(pin.ownerId).username} がdropを追加しました</em>
                <b>{pin.title}</b>
                <small>{shortDate(pin.createdAt)}</small>
              </div>
            </article>
          ))}
          <label className={styles.timelineChatPage}>
            <input placeholder="コメントを書く" />
            <button type="button" aria-label="送信"><Send size={18} /></button>
          </label>
        </div>
      )}
      {detailTab === 'map' && (
        <div className={styles.communityDetailMap}>
          <StaticMap pins={pins} selectedPinId={selectedPinId} onPinClick={onPin}>
            {selectedPin && (
              <button className={cx(styles.mapStoryCard, styles.mapStoryCardStatic)} type="button">
                <img src={selectedPin.imageUrl} alt="" />
                <div>
                  <small>@{userById(selectedPin.ownerId).username}</small>
                  <strong>{selectedPin.title}</strong>
                  <p>{selectedPin.note}</p>
                </div>
              </button>
            )}
          </StaticMap>
        </div>
      )}
    </section>
  )
}

function RecommendView() {
  return (
    <section className={styles.recommendPage}>
      <header className={styles.pageHeader}>
        <span>Operations</span>
        <h1>Recommend</h1>
      </header>
      <div className={styles.recommendHeroRail}>
        {labRecommendItems.map((item) => (
          <article key={item.id}>
            <img src={item.imageUrl} alt="" />
            <div>
              <span>{item.type}</span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </div>
          </article>
        ))}
      </div>
      <section className={styles.contentSection}>
        <h2>Picked folders</h2>
        <div className={styles.findGrid}>
          {labFolders.filter((folder) => folder.isOfficial || folder.visibility === 'public').map((folder) => (
            <article key={folder.id} className={styles.findFolderCard}>
              <button className={styles.folderOpenButton} type="button">
                <img src={folderThumbnail(folder)} alt="" />
                <strong>{folder.name}</strong>
                <small>{folder.pinIds.length} pins</small>
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function LibraryView({
  savedFolderIds,
  savedPinIds,
  onOpenFolder,
  onOpenDropPin,
}: {
  savedFolderIds: string[]
  savedPinIds: string[]
  onOpenFolder: (folderId: string) => void
  onOpenDropPin: (pinId: string) => void
}) {
  const [mode, setMode] = useState<'folder' | 'pin'>('folder')
  const ownFolders = labFolders.filter((folder) => folder.ownerId === labCurrentUserId)
  const savedFolders = labFolders.filter((folder) => savedFolderIds.includes(folder.id) && folder.ownerId !== labCurrentUserId)
  const ownPins = labPins.filter((pin) => pin.ownerId === labCurrentUserId)
  const savedPins = labPins.filter((pin) => savedPinIds.includes(pin.id) || labFolders.some((folder) => savedFolderIds.includes(folder.id) && folder.pinIds.includes(pin.id)))

  return (
    <section className={styles.page}>
      <header className={styles.libraryRow}>
        <div className={styles.pageHeader}>
          <span>Library</span>
          <h1>Folder</h1>
        </div>
        <div className={styles.libraryModeSwitch}>
          <button className={mode === 'folder' ? styles.active : ''} type="button" onClick={() => setMode('folder')}>Folder</button>
          <button className={mode === 'pin' ? styles.active : ''} type="button" onClick={() => setMode('pin')}>Pin</button>
        </div>
      </header>
      {mode === 'folder' ? (
        <div className={styles.pinLibraryGroups}>
          <section>
            <h2>My folders</h2>
            <div className={styles.folderGrid}>
              {ownFolders.map((folder) => (
                <button key={folder.id} className={styles.folderCard} type="button" onClick={() => onOpenFolder(folder.id)}>
                  <img src={folderThumbnail(folder)} alt="" />
                  <strong>{folder.name}</strong>
                  <small>{folder.pinIds.length} pins</small>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2>Saved folders</h2>
            <div className={styles.folderGrid}>
              {savedFolders.map((folder) => (
                <button key={folder.id} className={styles.folderCard} type="button" onClick={() => onOpenFolder(folder.id)}>
                  <img src={folderThumbnail(folder)} alt="" />
                  <strong>{folder.name}</strong>
                  <small>@{userById(folder.ownerId).username} / {folder.pinIds.length} pins</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.pinLibraryGroups}>
          <section>
            <h2>My pins</h2>
            {ownPins.map((pin) => <LibraryPinRow key={pin.id} pin={pin} onOpen={() => onOpenDropPin(pin.id)} />)}
          </section>
          <section>
            <h2>Saved pins</h2>
            {savedPins.map((pin) => <LibraryPinRow key={pin.id} pin={pin} onOpen={() => onOpenDropPin(pin.id)} />)}
          </section>
        </div>
      )}
    </section>
  )
}

function LibraryPinRow({ pin, onOpen }: { pin: LabPin; onOpen: () => void }) {
  const folders = labFolders.filter((folder) => folder.pinIds.includes(pin.id)).map((folder) => folder.name)

  return (
    <article className={styles.libraryPinRow}>
      <button type="button" onClick={onOpen}>
        <img src={pin.imageUrl} alt="" />
        <span>
          <strong>{pin.title}</strong>
          <small>{pin.ownerId === labCurrentUserId ? 'Mine' : `@${userById(pin.ownerId).username}`}</small>
          <em>{folders.join(', ') || 'No folder'}</em>
        </span>
      </button>
      <button className={styles.iconGhostButton} type="button" aria-label="追加">
        <BookmarkPlus size={18} />
      </button>
    </article>
  )
}

function ProfileView({ userId, onOpenFolder }: { userId: string; onOpenFolder: (folderId: string) => void }) {
  const user = userById(userId)
  const pins = labPins.filter((pin) => pin.ownerId === user.id)
  const publicFolders = labFolders.filter((folder) => folder.ownerId === user.id && folder.visibility === 'public')

  return (
    <section className={styles.page}>
      <header className={styles.profileHeader}>
        <img src={user.avatarUrl} alt="" />
        <div>
          <span>@{user.username}</span>
          <h1>{user.displayName}</h1>
          <p>{user.bio}</p>
        </div>
      </header>
      <div className={styles.profileStats}>
        <button type="button"><strong>{pins.length}</strong><span>pins</span></button>
        <button type="button"><strong>{user.followers}</strong><span>followers</span></button>
        <button type="button"><strong>{user.following}</strong><span>following</span></button>
        <button type="button"><strong>{publicFolders.length}</strong><span>folders</span></button>
      </div>
      <section className={styles.contentSection}>
        <h2>公開中のピン</h2>
        <StaticMap pins={pins} selectedPinId={pins[0]?.id ?? null} onPinClick={() => undefined} compact />
      </section>
      <section className={styles.contentSection}>
        <h2>公開フォルダー</h2>
        <div className={styles.findGrid}>
          {publicFolders.map((folder) => (
            <article key={folder.id} className={styles.findFolderCard}>
              <button className={styles.folderOpenButton} type="button" onClick={() => onOpenFolder(folder.id)}>
                <img src={folderThumbnail(folder)} alt="" />
                <strong>{folder.name}</strong>
                <small>{folder.pinIds.length} pins</small>
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default function UiLabPage() {
  const [activeTab, setActiveTab] = useState<AppTab>('myworld')
  const [dropScopeId, setDropScopeId] = useState('follow')
  const [selectedPinId, setSelectedPinId] = useState<string | null>(labPins[0]?.id ?? null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [communityBrowseOpen, setCommunityBrowseOpen] = useState(false)
  const [communityBrowseTab, setCommunityBrowseTab] = useState<CommunityBrowseTab>('discover')
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null)
  const [communityDetailTab, setCommunityDetailTab] = useState<CommunityDetailTab>('pins')
  const [profileUserId, setProfileUserId] = useState(labCurrentUserId)
  const [likedFolderIds, setLikedFolderIds] = useState<string[]>([])
  const [savedFolderIds, setSavedFolderIds] = useState<string[]>(['f_to_visit'])
  const [savedPinIds, setSavedPinIds] = useState<string[]>([])
  const [deletedCommunityIds, setDeletedCommunityIds] = useState<string[]>([])

  const visibleCommunities = labCommunities.filter((community) => !deletedCommunityIds.includes(community.id))
  const publicFolders = labFolders.filter((folder) => folder.visibility === 'public')
  const selectedFolder = selectedFolderId ? labFolders.find((folder) => folder.id === selectedFolderId) ?? null : null
  const selectedCommunity = selectedCommunityId ? visibleCommunities.find((community) => community.id === selectedCommunityId) ?? null : null

  const dropScopes = useMemo(() => {
    const followingIds = ['u_chieko', 'u_arc']
    return [
      { id: 'chaos', label: 'Chaos', pins: labPins },
      { id: 'follow', label: 'Follow', pins: labPins.filter((pin) => followingIds.includes(pin.ownerId) || pin.ownerId === labCurrentUserId) },
      { id: 'recommend', label: 'Recommend', pins: labPins.filter((pin) => pin.saves > 10) },
      ...visibleCommunities.map((community) => ({ id: community.id, label: community.name, pins: pinsForCommunity(community) })),
      { id: 'myworld', label: 'My World', pins: labPins.filter((pin) => pin.ownerId === labCurrentUserId) },
      ...labFolders.filter((folder) => folder.ownerId === labCurrentUserId).map((folder) => ({ id: folder.id, label: folder.name, pins: pinsForFolder(folder) })),
    ]
  }, [visibleCommunities])

  const openProfile = (userId: string) => {
    setProfileUserId(userId)
    setActiveTab('mypage')
    setSelectedFolderId(null)
    setSelectedCommunityId(null)
    setCommunityBrowseOpen(false)
  }

  const openCommunity = (communityId: string) => {
    setSelectedCommunityId(communityId)
    setCommunityBrowseOpen(false)
    setCommunityDetailTab('pins')
    setActiveTab('find')
  }

  const handleTab = (tab: AppTab) => {
    setActiveTab(tab)
    setSelectedFolderId(null)
    setSelectedCommunityId(null)
    setCommunityBrowseOpen(false)
  }

  if (selectedFolder) {
    return (
      <main className={styles.shell}>
        <FolderDetailView
          folder={selectedFolder}
          liked={likedFolderIds.includes(selectedFolder.id)}
          saved={savedFolderIds.includes(selectedFolder.id)}
          selectedPinId={selectedPinId}
          onBack={() => setSelectedFolderId(null)}
          onPin={setSelectedPinId}
          onLike={() => setLikedFolderIds((current) => toggleId(current, selectedFolder.id))}
          onSave={() => setSavedFolderIds((current) => toggleId(current, selectedFolder.id))}
          onSavePin={(pinId) => setSavedPinIds((current) => toggleId(current, pinId))}
          onOpenProfile={openProfile}
        />
        <Footer activeTab={activeTab} onTab={handleTab} />
      </main>
    )
  }

  if (selectedCommunity) {
    return (
      <main className={styles.shell}>
        <CommunityDetailView
          community={selectedCommunity}
          detailTab={communityDetailTab}
          selectedPinId={selectedPinId}
          onBack={() => setSelectedCommunityId(null)}
          onDetailTab={setCommunityDetailTab}
          onPin={setSelectedPinId}
          onDelete={() => {
            setDeletedCommunityIds((current) => [...current, selectedCommunity.id])
            setSelectedCommunityId(null)
          }}
          onOpenProfile={openProfile}
        />
        <Footer activeTab={activeTab} onTab={handleTab} />
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      {activeTab === 'find' && communityBrowseOpen && (
        <CommunityBrowseView
          tab={communityBrowseTab}
          onTab={setCommunityBrowseTab}
          onBack={() => setCommunityBrowseOpen(false)}
          onOpenCommunity={openCommunity}
        />
      )}
      {activeTab === 'find' && !communityBrowseOpen && (
        <FindView
          publicFolders={publicFolders}
          likedFolderIds={likedFolderIds}
          savedFolderIds={savedFolderIds}
          onOpenFolder={setSelectedFolderId}
          onToggleLike={(folderId) => setLikedFolderIds((current) => toggleId(current, folderId))}
          onSaveFolder={(folderId) => setSavedFolderIds((current) => toggleId(current, folderId))}
          onOpenProfile={openProfile}
          onOpenCommunityBrowse={() => setCommunityBrowseOpen(true)}
          onOpenCommunity={openCommunity}
        />
      )}
      {activeTab === 'home' && <RecommendView />}
      {activeTab === 'myworld' && (
        <DropView
          scopes={dropScopes}
          activeScopeId={dropScopeId}
          selectedPinId={selectedPinId}
          onScope={(scopeId) => {
            const scope = dropScopes.find((item) => item.id === scopeId)
            setDropScopeId(scopeId)
            setSelectedPinId(scope?.pins[0]?.id ?? null)
          }}
          onPin={setSelectedPinId}
          onOpenProfile={openProfile}
          onSavePin={(pinId) => setSavedPinIds((current) => toggleId(current, pinId))}
        />
      )}
      {activeTab === 'tovisit' && (
        <LibraryView
          savedFolderIds={savedFolderIds}
          savedPinIds={savedPinIds}
          onOpenFolder={setSelectedFolderId}
          onOpenDropPin={(pinId) => {
            setActiveTab('myworld')
            setSelectedPinId(pinId)
          }}
        />
      )}
      {activeTab === 'mypage' && <ProfileView userId={profileUserId} onOpenFolder={setSelectedFolderId} />}
      <Footer activeTab={activeTab} onTab={handleTab} />
    </main>
  )
}
