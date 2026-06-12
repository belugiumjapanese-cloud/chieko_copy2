'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { DropDoc } from '../lib/types'

type UseOnThisDayOptions = {
  minimumYearsAgo?: number
  today?: Date
}

function toDate(value: DropDoc['takenAt']) {
  if (!value) return null
  if (value instanceof Date) return value
  if (value instanceof Timestamp) return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function yearsBetween(from: Date, to: Date) {
  return to.getFullYear() - from.getFullYear()
}

export function useOnThisDay(userId?: string, options: UseOnThisDayOptions = {}) {
  const activeUserId = userId ?? auth.currentUser?.uid ?? ''
  const minimumYearsAgo = options.minimumYearsAgo ?? 1
  const today = useMemo(() => options.today ?? new Date(), [options.today])
  const [drops, setDrops] = useState<DropDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!activeUserId) return

    setLoading(true)
    setError(null)

    try {
      const snapshot = await getDocs(query(collection(db, 'users', activeUserId, 'drops'), orderBy('takenAt', 'desc')))
      const matchingDrops = snapshot.docs
        .map((dropDoc) => {
          const data = dropDoc.data() as Omit<DropDoc, 'id'>
          return { ...data, id: dropDoc.id }
        })
        .filter((drop) => {
          const takenAt = toDate(drop.takenAt)
          if (!takenAt) return false
          return (
            takenAt.getMonth() === today.getMonth() &&
            takenAt.getDate() === today.getDate() &&
            yearsBetween(takenAt, today) >= minimumYearsAgo
          )
        })

      setDrops(matchingDrops)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'この日のDropを取得できませんでした')
    } finally {
      setLoading(false)
    }
  }, [activeUserId, minimumYearsAgo, today])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    drops,
    loading,
    error,
    hasMemories: drops.length > 0,
    refresh,
  }
}
