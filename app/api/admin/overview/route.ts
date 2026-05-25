import { NextRequest, NextResponse } from 'next/server'
import { isResponse, requireAdmin, safeQuery } from '../_utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const context = await requireAdmin(request)
  if (isResponse(context)) return context

  const { client } = context
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    users,
    posts,
    publicPosts,
    folders,
    publicFolders,
    communities,
    reports,
    topPosts,
    recentUsers,
    events,
    recommendItems,
  ] = await Promise.all([
    safeQuery(client.from('profiles').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('posts').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('posts').select('id', { count: 'exact', head: true }).eq('visibility', 'public')),
    safeQuery(client.from('folders').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('folders').select('id', { count: 'exact', head: true }).eq('visibility', 'public')),
    safeQuery(client.from('communities').select('id', { count: 'exact', head: true })),
    safeQuery(
      client
        .from('post_reports')
        .select('id,post_id,user_id,reason,created_at,posts(id,title,image_url,user_id),profiles(id,username,display_name,avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50),
    ),
    safeQuery(
      client
        .from('posts')
        .select('id,title,image_url,likes_count,comments_count,saves_count,reports_count,created_at,user_id')
        .order('saves_count', { ascending: false })
        .order('likes_count', { ascending: false })
        .limit(20),
    ),
    safeQuery(
      client
        .from('profiles')
        .select('id,username,display_name,avatar_url,pin_count,public_folder_count,created_at')
        .order('created_at', { ascending: false })
        .limit(30),
    ),
    safeQuery(
      client
        .from('app_events')
        .select('id,user_id,event_type,metadata,created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000),
    ),
    safeQuery(
      client
        .from('recommend_items')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(100),
    ),
  ])

  const eventRows = Array.isArray(events.data) ? events.data as Array<{ user_id: string; event_type: string }> : []
  const activeUsers24h = new Set(eventRows.map((event) => event.user_id)).size
  const heartbeatCount = eventRows.filter((event) => event.event_type === 'session_heartbeat').length
  const estimatedMinutes = heartbeatCount

  return NextResponse.json({
    counts: {
      users: users.count ?? 0,
      posts: posts.count ?? 0,
      publicPosts: publicPosts.count ?? 0,
      folders: folders.count ?? 0,
      publicFolders: publicFolders.count ?? 0,
      communities: communities.count ?? 0,
      activeUsers24h,
      estimatedMinutes,
    },
    reports: reports.data ?? [],
    topPosts: topPosts.data ?? [],
    recentUsers: recentUsers.data ?? [],
    events: eventRows,
    recommendItems: recommendItems.data ?? [],
    warnings: [users, posts, publicPosts, folders, publicFolders, communities, reports, topPosts, recentUsers, events, recommendItems]
      .filter((item) => item.error)
      .map((item) => item.error),
  })
}
