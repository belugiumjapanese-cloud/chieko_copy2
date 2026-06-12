'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { auth } from '../lib/firebase'
import { createDropWithImage, createFolder, listDrops, listFolders } from '../lib/dropService'
import { hasNearbyDrop, reverseGeocode } from '../lib/geo'
import { createMemoryId, readPhotoMetadata } from '../lib/photo'
import type { DropDoc, DropFolder, MemoryCandidate } from '../lib/types'
import styles from './chieko.module.css'

type UndropedMemoriesProps = {
  userId?: string
  mapboxToken?: string
  radiusMeters?: number
  onCreated?: (dropId: string) => void
}

function formatMemoryDate(value: Date | null) {
  if (!value) return '日付なし'
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(value)
}

export function UndropedMemories({
  userId,
  mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
  radiusMeters = 50,
  onCreated,
}: UndropedMemoriesProps) {
  const activeUserId = userId ?? auth.currentUser?.uid ?? ''
  const [drops, setDrops] = useState<DropDoc[]>([])
  const [folders, setFolders] = useState<DropFolder[]>([])
  const [memories, setMemories] = useState<MemoryCandidate[]>([])
  const memoriesRef = useRef<MemoryCandidate[]>([])
  const [folderSelections, setFolderSelections] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const loadBaseData = useCallback(async () => {
    if (!activeUserId) return
    const [nextDrops, nextFolders] = await Promise.all([listDrops(activeUserId), listFolders(activeUserId)])
    setDrops(nextDrops)
    setFolders(nextFolders)
  }, [activeUserId])

  useEffect(() => {
    loadBaseData().catch((reason) => setError(reason instanceof Error ? reason.message : 'Drop情報の読み込みに失敗しました'))
  }, [loadBaseData])

  useEffect(() => {
    memoriesRef.current = memories
  }, [memories])

  useEffect(() => {
    return () => {
      memoriesRef.current.forEach((memory) => URL.revokeObjectURL(memory.previewUrl))
    }
  }, [])

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setStatus('写真を確認しています')
    setError('')

    const nextMemories: MemoryCandidate[] = []
    const nextSelections: Record<string, string> = {}

    for (const file of Array.from(files)) {
      const metadata = await readPhotoMetadata(file)
      const id = createMemoryId(file)
      const previewUrl = URL.createObjectURL(file)

      if (!metadata.coordinates) {
        nextMemories.push({
          id,
          file,
          previewUrl,
          coordinates: null,
          placeName: '場所情報なし',
          address: '場所を追加してからDropできます',
          takenAt: metadata.takenAt,
        })
        nextSelections[id] = folders[0]?.id ?? ''
        continue
      }

      if (hasNearbyDrop(metadata.coordinates, drops, radiusMeters)) {
        URL.revokeObjectURL(previewUrl)
        continue
      }

      let placeName = '場所未設定'
      let address = `${metadata.coordinates.lat.toFixed(5)}, ${metadata.coordinates.lng.toFixed(5)}`
      try {
        const place = await reverseGeocode(metadata.coordinates, mapboxToken)
        placeName = place.placeName
        address = place.address
      } catch {
        // Keep the coordinate fallback when Mapbox is unavailable.
      }

      nextMemories.push({
        id,
        file,
        previewUrl,
        coordinates: metadata.coordinates,
        placeName,
        address,
        takenAt: metadata.takenAt,
      })
      nextSelections[id] = folders[0]?.id ?? ''
    }

    setMemories((current) => {
      current.forEach((memory) => URL.revokeObjectURL(memory.previewUrl))
      return nextMemories
    })
    setFolderSelections(nextSelections)
    setStatus(nextMemories.length ? '' : '未Dropの写真は見つかりませんでした')
  }

  async function handleDrop(memory: MemoryCandidate) {
    if (!activeUserId) {
      setError('Firebase Authのユーザーが必要です')
      return
    }
    if (!memory.coordinates) {
      setError('場所情報なしの写真は、DropUploaderで場所を追加してください')
      return
    }

    setStatus('Dropしています')
    setError('')

    try {
      let folderId = folderSelections[memory.id]
      if (!folderId) {
        folderId = await createFolder(activeUserId, 'Memories')
        await loadBaseData()
      }

      const dropId = await createDropWithImage(activeUserId, {
        imageFile: memory.file,
        coordinates: memory.coordinates,
        placeName: memory.placeName,
        address: memory.address,
        folderId,
        takenAt: memory.takenAt,
        isPublic: true,
      })

      setMemories((current) => current.filter((item) => item.id !== memory.id))
      URL.revokeObjectURL(memory.previewUrl)
      await loadBaseData()
      setStatus('Dropしました')
      onCreated?.(dropId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Dropに失敗しました')
    }
  }

  function handleSkip(memory: MemoryCandidate) {
    setMemories((current) => current.filter((item) => item.id !== memory.id))
    URL.revokeObjectURL(memory.previewUrl)
  }

  return (
    <section className={styles.panel} aria-label="まだDropしていない記憶">
      <div className={styles.stack}>
        <div className={styles.row}>
          <strong>まだDropしていない記憶 · {memories.length}枚</strong>
          <label className={styles.ghostButton} htmlFor="chieko-memory-files">
            写真を選択
          </label>
          <input
            id="chieko-memory-files"
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>

        {status ? <p className={styles.status}>{status}</p> : null}
        {error ? <p className={styles.errorText}>{error}</p> : null}

        <div className={styles.cardList}>
          {memories.map((memory) => {
            const selectedFolderId = folderSelections[memory.id] ?? folders[0]?.id ?? ''
            return (
              <article className={styles.memoryCard} key={memory.id}>
                <img className={styles.thumb} src={memory.previewUrl} alt="未Drop写真" />
                <div className={styles.memoryBody}>
                  <strong>{memory.placeName}</strong>
                  <p className={styles.muted}>
                    {formatMemoryDate(memory.takenAt)} · {memory.address}
                  </p>
                  <div className={styles.buttonRow}>
                    <select
                      className={styles.select}
                      value={selectedFolderId}
                      onChange={(event) =>
                        setFolderSelections((current) => ({ ...current, [memory.id]: event.target.value }))
                      }
                    >
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    <button className={styles.secondaryButton} type="button" onClick={() => handleDrop(memory)}>
                      Dropする
                    </button>
                    <button className={styles.ghostButton} type="button" onClick={() => handleSkip(memory)}>
                      スキップ
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
