export type GlobeFriend = {
  id: string
  name: string
  emoji: string
  lat: number
  lng: number
  place: string
  status: string
  lastActiveMinutes: number
}

export const DEMO_ME: GlobeFriend = {
  id: 'me',
  name: '自分',
  emoji: '😎',
  lat: 35.659,
  lng: 139.7,
  place: '渋谷',
  status: '📍 ここにいるよ',
  lastActiveMinutes: 0,
}

export const DEMO_FRIENDS: GlobeFriend[] = [
  { id: 'yui', name: 'ゆい', emoji: '🦊', lat: 35.6812, lng: 139.7671, place: '東京駅', status: '🍜 ラーメン待ち', lastActiveMinutes: 4 },
  { id: 'ren', name: 'れん', emoji: '🐼', lat: 34.6937, lng: 135.5023, place: '大阪', status: '🎤 カラオケ中', lastActiveMinutes: 18 },
  { id: 'mina', name: 'ミナ', emoji: '🐰', lat: 37.5665, lng: 126.978, place: 'ソウル', status: '☕ カフェ巡り', lastActiveMinutes: 41 },
  { id: 'wei', name: 'ウェイ', emoji: '🐯', lat: 25.033, lng: 121.5654, place: '台北', status: '🌃 夜市なう', lastActiveMinutes: 73 },
  { id: 'jake', name: 'Jake', emoji: '🐻', lat: 40.7306, lng: -73.9866, place: 'NY', status: '🏀 公園でバスケ', lastActiveMinutes: 130 },
  { id: 'lea', name: 'Léa', emoji: '🐱', lat: 48.8566, lng: 2.3522, place: 'パリ', status: '🥐 朝ごはん', lastActiveMinutes: 220 },
  { id: 'oli', name: 'Oli', emoji: '🦉', lat: 51.5072, lng: -0.1276, place: 'ロンドン', status: '🎧 散歩中', lastActiveMinutes: 360 },
  { id: 'maya', name: 'Maya', emoji: '🐨', lat: -33.8688, lng: 151.2093, place: 'シドニー', status: '🏖️ ビーチ', lastActiveMinutes: 540 },
]

export function formatLastActive(minutes: number) {
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}

export function createAvatarBadge(emoji: string, options: { size?: number; ring?: string } = {}) {
  const size = options.size ?? 128
  const ring = options.ring ?? '#ffffff'
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const center = size / 2
  const radius = size * 0.42

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = size * 0.06
  ctx.shadowOffsetY = size * 0.03
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#f3f5f9'
  ctx.beginPath()
  ctx.arc(center, center, radius - size * 0.045, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = `${Math.round(size * 0.42)}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, center, center + size * 0.02)

  return canvas
}
