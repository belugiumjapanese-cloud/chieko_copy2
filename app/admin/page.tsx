'use client'

import {
  AlertTriangle,
  BarChart3,
  Eye,
  Flag,
  Folder,
  Heart,
  LogOut,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './admin.module.css'

type AdminOverview = {
  counts: {
    users: number
    posts: number
    publicPosts: number
    folders: number
    publicFolders: number
    communities: number
    activeUsers24h: number
    estimatedMinutes: number
  }
  reports: Array<Record<string, any>>
  topPosts: Array<Record<string, any>>
  recentUsers: Array<Record<string, any>>
  events: Array<Record<string, any>>
  recommendItems: Array<RecommendItem>
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

const emptyRecommend = {
  id: '',
  item_type: 'event',
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

export default function AdminPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [recommendForm, setRecommendForm] = useState(emptyRecommend)
  const [query, setQuery] = useState('')

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

  const filteredReports = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return overview?.reports ?? []
    return (overview?.reports ?? []).filter((report) => JSON.stringify(report).toLowerCase().includes(text))
  }, [overview?.reports, query])

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
    if (!token) return

    const response = await fetch('/api/admin/recommend', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error || 'Recommendを保存できませんでした。')
      return
    }
    setRecommendForm(emptyRecommend)
    await loadOverview()
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
      setMessage(data.error || 'Recommendを削除できませんでした。')
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
          <p>Recommend編集、通報確認、ユーザー・投稿・滞在シグナルの確認。</p>
        </div>
        <div>
          <button type="button" onClick={() => loadOverview()}><RefreshCcw size={17} /> Refresh</button>
          <button type="button" onClick={() => supabase?.auth.signOut()}><LogOut size={17} /> Sign out</button>
        </div>
      </header>

      {message && <p className={styles.error}>{message}</p>}
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
            <Metric icon={<ShieldCheck />} label="Communities" value={overview.counts.communities} />
            <Metric icon={<Eye />} label="Active 24h" value={overview.counts.activeUsers24h} />
            <Metric icon={<BarChart3 />} label="Stay signal" value={`${overview.counts.estimatedMinutes}m`} caption="heartbeat based" />
          </section>

          <section className={styles.adminGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>CMS</span>
                  <h2>Recommend</h2>
                </div>
                <Sparkles size={22} />
              </div>
              <form className={styles.recommendForm} onSubmit={saveRecommend}>
                <div className={styles.twoColumns}>
                  <label>
                    Type
                    <select value={recommendForm.item_type} onChange={(event) => setRecommendForm({ ...recommendForm, item_type: event.target.value })}>
                      <option value="event">event</option>
                      <option value="folder_pick">folder_pick</option>
                      <option value="official_folder">official_folder</option>
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
                <button type="submit">{recommendForm.id ? 'Update recommend' : 'Create recommend'}</button>
              </form>
              <div className={styles.itemList}>
                {overview.recommendItems.map((item) => (
                  <article key={item.id}>
                    <img src={item.image_url || '/favicon.ico'} alt="" />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.item_type} / priority {item.priority ?? 100} / {item.is_published ? 'published' : 'draft'}</span>
                    </div>
                    <button type="button" onClick={() => setRecommendForm({
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
                    })}>Edit</button>
                    <button type="button" onClick={() => deleteRecommend(item.id)}>Delete</button>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Moderation</span>
                  <h2>Reports</h2>
                </div>
                <Flag size={22} />
              </div>
              <label className={styles.searchField}>
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="通報、ユーザー、投稿を検索" />
              </label>
              <div className={styles.itemList}>
                {filteredReports.map((report) => (
                  <article key={report.id}>
                    <img src={report.posts?.image_url || '/favicon.ico'} alt="" />
                    <div>
                      <strong>{report.posts?.title ?? report.post_id}</strong>
                      <span>@{report.profiles?.username ?? report.user_id} / {report.reason || 'reasonなし'}</span>
                    </div>
                    <small>{formatDate(report.created_at)}</small>
                  </article>
                ))}
                {!filteredReports.length && <p className={styles.empty}>通報はありません。</p>}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Content</span>
                  <h2>Top saved posts</h2>
                </div>
                <Heart size={22} />
              </div>
              <div className={styles.itemList}>
                {overview.topPosts.map((post) => (
                  <article key={post.id}>
                    <img src={post.image_url || '/favicon.ico'} alt="" />
                    <div>
                      <strong>{post.title || post.id}</strong>
                      <span>{post.saves_count ?? 0} saves / {post.likes_count ?? 0} likes / {post.reports_count ?? 0} reports</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span>Users</span>
                  <h2>Recent users</h2>
                </div>
                <Users size={22} />
              </div>
              <div className={styles.itemList}>
                {overview.recentUsers.map((user) => (
                  <article key={user.id}>
                    <img src={user.avatar_url || '/favicon.ico'} alt="" />
                    <div>
                      <strong>@{user.username ?? user.id}</strong>
                      <span>{user.display_name ?? 'no name'} / {user.pin_count ?? 0} pins / {user.public_folder_count ?? 0} public folders</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </>
      )}
    </main>
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

function formatDate(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
