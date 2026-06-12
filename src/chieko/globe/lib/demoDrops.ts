import type { DropDoc, DropFolder } from '../../lib/types'

const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1565060169187-2f105f0b8f51?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=240&q=80',
  'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=240&q=80',
]

function image(index: number) {
  return IMAGE_URLS[index % IMAGE_URLS.length]
}

export const DEMO_FOLDERS: DropFolder[] = [
  { id: 'travel', name: '旅行', dropCount: 6, latestImageUrl: image(0) },
  { id: 'cafe', name: 'カフェ', dropCount: 2, latestImageUrl: image(3) },
  { id: 'street', name: '街角', dropCount: 2, latestImageUrl: image(2) },
]

export const DEMO_DROPS: DropDoc[] = [
  { id: 'demo-tokyo', imageUrl: image(0), lat: 35.6586, lng: 139.7454, placeName: '東京タワー', address: '芝公園, 港区, 東京, 日本', folderId: 'travel', caption: '夜のライトアップ🗼', takenAt: '2026-04-18T19:20:00+09:00', createdAt: '2026-04-18T21:00:00+09:00', isPublic: true },
  { id: 'demo-shibuya', imageUrl: image(2), lat: 35.6595, lng: 139.7005, placeName: '渋谷スクランブル', address: '渋谷, 東京, 日本', folderId: 'street', caption: '人の波', takenAt: '2026-05-02T17:40:00+09:00', createdAt: '2026-05-02T18:00:00+09:00', isPublic: true },
  { id: 'demo-kyoto', imageUrl: image(1), lat: 34.9671, lng: 135.7727, placeName: '伏見稲荷', address: '伏見区, 京都, 日本', folderId: 'travel', caption: '千本鳥居⛩️', takenAt: '2026-03-21T09:10:00+09:00', createdAt: '2026-03-21T12:00:00+09:00', isPublic: true },
  { id: 'demo-osaka', imageUrl: image(3), lat: 34.6687, lng: 135.5013, placeName: '道頓堀のカフェ', address: '中央区, 大阪, 日本', folderId: 'cafe', caption: 'モーニング☕', takenAt: '2026-03-22T08:30:00+09:00', createdAt: '2026-03-22T10:00:00+09:00', isPublic: true },
  { id: 'demo-seoul', imageUrl: image(2), lat: 37.5512, lng: 126.9882, placeName: 'Nソウルタワー', address: '龍山区, ソウル, 韓国', folderId: 'travel', caption: '夕暮れの展望台', takenAt: '2025-11-08T17:50:00+09:00', createdAt: '2025-11-08T20:00:00+09:00', isPublic: true },
  { id: 'demo-taipei', imageUrl: image(1), lat: 25.0276, lng: 121.5318, placeName: '永康街', address: '大安区, 台北, 台湾', folderId: 'street', caption: '小籠包のあと散歩', takenAt: '2025-09-14T13:20:00+08:00', createdAt: '2025-09-14T15:00:00+08:00', isPublic: true },
  { id: 'demo-paris', imageUrl: image(0), lat: 48.8606, lng: 2.3376, placeName: 'ルーヴル美術館', address: '1区, パリ, フランス', folderId: 'travel', caption: 'ガラスのピラミッド', takenAt: '2025-06-30T11:00:00+02:00', createdAt: '2025-06-30T13:00:00+02:00', isPublic: true },
  { id: 'demo-london', imageUrl: image(3), lat: 51.5101, lng: -0.1344, placeName: 'ソーホーのカフェ', address: 'Soho, London, UK', folderId: 'cafe', caption: 'フラットホワイト', takenAt: '2025-07-03T09:40:00+01:00', createdAt: '2025-07-03T11:00:00+01:00', isPublic: true },
  { id: 'demo-nyc', imageUrl: image(2), lat: 40.7061, lng: -73.9969, placeName: 'ブルックリンブリッジ', address: 'Brooklyn, New York, USA', folderId: 'travel', caption: '朝ラン🏃', takenAt: '2025-05-17T07:15:00-04:00', createdAt: '2025-05-17T09:00:00-04:00', isPublic: true },
  { id: 'demo-sydney', imageUrl: image(1), lat: -33.8568, lng: 151.2153, placeName: 'オペラハウス', address: 'Sydney, NSW, Australia', folderId: 'travel', caption: '帆のかたち', takenAt: '2025-01-12T16:05:00+11:00', createdAt: '2025-01-12T18:00:00+11:00', isPublic: true },
]
