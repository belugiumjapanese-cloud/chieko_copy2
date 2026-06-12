'use client'

import { useEffect, useMemo, useState } from 'react'
import { auth } from '../lib/firebase'
import { listDrops, listFolders } from '../lib/dropService'
import type { DropDoc, DropFolder } from '../lib/types'
import styles from '../components/chieko.module.css'

type FolderListProps = {
  userId?: string
  onFolderSelect?: (folderId: string) => void
}

function latestDropForFolder(folder: DropFolder, drops: DropDoc[]) {
  return drops.find((drop) => drop.folderId === folder.id)
}

export function FolderList({ userId, onFolderSelect }: FolderListProps) {
  const activeUserId = userId ?? auth.currentUser?.uid ?? ''
  const [folders, setFolders] = useState<DropFolder[]>([])
  const [drops, setDrops] = useState<DropDoc[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeUserId) return

    let ignore = false
    Promise.all([listFolders(activeUserId), listDrops(activeUserId)])
      .then(([nextFolders, nextDrops]) => {
        if (ignore) return
        setFolders(nextFolders)
        setDrops(nextDrops)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'フォルダ一覧を読み込めませんでした'))

    return () => {
      ignore = true
    }
  }, [activeUserId])

  const cards = useMemo(
    () =>
      folders.map((folder) => ({
        folder,
        latestDrop: latestDropForFolder(folder, drops),
        dropCount: drops.filter((drop) => drop.folderId === folder.id).length || folder.dropCount,
      })),
    [drops, folders],
  )

  return (
    <section className={styles.panel} aria-label="フォルダ一覧">
      <div className={styles.stack}>
        <div className={styles.row}>
          <strong>Folders</strong>
          <span className={styles.muted}>{cards.length} folders</span>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}

        <div className={styles.folderGrid}>
          {cards.map(({ folder, latestDrop, dropCount }) => (
            <button className={styles.folderCard} key={folder.id} type="button" onClick={() => onFolderSelect?.(folder.id)}>
              {latestDrop?.imageUrl ? (
                <img className={styles.folderThumb} src={latestDrop.imageUrl} alt={folder.name} />
              ) : (
                <div className={styles.folderEmpty}>No drops</div>
              )}
              <span className={styles.folderMeta}>
                <strong>{folder.name}</strong>
                <span className={styles.muted}>{dropCount} Drops</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
