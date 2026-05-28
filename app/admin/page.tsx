'use client'

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Compass,
  Database,
  Eye,
  Flag,
  Folder,
  Heart,
  LayoutDashboard,
  ListPlus,
  LogOut,
  MapPin,
  MessageCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './admin.module.css'

type JsonRecord = Record<string, unknown>
type SectionKey = 'dashboard' | 'recommend' | 'studio' | 'catalog' | 'communities' | 'moderation' | 'users'
type CatalogKind = 'folders' | 'communities' | 'posts' | 'users'

type AdminOverview = {
  counts: {
    users: number
    posts: number
    publicPosts: number
    folders: number
    publicFolders: number
    communities: number
    likes: number
    comments: number
    saves: number
    folderLikes: number
    activeUsers24h: number
    estimatedMinutes: number
  }
  reports: JsonRecord[]
  topPosts: AdminPostCard[]
  recentFolders: AdminFolderCard[]
  recentCommunities: AdminCommunityCard[]
  recentUsers: AdminUserCard[]
  communityHierarchy: AdminCommunityMember[]
  events: JsonRecord[]
  eventStats: Array<{ event_type: string; count: number }>
  recommendItems: RecommendItem[]
  warnings: string[]
}

type RecommendItem = {
  id: string
  item_type: string
  title: string
  description: string | null
  image_url: string | null
  target_url: string | null
  folder_id: string | null
  post_id: string | null
  community_id: string | null
  priority: number | null
  is_published: boolean | null
  created_at: string
}

type AdminFolderCard = {
  id: string
  user_id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  name: string
  description?: string | null
  color?: string | null
  thumbnail_url?: string | null
  preview_image_url?: string | null
  folder_kind?: string | null
  visibility?: string | null
  is_paid?: boolean | null
  pin_count?: number | null
  post_ids?: string[] | null
  created_at?: string | null
}

type AdminCommunityCard = {
  id: string
  slug?: string | null
  name: string
  description?: string | null
  thumbnail_url?: string | null
  preview_image_url?: string | null
  owner_id?: string | null
  visibility?: string | null
  community_type?: string | null
  post_policy?: string | null
  approval_required?: boolean | null
  min_contribution_level?: number | null
  is_paid?: boolean | null
  price_yen?: number | null
  member_count?: number | null
  posts_count?: number | null
  joined_by_me?: boolean | null
  created_at?: string | null
}

type AdminCommunityMember = {
  community_id: string
  community_name: string
  community_type?: string | null
  post_policy?: string | null
  community_visibility?: string | null
  user_id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  role?: string | null
  contribution_level?: number | null
  approved_posts_count?: number | null
  status?: string | null
  joined_at?: string | null
}

type AdminPostCard = {
  id: string
  user_id?: string | null
  username?: string | null
  display_name?: string | null
  title?: string | null
  description?: string | null
  image_url?: string | null
  visibility?: string | null
  likes_count?: number | null
  comments_count?: number | null
  saves_count?: number | null
  reports_count?: number | null
  created_at?: string | null
}

type AdminUserCard = {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  pin_count?: number | null
  public_pin_count?: number | null
  folder_count?: number | null
  public_folder_count?: number | null
  follower_count?: number | null
  following_count?: number | null
  created_at?: string | null
}

type CatalogRow = AdminFolderCard | AdminCommunityCard | AdminPostCard | AdminUserCard

type PendingRecommend = {
  key: string
  item_type: string
  title: string
  description: string
  image_url: string
  target_url: string
  folder_id: string
  post_id: string
  community_id: string
  is_published: boolean
  sourceLabel: string
}

type OfficialFolderForm = {
  name: string
  description: string
  color: string
  visibility: 'public' | 'private'
  addToRecommend: boolean
}

const emptyRecommend = {
  id: '',
  item_type: 'folder_pick',
  title: '',
  description: '',
  image_url: '',
  target_url: '',
  folder_id: '',
  post_id: '',
  community_id: '',
  priority: '100',
  is_published: true,
}

const sectionItems: Array<{ key: SectionKey; label: string; icon: ReactNode }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { key: 'recommend', label: 'Recommend', icon: <Sparkles size={17} /> },
  { key: 'studio', label: 'Folder Studio', icon: <Folder size={17} /> },
  { key: 'catalog', label: 'Catalog', icon: <Database size={17} /> },
  { key: 'communities', label: 'Communities', icon: <Compass size={17} /> },
  { key: 'moderation', label: 'Moderation', icon: <ShieldAlert size={17} /> },
  { key: 'users', label: 'Users', icon: <Users size={17} /> },
]

