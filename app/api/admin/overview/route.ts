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
    postLikes,
    postComments,
    savedPosts,
    folderLikes,
    reports,
    topPosts,
    recentFolders,
    recentCommunities,
    recentUsers,
    events,
    recommendItems,
    communityHierarchy,
  ] = await Promise.all([
    safeQuery(client.from('profiles').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('posts').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('posts').select('id', { count: 'exact', head: true }).eq('visibility', 'public')),
    safeQuery(client.from('folders').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('folders').select('id', { count: 'exact', head: true }).eq('visibility', 'public')),
    safeQuery(client.from('communities').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('post_likes').select('post_id', { count: 'exact', head: true })),
    safeQuery(client.from('post_comments').select('id', { count: 'exact', head: true })),
    safeQuery(client.from('saved_posts').select('post_id', { count: 'exact', head: true })),
    safeQuery(client.from('folder_likes').select('folder_id', { count: 'exact', head: true })),
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
        .from('app_folder_cards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ),
    safeQuery(
      client
        .from('app_community_cards')
        .select('*')
        .order('created_at', { ascending: false })
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
    safeQuery(
      client
        .from('admin_community_hierarchy')
        .select('*')
        .order('community_name', { ascending: true })
        .order('contribution_level', { ascending: false })
        .limit(500),
    ),
  ])

  const eventRows = Array.isArray(events.data) ? events.data as Array<{ user_id: string; event_type: string }> : []
  const activeUsers24h = new Set(eventRows.map((event) => event.user_id)).size
  const heartbeatCount = eventRows.filter((event) => event.event_type === 'session_heartbeat').length
  const estimatedMinutes = heartbeatCount
  const eventStats = Array.from(
    eventRows.reduce((counts, event) => counts.set(event.event_type, (counts.get(event.event_type) ?? 0) + 1), new Map<string, number>()),
  )
    .map(([event_type, count]) => ({ event_type, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    counts: {
      users: users.count ?? 0,
      posts: posts.count ?? 0,
      publicPosts: publicPosts.count ?? 0,
      folders: folders.count ?? 0,
      publicFolders: publicFolders.count ?? 0,
      communities: communities.count ?? 0,
      likes: postLikes.count ?? 0,
      comments: postComments.count ?? 0,
      saves: savedPosts.count ?? 0,
      folderLikes: folderLikes.count ?? 0,
      activeUsers24h,
      estimatedMinutes,
    },
    reports: reports.data ?? [],
    topPosts: topPosts.data ?? [],
    recentFolders: recentFolders.data ?? [],
    recentCommunities: recentCommunities.data ?? [],
    recentUsers: recentUsers.data ?? [],
    communityHierarchy: communityHierarchy.data ?? [],
    events: eventRows,
    eventStats,
    recommendItems: recommendItems.data ?? [],
    warnings: [
      users,
      posts,
      publicPosts,
      folders,
      publicFolders,
      communities,
      postLikes,
      postComments,
      savedPosts,
      folderLikes,
      reports,
      topPosts,
      recentFolders,
      recentCommunities,
      recentUsers,
      events,
      recommendItems,
      communityHierarchy,
    ]
      .filter((item) => item.error)
      .map((item) => item.error),
  })
}
