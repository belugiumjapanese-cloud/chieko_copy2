export type PinCategory = 'architecture' | 'cafe' | 'music' | 'shops'
export type LibraryCollectionId = 'my-pins' | 'followers' | 'chaos' | 'wish'

export type LibraryPin = {
  id: string
  collection: Exclude<LibraryCollectionId, 'chaos'>
  category: PinCategory
  title: string
  place: string
  imageUrl: string
  lat: number
  lng: number
  by?: string
}

export const LIBRARY_CATEGORIES: Array<{ id: PinCategory; name: string; icon: string }> = [
  { id: 'architecture', name: 'Architecture', icon: 'ARCH' },
  { id: 'cafe', name: 'Cafe', icon: 'CAFE' },
  { id: 'music', name: 'Chaos', icon: 'CAOS' },
  { id: 'shops', name: 'Shops', icon: 'SHOP' },
]

export const LIBRARY_COLLECTIONS: Array<{
  id: LibraryCollectionId
  name: string
  icon: string
  tint: string
  description: string
}> = [
  { id: 'my-pins', name: 'My World', icon: 'WORLD', tint: '#243833', description: '自分がDropした場所' },
  { id: 'followers', name: 'People', icon: 'PEOPLE', tint: '#52615d', description: 'フォロー中の人のDrop' },
  { id: 'chaos', name: 'Mix', icon: 'MIX', tint: '#69736f', description: 'いろいろな記憶を混ぜて見る' },
  { id: 'wish', name: 'Wish', icon: 'WISH', tint: '#5f6f69', description: 'いつかDropしたい場所' },
]

const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1565060169187-2f105f0b8f51?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=400&q=80',
]

function image(index: number) {
  return IMAGE_URLS[index % IMAGE_URLS.length]
}

export const LIBRARY_PINS: LibraryPin[] = [
  // My Pin's
  { id: 'mp-tokyo-tower', collection: 'my-pins', category: 'architecture', title: '東京タワー', place: '港区, 東京', imageUrl: image(0), lat: 35.6586, lng: 139.7454 },
  { id: 'mp-dotonbori-cafe', collection: 'my-pins', category: 'cafe', title: '道頓堀の喫茶店', place: '中央区, 大阪', imageUrl: image(3), lat: 34.6687, lng: 135.5013 },
  { id: 'mp-shimokita-records', collection: 'my-pins', category: 'music', title: '下北のレコード屋', place: '世田谷区, 東京', imageUrl: image(2), lat: 35.6614, lng: 139.6682 },
  { id: 'mp-yanaka-shop', collection: 'my-pins', category: 'shops', title: '谷中の雑貨屋', place: '台東区, 東京', imageUrl: image(1), lat: 35.7272, lng: 139.7672 },
  { id: 'mp-fushimi', collection: 'my-pins', category: 'architecture', title: '伏見稲荷の鳥居', place: '伏見区, 京都', imageUrl: image(1), lat: 34.9671, lng: 135.7727 },
  { id: 'mp-blue-note', collection: 'my-pins', category: 'music', title: 'ジャズの聴ける店', place: '港区, 東京', imageUrl: image(0), lat: 35.6627, lng: 139.7222 },
  // Follower's
  { id: 'fl-seoul-cafe', collection: 'followers', category: 'cafe', title: '聖水洞のカフェ', place: 'ソウル', imageUrl: image(2), lat: 37.5446, lng: 127.0559, by: 'ミナ' },
  { id: 'fl-taipei-shop', collection: 'followers', category: 'shops', title: '迪化街の問屋', place: '台北', imageUrl: image(3), lat: 25.0554, lng: 121.51, by: 'ウェイ' },
  { id: 'fl-paris-opera', collection: 'followers', category: 'architecture', title: 'オペラ座', place: 'パリ', imageUrl: image(0), lat: 48.8719, lng: 2.3316, by: 'Léa' },
  { id: 'fl-london-vinyl', collection: 'followers', category: 'music', title: 'ソーホーのレコード店', place: 'ロンドン', imageUrl: image(1), lat: 51.5136, lng: -0.1365, by: 'Oli' },
  { id: 'fl-bk-coffee', collection: 'followers', category: 'cafe', title: 'ブルックリンの焙煎所', place: 'NY', imageUrl: image(3), lat: 40.7128, lng: -73.9614, by: 'Jake' },
  // Wish
  { id: 'ws-sagrada', collection: 'wish', category: 'architecture', title: 'サグラダ・ファミリア', place: 'バルセロナ', imageUrl: image(0), lat: 41.4036, lng: 2.1744 },
  { id: 'ws-vienna-opera', collection: 'wish', category: 'music', title: 'ウィーン国立歌劇場', place: 'ウィーン', imageUrl: image(2), lat: 48.2029, lng: 16.369 },
  { id: 'ws-melbourne-cafe', collection: 'wish', category: 'cafe', title: 'ラテアートの聖地', place: 'メルボルン', imageUrl: image(1), lat: -37.8136, lng: 144.9631 },
  { id: 'ws-portland-shop', collection: 'wish', category: 'shops', title: '古着の倉庫街', place: 'ポートランド', imageUrl: image(3), lat: 45.5152, lng: -122.6784 },
  { id: 'ws-istanbul-bazaar', collection: 'wish', category: 'shops', title: 'グランドバザール', place: 'イスタンブール', imageUrl: image(2), lat: 41.0106, lng: 28.968 },
]

export function getCollectionPins(collectionId: LibraryCollectionId): LibraryPin[] {
  if (collectionId === 'chaos') {
    // 「カオス」は全コレクションをかき混ぜる(順序はidハッシュで安定)。
    return [...LIBRARY_PINS].sort((a, b) => hashId(a.id) - hashId(b.id))
  }
  return LIBRARY_PINS.filter((pin) => pin.collection === collectionId)
}

function hashId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 9973
  return hash
}

export function countCollectionPins(collectionId: LibraryCollectionId) {
  return getCollectionPins(collectionId).length
}

export function getCollectionThumbnail(collectionId: LibraryCollectionId) {
  return getCollectionPins(collectionId)[0]?.imageUrl ?? null
}