const catalogLabels: Record<CatalogKind, string> = {
  folders: 'Folders',
  communities: 'Communities',
  posts: 'Posts',
  users: 'Users',
}

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [recommendForm, setRecommendForm] = useState(emptyRecommend)
  const [reportQuery, setReportQuery] = useState('')
  const [section, setSection] = useState<SectionKey>('dashboard')
  const [catalogKind, setCatalogKind] = useState<CatalogKind>('folders')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogRows, setCatalogRows] = useState<CatalogRow[]>([])
  const [catalogWarnings, setCatalogWarnings] = useState<string[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [pendingRecommendItems, setPendingRecommendItems] = useState<PendingRecommend[]>([])
  const [savingPendingRecommend, setSavingPendingRecommend] = useState(false)
  const [officialFolderForm, setOfficialFolderForm] = useState<OfficialFolderForm>({
    name: '',
    description: '',
    color: '#126b58',
    visibility: 'public',
    addToRecommend: true,
  })
  const [officialFolderPostQuery, setOfficialFolderPostQuery] = useState('')
  const [officialFolderPostRows, setOfficialFolderPostRows] = useState<AdminPostCard[]>([])
  const [officialFolderPostIds, setOfficialFolderPostIds] = useState<string[]>([])
  const [officialFolderPostLoading, setOfficialFolderPostLoading] = useState(false)
  const [officialFolderSaving, setOfficialFolderSaving] = useState(false)

  const isConfigured = Boolean(supabase)

  const loadOverview = useCallback(async (accessToken = token) => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage('')

    const response = await fetch('/api/admin/overview', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const data = await response.json()

    if (!response.ok) {
      setOverview(null)
      setMessage(data.error || '管理画面を読み込めませんでした。')
      setLoading(false)
      return
    }

    setOverview(data)
    setLoading(false)
  }, [token])

  const loadCatalog = useCallback(async (kind = catalogKind, search = catalogQuery, accessToken = token) => {
    if (!accessToken) return
    setCatalogLoading(true)
    const params = new URLSearchParams({ kind, q: search, limit: '120' })
    const response = await fetch(`/api/admin/catalog?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const data = await response.json()
    if (!response.ok) {
      setCatalogRows([])
      setCatalogWarnings([data.error || 'Catalogを読み込めませんでした。'])
      setCatalogLoading(false)
      return
    }
    setCatalogRows(Array.isArray(data.rows) ? data.rows : [])
    setCatalogWarnings(Array.isArray(data.warnings) ? data.warnings : [])
    setCatalogLoading(false)
  }, [catalogKind, catalogQuery, token])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setMessage('Supabaseの環境変数が未設定です。')
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token ?? ''
      setToken(accessToken)
      void loadOverview(accessToken)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessToken = session?.access_token ?? ''
      setToken(accessToken)
      if (accessToken) {
        void loadOverview(accessToken)
      } else {
        setOverview(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadOverview])

  useEffect(() => {
    if (!token || (section !== 'catalog' && section !== 'recommend')) return
    const id = window.setTimeout(() => {
      void loadCatalog(catalogKind, catalogQuery, token)
    }, 220)
    return () => window.clearTimeout(id)
  }, [catalogKind, catalogQuery, loadCatalog, section, token])

  const loadOfficialFolderPosts = useCallback(async (search = officialFolderPostQuery, accessToken = token) => {
    if (!accessToken) return
    setOfficialFolderPostLoading(true)
    const params = new URLSearchParams({ kind: 'posts', q: search, limit: '120' })
    const response = await fetch(`/api/admin/catalog?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    const data = await response.json()
    if (!response.ok) {
      setActionMessage(data.error || '投稿候補を読み込めませんでした。')
      setOfficialFolderPostRows([])
      setOfficialFolderPostLoading(false)
      return
    }
    setOfficialFolderPostRows(Array.isArray(data.rows) ? data.rows : [])
    setOfficialFolderPostLoading(false)
  }, [officialFolderPostQuery, token])

  useEffect(() => {
    if (!token || section !== 'studio') return
    const id = window.setTimeout(() => {
      void loadOfficialFolderPosts(officialFolderPostQuery, token)
    }, 220)
    return () => window.clearTimeout(id)
  }, [loadOfficialFolderPosts, officialFolderPostQuery, section, token])

  const filteredReports = useMemo(() => {
    const text = reportQuery.trim().toLowerCase()
    if (!text) return overview?.reports ?? []
    return (overview?.reports ?? []).filter((report) => JSON.stringify(report).toLowerCase().includes(text))
  }, [overview?.reports, reportQuery])

  const sortedRecommendItems = useMemo(() => {
    return [...(overview?.recommendItems ?? [])].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  }, [overview?.recommendItems])
  const queuedRecommendKeys = useMemo(() => new Set(pendingRecommendItems.map((item) => item.key)), [pendingRecommendItems])
  const selectedOfficialFolderPosts = useMemo(
    () => officialFolderPostIds
      .map((postId) => officialFolderPostRows.find((post) => post.id === postId))
      .filter((post): post is AdminPostCard => Boolean(post)),
    [officialFolderPostIds, officialFolderPostRows],
  )

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('メールアドレスまたはパスワードが間違っています。')
      return
    }
    const accessToken = data.session?.access_token ?? ''
    setToken(accessToken)
    await loadOverview(accessToken)
  }

  const saveRecommend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await upsertRecommend({
      id: recommendForm.id || undefined,
      item_type: recommendForm.item_type,
      title: recommendForm.title,
      description: recommendForm.description,
      image_url: recommendForm.image_url,
      target_url: recommendForm.target_url,
      folder_id: recommendForm.folder_id,
      post_id: recommendForm.post_id,
      community_id: recommendForm.community_id,
      priority: Number(recommendForm.priority) || 100,
      is_published: recommendForm.is_published,
    })
    setRecommendForm(emptyRecommend)
  }

  const upsertRecommend = async (payload: Record<string, unknown>) => {
    if (!token) return
    setActionMessage('')
    const response = await fetch('/api/admin/recommend', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) {
      setActionMessage(data.error || 'Recommendを保存できませんでした。')
      return
    }
    setActionMessage('Recommendを更新しました。')
    await loadOverview()
  }

  const queueRecommend = (item: PendingRecommend) => {
    setPendingRecommendItems((current) => {
      if (current.some((queued) => queued.key === item.key)) return current
      return [...current, item]
    })
    setActionMessage(`${item.title} をRecommendの保存待ちに入れました。Save picksで反映されます。`)
  }

  const addFolderToRecommend = (folder: AdminFolderCard, itemType: 'folder_pick' | 'official_folder') => {
    queueRecommend({
      key: `${itemType}:folder:${folder.id}`,
      item_type: itemType,
      title: folder.name,
      description: folder.description || `@${folder.username ?? 'user'} / ${folder.pin_count ?? 0} pins`,
      image_url: folder.thumbnail_url || folder.preview_image_url || '',
      target_url: '',
      folder_id: folder.id,
      post_id: '',
      community_id: '',
      is_published: true,
      sourceLabel: itemType === 'official_folder' ? 'Official folder' : 'Picked folder',
    })
  }

  const addCommunityToRecommend = (community: AdminCommunityCard) => {
    queueRecommend({
      key: `community_pick:community:${community.id}`,
      item_type: 'community_pick',
      title: community.name,
      description: community.description || `${community.member_count ?? 0} members / ${community.posts_count ?? 0} pins`,
      image_url: community.thumbnail_url || community.preview_image_url || '',
      target_url: '',
      folder_id: '',
      post_id: '',
      community_id: community.id,
      is_published: true,
      sourceLabel: 'Picked community',
    })
  }

  const savePendingRecommendItems = async () => {
    if (!token || !pendingRecommendItems.length) return
    setSavingPendingRecommend(true)
    setActionMessage('')
    const nextPriority = getNextPriority(sortedRecommendItems)

    for (const [index, item] of pendingRecommendItems.entries()) {
      const response = await fetch('/api/admin/recommend', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_type: item.item_type,
          title: item.title,
          description: item.description,
          image_url: item.image_url,
          target_url: item.target_url,
          folder_id: item.folder_id,
          post_id: item.post_id,
          community_id: item.community_id,
          priority: nextPriority + (index * 10),
          is_published: item.is_published,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setActionMessage(data.error || `${item.title} を保存できませんでした。`)
        setSavingPendingRecommend(false)
        return
      }
    }

    setPendingRecommendItems([])
    setSavingPendingRecommend(false)
    setActionMessage('選択した項目をRecommendに保存しました。')
    await loadOverview()
  }

  const toggleOfficialFolderPost = (postId: string) => {
    setOfficialFolderPostIds((current) => (
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId]
    ))
  }

  const saveOfficialFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setOfficialFolderSaving(true)
    setActionMessage('')

    const response = await fetch('/api/admin/folders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...officialFolderForm,
        post_ids: officialFolderPostIds,
      }),
    })
    const data = await response.json()

    if (!response.ok) {
      setActionMessage(data.error || '運営フォルダーを作成できませんでした。')
      setOfficialFolderSaving(false)
      return
    }

    const folder = data.folder as AdminFolderCard
    if (officialFolderForm.addToRecommend) {
      await upsertRecommend({
        item_type: 'official_folder',
        title: folder.name,
        description: folder.description || `${officialFolderPostIds.length} pins`,
        image_url: folder.thumbnail_url || '',
        folder_id: folder.id,
        priority: getNextPriority(sortedRecommendItems),
        is_published: true,
      })
    } else {
      setActionMessage('運営フォルダーを作成しました。')
      await loadOverview()
    }

    setOfficialFolderForm({
      name: '',
      description: '',
      color: '#126b58',
      visibility: 'public',
      addToRecommend: true,
    })
    setOfficialFolderPostIds([])
    setOfficialFolderSaving(false)
  }

  const deleteRecommend = async (id: string) => {
    if (!token) return
    const response = await fetch(`/api/admin/recommend?id=${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await response.json()
    if (!response.ok) {
      setActionMessage(data.error || 'Recommendを削除できませんでした。')
      return
    }
    setActionMessage('Recommendから削除しました。')
    await loadOverview()
  }

  const moveRecommend = async (id: string, direction: -1 | 1) => {
    if (!token) return
    const current = sortedRecommendItems
    const index = current.findIndex((item) => item.id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return

    const reordered = [...current]
    const [item] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, item)
    const items = reordered.map((recommend, order) => ({ id: recommend.id, priority: (order + 1) * 10 }))

    const response = await fetch('/api/admin/recommend', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    })
    const data = await response.json()
    if (!response.ok) {
      setActionMessage(data.error || '順番を更新できませんでした。')
      return
    }
    await loadOverview()
  }

  if (!isConfigured) {
    return (
      <main className={styles.adminShell}>
        <section className={styles.authCard}>
          <ShieldCheck size={30} />
          <h1>Admin setup required</h1>
          <p>Supabaseの公開環境変数が未設定です。</p>
        </section>
      </main>
    )
  }

  if (!token) {
    return (
      <main className={styles.adminShell}>
        <form className={styles.authCard} onSubmit={signIn}>
          <ShieldCheck size={30} />
          <h1>Admin sign in</h1>
          <p>運営権限のあるアカウントでログインしてください。</p>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {message && <p className={styles.error}>{message}</p>}
          <button type="submit">Sign in</button>
        </form>
      </main>
    )
  }

  return (
    <main className={styles.adminShell}>
      <header className={styles.adminHeader}>
        <div>
          <span>Operations</span>
          <h1>Spot Map Admin</h1>
          <p>Recommend、公開フォルダー、コミュニティ、通報、利用シグナルをまとめて見る場所。</p>
        </div>
        <div>
          <button type="button" onClick={() => loadOverview()}><RefreshCcw size={17} /> Refresh</button>
          <button type="button" onClick={() => supabase?.auth.signOut()}><LogOut size={17} /> Sign out</button>
        </div>
      </header>

      <nav className={styles.adminNav} aria-label="Admin sections">
        {sectionItems.map((item) => (
          <button
            key={item.key}
            className={section === item.key ? styles.active : ''}
            type="button"
            onClick={() => setSection(item.key)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {message && <p className={styles.error}>{message}</p>}
      {actionMessage && <p className={styles.notice}>{actionMessage}</p>}
      {loading && <p className={styles.notice}>Loading admin data...</p>}
      {overview?.warnings?.length ? (
        <section className={styles.warningCard}>
          <AlertTriangle size={20} />
          <div>
            <strong>Supabase SQLの追加が必要な項目があります</strong>
            {overview.warnings.map((warning) => <span key={warning}>{warning}</span>)}
          </div>
        </section>
      ) : null}

      {overview && (
        <>
          <section className={styles.metricGrid}>
            <Metric icon={<Users />} label="Users" value={overview.counts.users} />
            <Metric icon={<MapPin />} label="Posts" value={overview.counts.posts} caption={`${overview.counts.publicPosts} public`} />
            <Metric icon={<Folder />} label="Folders" value={overview.counts.folders} caption={`${overview.counts.publicFolders} public`} />
            <Metric icon={<Compass />} label="Communities" value={overview.counts.communities} />
            <Metric icon={<Eye />} label="Active 24h" value={overview.counts.activeUsers24h} />
            <Metric icon={<BarChart3 />} label="Stay signal" value={`${overview.counts.estimatedMinutes}m`} caption="heartbeat based" />
            <Metric icon={<Heart />} label="Post likes" value={overview.counts.likes} />
            <Metric icon={<MessageCircle />} label="Comments" value={overview.counts.comments} />
            <Metric icon={<ListPlus />} label="Saves" value={overview.counts.saves} />
            <Metric icon={<Sparkles />} label="Folder likes" value={overview.counts.folderLikes} />
          </section>

          {pendingRecommendItems.length ? (
            <section className={styles.pendingBar}>
              <div>
                <span>Recommend picks</span>
                <strong>{pendingRecommendItems.length} items waiting</strong>
              </div>
              <div className={styles.pendingChips}>
                {pendingRecommendItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPendingRecommendItems((current) => current.filter((queued) => queued.key !== item.key))}
                  >
                    {item.sourceLabel}: {item.title}
                  </button>
                ))}
              </div>
              <button type="button" onClick={savePendingRecommendItems} disabled={savingPendingRecommend}>
                {savingPendingRecommend ? 'Saving...' : 'Save picks'}
              </button>
            </section>
          ) : null}

          {section === 'dashboard' && (
            <section className={styles.adminGrid}>
              <Panel eyebrow="Strategy" title="運営判断ボード" icon={<LayoutDashboard size={22} />}>
                <div className={styles.strategyGrid}>
                  <StrategyCard title="供給" value={`${overview.counts.publicFolders} public folders`} caption="Find / Recommend の素材量。少ない日は運営pickを増やす。" />
                  <StrategyCard title="反応" value={`${overview.counts.saves} saves`} caption="保存数が高い投稿やフォルダーはRecommend候補。" />
                  <StrategyCard title="健全性" value={`${overview.reports.length} reports`} caption="通報が出たらModerationで先に確認。" />
                  <StrategyCard title="滞在" value={`${overview.counts.activeUsers24h} active`} caption="初期表示が遅い時はDrop/Recommendの取得量を見直す。" />
                </div>
                <div className={styles.codeHint}>
                  <strong>自分を運営ユーザーにするSQL</strong>
                  <code>{`insert into public.admin_users (user_id, role)
values ('Supabase Auth の自分の user_id', 'owner')
on conflict (user_id) do update set role = excluded.role;`}</code>
                </div>
              </Panel>

              <Panel eyebrow="Pulse" title="Event breakdown" icon={<BarChart3 size={22} />}>
                <div className={styles.eventList}>
                  {overview.eventStats.map((event) => (
                    <div key={event.event_type}>
                      <span>{event.event_type}</span>
                      <strong>{event.count}</strong>
                    </div>
                  ))}
                  {!overview.eventStats.length && <p className={styles.empty}>まだイベントログがありません。</p>}
                </div>
              </Panel>

              <Panel eyebrow="Fresh" title="Recent folders" icon={<Folder size={22} />}>
                <div className={styles.itemList}>
                  {overview.recentFolders.slice(0, 8).map((folder) => (
                    <FolderRow
                      key={folder.id}
                      folder={folder}
                      onPick={() => addFolderToRecommend(folder, 'folder_pick')}
                      onOfficial={() => addFolderToRecommend(folder, 'official_folder')}
                    />
                  ))}
                </div>
              </Panel>

              <Panel eyebrow="Fresh" title="Recent communities" icon={<Compass size={22} />}>
                <div className={styles.itemList}>
                  {overview.recentCommunities.slice(0, 8).map((community) => (
                    <CommunityRow key={community.id} community={community} onPick={() => addCommunityToRecommend(community)} />
                  ))}
                </div>
              </Panel>
            </section>
          )}

          {section === 'recommend' && (
            <section className={styles.adminGrid}>
              <Panel eyebrow="CMS" title="Recommend queue" icon={<Sparkles size={22} />}>
                <p className={styles.panelCopy}>
                  アプリ内のRecommendには、運営作成フォルダー、運営ピックアップフォルダー、ピックアップコミュニティ、イベント告知がこの順番で表示されます。
                </p>
                <div className={styles.itemList}>
                  {sortedRecommendItems.map((item, index) => (
                    <RecommendRow
                      key={item.id}
                      item={item}
                      onEdit={() => setRecommendForm(toRecommendForm(item))}
                      onDelete={() => deleteRecommend(item.id)}
                      onMoveUp={() => moveRecommend(item.id, -1)}
                      onMoveDown={() => moveRecommend(item.id, 1)}
                      disableUp={index === 0}
                      disableDown={index === sortedRecommendItems.length - 1}
                    />
                  ))}
                  {!sortedRecommendItems.length && <p className={styles.empty}>Recommendはまだありません。</p>}
                </div>
              </Panel>

              <Panel eyebrow="Editor" title={recommendForm.id ? 'Edit recommend' : 'Create recommend'} icon={<ListPlus size={22} />}>
                <form className={styles.recommendForm} onSubmit={saveRecommend}>
                  <div className={styles.twoColumns}>
                    <label>
                      Type
                      <select value={recommendForm.item_type} onChange={(event) => setRecommendForm({ ...recommendForm, item_type: event.target.value })}>
                        <option value="folder_pick">folder_pick</option>
                        <option value="official_folder">official_folder</option>
                        <option value="community_pick">community_pick</option>
                        <option value="event">event</option>
                        <option value="post_pick">post_pick</option>
                        <option value="announcement">announcement</option>
                      </select>
                    </label>
                    <label>
                      Priority
                      <input value={recommendForm.priority} onChange={(event) => setRecommendForm({ ...recommendForm, priority: event.target.value })} inputMode="numeric" />
                    </label>
                  </div>
                  <label>
                    Title
                    <input value={recommendForm.title} onChange={(event) => setRecommendForm({ ...recommendForm, title: event.target.value })} />
                  </label>
                  <label>
                    Description
                    <textarea value={recommendForm.description} onChange={(event) => setRecommendForm({ ...recommendForm, description: event.target.value })} />
                  </label>
                  <label>
                    Image URL
                    <input value={recommendForm.image_url} onChange={(event) => setRecommendForm({ ...recommendForm, image_url: event.target.value })} />
                  </label>
                  <label>
                    Target URL
                    <input value={recommendForm.target_url} onChange={(event) => setRecommendForm({ ...recommendForm, target_url: event.target.value })} />
                  </label>
                  <div className={styles.threeColumns}>
                    <label>
                      Folder ID
                      <input value={recommendForm.folder_id} onChange={(event) => setRecommendForm({ ...recommendForm, folder_id: event.target.value })} />
                    </label>
                    <label>
                      Post ID
                      <input value={recommendForm.post_id} onChange={(event) => setRecommendForm({ ...recommendForm, post_id: event.target.value })} />
                    </label>
                    <label>
                      Community ID
                      <input value={recommendForm.community_id} onChange={(event) => setRecommendForm({ ...recommendForm, community_id: event.target.value })} />
                    </label>
                  </div>
                  <label className={styles.switchRow}>
                    <input type="checkbox" checked={recommendForm.is_published} onChange={(event) => setRecommendForm({ ...recommendForm, is_published: event.target.checked })} />
                    Published
                  </label>
                  <div className={styles.formActions}>
                    <button type="submit">{recommendForm.id ? 'Update recommend' : 'Create recommend'}</button>
                    {recommendForm.id && <button type="button" onClick={() => setRecommendForm(emptyRecommend)}>Cancel edit</button>}
                  </div>
                </form>
              </Panel>

              <Panel eyebrow="Source" title="Add from app content" icon={<Database size={22} />}>
                <CatalogControls
                  kind={catalogKind}
                  query={catalogQuery}
                  onKind={setCatalogKind}
                  onQuery={setCatalogQuery}
                  compact
                />
                {catalogLoading && <p className={styles.notice}>Catalog loading...</p>}
                {catalogWarnings.map((warning) => <p className={styles.error} key={warning}>{warning}</p>)}
                <div className={styles.itemList}>
                  {catalogRows.map((row) => (
                    <CatalogRowItem
                      key={row.id}
                      kind={catalogKind}
                      row={row}
                      onPickFolder={(folder, type) => addFolderToRecommend(folder, type)}
                      onPickCommunity={addCommunityToRecommend}
                      queuedKeys={queuedRecommendKeys}
                    />
                  ))}
                </div>
              </Panel>
            </section>
          )}

          {section === 'studio' && (
            <section className={styles.adminGrid}>
              <Panel eyebrow="Create" title="Official folder studio" icon={<Folder size={22} />}>
                <div className={styles.creatorHero}>
                  <strong>運営フォルダーを作る</strong>
                  <p>下の投稿候補からpinを選び、名前と説明を書いて保存します。公開にすればFindやRecommendの素材になります。</p>
                </div>
                <form className={styles.recommendForm} onSubmit={saveOfficialFolder}>
                  <label>
                    Folder name
                    <input value={officialFolderForm.name} onChange={(event) => setOfficialFolderForm({ ...officialFolderForm, name: event.target.value })} placeholder="例: Brussels night architecture" />
                  </label>
                  <label>
                    Description
                    <textarea value={officialFolderForm.description} onChange={(event) => setOfficialFolderForm({ ...officialFolderForm, description: event.target.value })} placeholder="このフォルダーを見た人が保存したくなる一言" />
                  </label>
                  <div className={styles.twoColumns}>
                    <label>
                      Color
                      <input type="color" value={officialFolderForm.color} onChange={(event) => setOfficialFolderForm({ ...officialFolderForm, color: event.target.value })} />
                    </label>
                    <label>
                      Visibility
                      <select value={officialFolderForm.visibility} onChange={(event) => setOfficialFolderForm({ ...officialFolderForm, visibility: event.target.value as OfficialFolderForm['visibility'] })}>
                        <option value="public">public</option>
                        <option value="private">private</option>
                      </select>
                    </label>
                  </div>
                  <label className={styles.switchRow}>
                    <input
                      type="checkbox"
                      checked={officialFolderForm.addToRecommend}
                      onChange={(event) => setOfficialFolderForm({ ...officialFolderForm, addToRecommend: event.target.checked })}
                    />
                    SaveしたあとRecommendにも載せる
                  </label>
                  <div className={styles.selectedPinList}>
                    <span>{officialFolderPostIds.length} pins selected</span>
                    {selectedOfficialFolderPosts.map((post) => (
                      <button key={post.id} type="button" onClick={() => toggleOfficialFolderPost(post.id)}>
                        {post.title || post.id}
                      </button>
                    ))}
                  </div>
                  <button type="submit" disabled={officialFolderSaving}>
                    {officialFolderSaving ? 'Saving folder...' : 'Save official folder'}
                  </button>
                </form>
              </Panel>

              <Panel eyebrow="Pins" title="Add pins to folder" icon={<MapPin size={22} />}>
                <label className={styles.searchField}>
                  <Search size={18} />
                  <input value={officialFolderPostQuery} onChange={(event) => setOfficialFolderPostQuery(event.target.value)} placeholder="投稿タイトル、説明、@usernameで検索" />
                </label>
                {officialFolderPostLoading && <p className={styles.notice}>Post loading...</p>}
                <div className={styles.itemList}>
                  {officialFolderPostRows.map((post) => (
                    <PostSelectRow
                      key={post.id}
                      post={post}
                      selected={officialFolderPostIds.includes(post.id)}
                      onToggle={() => toggleOfficialFolderPost(post.id)}
                    />
                  ))}
                  {!officialFolderPostRows.length && !officialFolderPostLoading && <p className={styles.empty}>候補になる投稿がありません。</p>}
                </div>
              </Panel>
            </section>
          )}

          {section === 'catalog' && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Catalog</span>
                  <h2>アプリ内コンテンツ検索</h2>
                </div>
                <Search size={22} />
              </div>
              <CatalogControls kind={catalogKind} query={catalogQuery} onKind={setCatalogKind} onQuery={setCatalogQuery} />
              {catalogLoading && <p className={styles.notice}>Catalog loading...</p>}
              {catalogWarnings.map((warning) => <p className={styles.error} key={warning}>{warning}</p>)}
              <div className={styles.catalogTable}>
                {catalogRows.map((row) => (
                  <CatalogRowItem
                    key={row.id}
                    kind={catalogKind}
                    row={row}
                    onPickFolder={(folder, type) => addFolderToRecommend(folder, type)}
                    onPickCommunity={addCommunityToRecommend}
                    queuedKeys={queuedRecommendKeys}
                    wide
                  />
                ))}
                {!catalogRows.length && !catalogLoading && <p className={styles.empty}>該当するデータがありません。</p>}
              </div>
            </section>
          )}

          {section === 'communities' && (
            <section className={styles.adminGrid}>
              <Panel eyebrow="Community" title="権限と貢献度" icon={<Compass size={22} />}>
                <div className={styles.signalList}>
                  <Signal title="level 0" body="参加直後。閲覧、コメント、保存を中心に使う。" />
                  <Signal title="level 1" body="承認済みpinが3件ほどある編集者候補。投稿開放の基準に使う。" />
                  <Signal title="level 2" body="共同制作者やモデレーター候補。投稿承認や整理を任せる候補。" />
                </div>
              </Panel>

              <Panel eyebrow="Members" title="Community hierarchy" icon={<Users size={22} />}>
                <div className={styles.itemList}>
                  {overview.communityHierarchy.map((member) => (
                    <CommunityHierarchyRow key={`${member.community_id}-${member.user_id}`} member={member} />
                  ))}
                  {!overview.communityHierarchy.length && <p className={styles.empty}>community階層データがありません。追加SQLをrunしてください。</p>}
                </div>
              </Panel>
            </section>
          )}

          {section === 'moderation' && (
            <section className={styles.adminGrid}>
              <Panel eyebrow="Moderation" title="Reports" icon={<Flag size={22} />}>
                <label className={styles.searchField}>
                  <Search size={18} />
                  <input value={reportQuery} onChange={(event) => setReportQuery(event.target.value)} placeholder="通報、ユーザー、投稿を検索" />
                </label>
                <div className={styles.itemList}>
                  {filteredReports.map((report) => (
                    <article key={String(report.id)}>
                      <img src={getNestedString(report, 'posts', 'image_url') || '/favicon.ico'} alt="" />
                      <div>
                        <strong>{getNestedString(report, 'posts', 'title') || String(report.post_id ?? '')}</strong>
                        <span>@{getNestedString(report, 'profiles', 'username') || String(report.user_id ?? '')} / {String(report.reason || 'reasonなし')}</span>
                      </div>
                      <small>{formatDate(String(report.created_at ?? ''))}</small>
                    </article>
                  ))}
                  {!filteredReports.length && <p className={styles.empty}>通報はありません。</p>}
                </div>
              </Panel>

              <Panel eyebrow="Content" title="Top saved posts" icon={<Heart size={22} />}>
                <div className={styles.itemList}>
                  {overview.topPosts.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </div>
              </Panel>
            </section>
          )}

          {section === 'users' && (
            <section className={styles.adminGrid}>
              <Panel eyebrow="Users" title="Recent users" icon={<Users size={22} />}>
                <div className={styles.itemList}>
                  {overview.recentUsers.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </div>
              </Panel>

              <Panel eyebrow="Notifications" title="運営が見るべき兆候" icon={<Bell size={22} />}>
                <div className={styles.signalList}>
                  <Signal title="初回体験" body="Sign in後に自分のprofileとmy contentを最優先で出す。空のchaos/recommend取得で待たせない。" />
                  <Signal title="投稿供給" body="投稿数に対して公開フォルダーが少ない場合、folder化を促すUIや運営pickが必要。" />
                  <Signal title="Recommend運用" body="保存数、folder like、通報ゼロ、画像の見栄えを基準に週次で並び替える。" />
                  <Signal title="治安" body="reports_countが上がった投稿はRecommendから外し、必要なら非公開化する運用にする。" />
                </div>
              </Panel>
            </section>
          )}
        </>
      )}
    </main>
  )
}

function Panel({ eyebrow, title, icon, children }: { eyebrow: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {icon}
      </div>
      {children}
    </section>
  )
}

function Metric({ icon, label, value, caption }: { icon: ReactNode; label: string; value: ReactNode; caption?: string }) {
  return (
    <article className={styles.metricCard}>
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
        {caption && <em>{caption}</em>}
      </div>
    </article>
  )
}

function StrategyCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <article className={styles.strategyCard}>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{caption}</p>
    </article>
  )
}

function Signal({ title, body }: { title: string; body: string }) {
  return (
    <article>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  )
}

function CatalogControls({ kind, query, onKind, onQuery, compact = false }: {
  kind: CatalogKind
  query: string
  onKind: (kind: CatalogKind) => void
  onQuery: (query: string) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? styles.catalogControlsCompact : styles.catalogControls}>
      <div className={styles.catalogTabs}>
        {(Object.keys(catalogLabels) as CatalogKind[]).map((item) => (
          <button key={item} className={kind === item ? styles.active : ''} type="button" onClick={() => onKind(item)}>
            {catalogLabels[item]}
          </button>
        ))}
      </div>
      <label className={styles.searchField}>
        <Search size={18} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="名前、@username、説明文で検索" />
      </label>
    </div>
  )
}

function CatalogRowItem({ kind, row, onPickFolder, onPickCommunity, queuedKeys, wide = false }: {
  kind: CatalogKind
  row: CatalogRow
  onPickFolder: (folder: AdminFolderCard, type: 'folder_pick' | 'official_folder') => void
  onPickCommunity: (community: AdminCommunityCard) => void
  queuedKeys?: Set<string>
  wide?: boolean
}) {
  if (kind === 'folders') {
    const folder = row as AdminFolderCard
    return (
      <FolderRow
        folder={folder}
        wide={wide}
        picked={queuedKeys?.has(`folder_pick:folder:${folder.id}`)}
        officialPicked={queuedKeys?.has(`official_folder:folder:${folder.id}`)}
        onPick={() => onPickFolder(folder, 'folder_pick')}
        onOfficial={() => onPickFolder(folder, 'official_folder')}
      />
    )
  }

  if (kind === 'communities') {
    const community = row as AdminCommunityCard
    return (
      <CommunityRow
        community={community}
        wide={wide}
        picked={queuedKeys?.has(`community_pick:community:${community.id}`)}
        onPick={() => onPickCommunity(community)}
      />
    )
  }

  if (kind === 'posts') return <PostRow post={row as AdminPostCard} wide={wide} />

  return <UserRow user={row as AdminUserCard} wide={wide} />
}

function FolderRow({ folder, onPick, onOfficial, wide = false, picked = false, officialPicked = false }: {
  folder: AdminFolderCard
  onPick: () => void
  onOfficial: () => void
  wide?: boolean
  picked?: boolean
  officialPicked?: boolean
}) {
  return (
    <article className={wide ? styles.wideRow : ''}>
      <img src={folder.thumbnail_url || folder.preview_image_url || '/favicon.ico'} alt="" />
      <div>
        <strong>{folder.name}</strong>
        <span>@{folder.username ?? folder.user_id} / {folder.visibility ?? 'private'} / {folder.pin_count ?? folder.post_ids?.length ?? 0} pins</span>
      </div>
      <button className={picked ? styles.selectedAction : ''} type="button" onClick={onPick} disabled={picked}>
        {picked ? 'Picked' : 'Pick'}
      </button>
      <button className={officialPicked ? styles.selectedAction : ''} type="button" onClick={onOfficial} disabled={officialPicked}>
        {officialPicked ? 'Official picked' : 'Official'}
      </button>
    </article>
  )
}

function CommunityRow({ community, onPick, wide = false, picked = false }: { community: AdminCommunityCard; onPick: () => void; wide?: boolean; picked?: boolean }) {
  return (
    <article className={wide ? styles.wideRow : ''}>
      {community.thumbnail_url || community.preview_image_url ? (
        <img src={community.thumbnail_url || community.preview_image_url || '/favicon.ico'} alt="" />
      ) : (
        <div className={styles.avatarFallback}><Compass size={20} /></div>
      )}
      <div>
        <strong>{community.name}</strong>
        <span>{community.community_type ?? community.visibility ?? 'public'} / {community.post_policy ?? 'open'} / {community.member_count ?? 0} members / {community.posts_count ?? 0} pins</span>
      </div>
      <button className={picked ? styles.selectedAction : ''} type="button" onClick={onPick} disabled={picked}>
        {picked ? 'Picked' : 'Pick'}
      </button>
    </article>
  )
}

function CommunityHierarchyRow({ member }: { member: AdminCommunityMember }) {
  return (
    <article>
      <img src={member.avatar_url || '/favicon.ico'} alt="" />
      <div>
        <strong>{member.community_name}</strong>
        <span>
          @{member.username ?? member.user_id} / {member.role ?? 'member'} / level {member.contribution_level ?? 0}
          {' '} / {member.approved_posts_count ?? 0} approved / {member.status ?? 'active'}
        </span>
        <small>{member.community_type ?? 'open'} / {member.post_policy ?? 'open'} / {member.community_visibility ?? 'public'}</small>
      </div>
      <small>{formatDate(member.joined_at ?? '')}</small>
    </article>
  )
}

function PostRow({ post, wide = false }: { post: AdminPostCard; wide?: boolean }) {
  return (
    <article className={wide ? styles.wideRow : ''}>
      <img src={post.image_url || '/favicon.ico'} alt="" />
      <div>
        <strong>{post.title || post.id}</strong>
        <span>{post.saves_count ?? 0} saves / {post.likes_count ?? 0} likes / {post.reports_count ?? 0} reports</span>
      </div>
      <small>{formatDate(post.created_at ?? '')}</small>
    </article>
  )
}

function PostSelectRow({ post, selected, onToggle }: { post: AdminPostCard; selected: boolean; onToggle: () => void }) {
  return (
    <article className={selected ? styles.selectedContentRow : ''}>
      <img src={post.image_url || '/favicon.ico'} alt="" />
      <div>
        <strong>{post.title || post.id}</strong>
        <span>@{post.username ?? post.user_id ?? 'user'} / {post.visibility ?? 'private'} / {post.saves_count ?? 0} saves</span>
      </div>
      <button className={selected ? styles.selectedAction : ''} type="button" onClick={onToggle}>
        {selected ? 'Added' : 'Add'}
      </button>
    </article>
  )
}

function UserRow({ user, wide = false }: { user: AdminUserCard; wide?: boolean }) {
  return (
    <article className={wide ? styles.wideRow : ''}>
      <img src={user.avatar_url || '/favicon.ico'} alt="" />
      <div>
        <strong>@{user.username ?? user.id}</strong>
        <span>{user.display_name ?? 'no name'} / {user.pin_count ?? 0} pins / {user.public_folder_count ?? 0} public folders</span>
      </div>
      <small>{formatDate(user.created_at ?? '')}</small>
    </article>
  )
}

function RecommendRow({ item, onEdit, onDelete, onMoveUp, onMoveDown, disableUp, disableDown }: {
  item: RecommendItem
  onEdit: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  disableUp: boolean
  disableDown: boolean
}) {
  return (
    <article className={styles.recommendRow}>
      <img src={item.image_url || '/favicon.ico'} alt="" />
      <div>
        <strong>{item.title}</strong>
        <span>{item.item_type} / priority {item.priority ?? 100} / {item.is_published ? 'published' : 'draft'}</span>
      </div>
      <button type="button" onClick={onMoveUp} disabled={disableUp}><ArrowUp size={16} /></button>
      <button type="button" onClick={onMoveDown} disabled={disableDown}><ArrowDown size={16} /></button>
      <button type="button" onClick={onEdit}>Edit</button>
      <button type="button" onClick={onDelete}><Trash2 size={16} /></button>
    </article>
  )
}

function toRecommendForm(item: RecommendItem) {
  return {
    id: item.id,
    item_type: item.item_type,
    title: item.title,
    description: item.description ?? '',
    image_url: item.image_url ?? '',
    target_url: item.target_url ?? '',
    folder_id: item.folder_id ?? '',
    post_id: item.post_id ?? '',
    community_id: item.community_id ?? '',
    priority: String(item.priority ?? 100),
    is_published: Boolean(item.is_published),
  }
}

function getNextPriority(items: RecommendItem[]) {
  const maxPriority = items.reduce((max, item) => Math.max(max, item.priority ?? 0), 0)
  return maxPriority + 10
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getNestedString(row: JsonRecord, parent: string, child: string) {
  const value = row[parent]
  if (!value || typeof value !== 'object') return ''
  const nested = value as JsonRecord
  const result = nested[child]
  return typeof result === 'string' ? result : ''
}
