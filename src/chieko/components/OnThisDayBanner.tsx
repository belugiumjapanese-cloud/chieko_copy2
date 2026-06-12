'use client'

import { useOnThisDay } from '../hooks/useOnThisDay'
import type { DropDoc } from '../lib/types'
import styles from './chieko.module.css'

type OnThisDayBannerProps = {
  userId?: string
  onDrop?: (drop: DropDoc) => void
}

function toDate(value: DropDoc['takenAt']) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && 'toDate' in value) return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function yearsAgo(drop: DropDoc) {
  const takenAt = toDate(drop.takenAt)
  if (!takenAt) return 1
  return Math.max(1, new Date().getFullYear() - takenAt.getFullYear())
}

export function OnThisDayBanner({ userId, onDrop }: OnThisDayBannerProps) {
  const { drops, hasMemories } = useOnThisDay(userId)
  const firstDrop = drops[0]

  if (!hasMemories || !firstDrop) return null

  return (
    <aside className={styles.banner} aria-label="この日の思い出">
      <div>
        <p className={styles.bannerTitle}>{yearsAgo(firstDrop)}年前の今日</p>
        <p className={styles.muted}>{firstDrop.placeName || 'どこか'}にいたみたいです。Dropしませんか？</p>
      </div>
      {onDrop ? (
        <div className={styles.bannerActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => onDrop(firstDrop)}>
            開く
          </button>
        </div>
      ) : null}
    </aside>
  )
}
