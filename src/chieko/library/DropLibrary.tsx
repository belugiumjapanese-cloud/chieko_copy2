'use client'

import { useMemo, useState } from 'react'
import {
  countCollectionPins,
  getCollectionPins,
  LIBRARY_CATEGORIES,
  LIBRARY_COLLECTIONS,
  type LibraryCollectionId,
  type LibraryPin,
  type PinCategory,
} from './libraryData'
import styles from './drop-library.module.css'

type DropLibraryProps = {
  onOpenPin?: (pin: LibraryPin) => void
  onOpenSheet?: (mode: 'folders' | 'memories') => void
}

const CLOSE_MS = 320

export function DropLibrary({ onOpenPin, onOpenSheet }: DropLibraryProps) {
  const [openId, setOpenId] = useState<LibraryCollectionId | null>(null)
  const [closing, setClosing] = useState(false)
  const [activeCategory, setActiveCategory] = useState<PinCategory | 'all'>('all')

  const openCollection = LIBRARY_COLLECTIONS.find((collection) => collection.id === openId) ?? null

  const pins = useMemo(() => (openId ? getCollectionPins(openId) : []), [openId])
  const filteredPins = useMemo(
    () => (activeCategory === 'all' ? pins : pins.filter((pin) => pin.category === activeCategory)),
    [activeCategory, pins],
  )
  const recentPins = useMemo(() => getCollectionPins('my-pins').slice(0, 4), [])

  const openDetail = (id: LibraryCollectionId) => {
    setActiveCategory('all')
    setClosing(false)
    setOpenId(id)
  }

  const closeDetail = () => {
    setClosing(true)
    window.setTimeout(() => {
      setOpenId(null)
      setClosing(false)
    }, CLOSE_MS)
  }

  const categoryIcon = (category: PinCategory) => LIBRARY_CATEGORIES.find((item) => item.id === category)?.icon ?? 'PIN'

  return (
    <section className={styles.library} aria-label="ライブラリ">
      <div className={openId && !closing ? `${styles.home} ${styles.homeBehind}` : styles.home}>
        <h2 className={styles.largeTitle}>Drop Library</h2>
        <p className={styles.subTitle}>保存した場所と、これから行きたい場所</p>

        <div className={styles.collectionList}>
          {LIBRARY_COLLECTIONS.map((collection) => (
            <button
              className={styles.collectionRow}
              key={collection.id}
              type="button"
              onClick={() => openDetail(collection.id)}
            >
              <span className={styles.rowIcon} style={{ background: `${collection.tint}22`, color: collection.tint }} aria-hidden>
                {collection.icon}
              </span>
              <span className={styles.rowBody}>
                <strong>{collection.name}</strong>
                <span>{collection.description}</span>
              </span>
              <span className={styles.rowAside}>
                {countCollectionPins(collection.id)}
                <span className={styles.chevron} aria-hidden>
                  ›
                </span>
              </span>
            </button>
          ))}
        </div>

        {onOpenSheet ? (
          <div className={styles.collectionList}>
            <button className={styles.collectionRow} type="button" onClick={() => onOpenSheet('folders')}>
              <span className={styles.rowIcon} style={{ background: '#2f453e22', color: '#2f453e' }} aria-hidden>
                FLD
              </span>
              <span className={styles.rowBody}>
                <strong>Folders</strong>
                <span>To Visit / Wish / Cafe / Shops</span>
              </span>
              <span className={styles.rowAside}>
                <span className={styles.chevron} aria-hidden>
                  ›
                </span>
              </span>
            </button>
            <button className={styles.collectionRow} type="button" onClick={() => onOpenSheet('memories')}>
              <span className={styles.rowIcon} style={{ background: '#596b7322', color: '#596b73' }} aria-hidden>
                MEM
              </span>
              <span className={styles.rowBody}>
                <strong>Memories</strong>
                <span>まだDropしていない写真を探す</span>
              </span>
              <span className={styles.rowAside}>
                <span className={styles.chevron} aria-hidden>
                  ›
                </span>
              </span>
            </button>
          </div>
        ) : null}

        <h3 className={styles.sectionTitle}>最近のDrop</h3>
        <div className={styles.recentGrid}>
          {recentPins.map((pin) => (
            <button className={styles.recentCard} key={pin.id} type="button" onClick={() => onOpenPin?.(pin)}>
              <img src={pin.imageUrl} alt="" />
              <strong>{pin.title}</strong>
              <span>{pin.place}</span>
            </button>
          ))}
        </div>
      </div>

      {openId && openCollection ? (
        <div className={closing ? `${styles.detail} ${styles.detailClosing}` : styles.detail}>
          <header className={styles.detailHeader}>
            <button className={styles.backBtn} type="button" onClick={closeDetail}>
              <span aria-hidden>‹</span>
              Library
            </button>
          </header>

          <div className={styles.detailScroll}>
            <div className={styles.detailTitleRow}>
              <span className={styles.detailIcon} style={{ color: openCollection.tint }} aria-hidden>
                {openCollection.icon}
              </span>
              <h2 className={styles.detailTitle}>{openCollection.name}</h2>
            </div>
            <p className={styles.detailMeta}>
              {openCollection.description} ・ {filteredPins.length} pins
            </p>

            <div className={styles.categoryRail} aria-label="カテゴリ">
              <button
                className={activeCategory === 'all' ? `${styles.categoryBtn} ${styles.categoryBtnActive}` : styles.categoryBtn}
                type="button"
                onClick={() => setActiveCategory('all')}
              >
                <span className={styles.categoryCircle} aria-hidden>
                  ALL
                </span>
                <span>All</span>
              </button>
              {LIBRARY_CATEGORIES.map((category) => (
                <button
                  className={
                    activeCategory === category.id ? `${styles.categoryBtn} ${styles.categoryBtnActive}` : styles.categoryBtn
                  }
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                >
                  <span className={styles.categoryCircle} aria-hidden>
                    {category.icon}
                  </span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>

            <div className={styles.pinGrid} key={`${openId}-${activeCategory}`}>
              {filteredPins.map((pin, index) => (
                <button
                  className={styles.pinCard}
                  key={pin.id}
                  type="button"
                  style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
                  onClick={() => onOpenPin?.(pin)}
                >
                  <img src={pin.imageUrl} alt="" />
                  <span className={styles.pinCategoryChip} aria-hidden>
                    {categoryIcon(pin.category)}
                  </span>
                  <span className={styles.pinBody}>
                    <strong>{pin.title}</strong>
                    <span>
                      {pin.place}
                      {pin.by ? ` ・ ${pin.by}` : ''}
                    </span>
                  </span>
                </button>
              ))}
              {filteredPins.length === 0 ? <p className={styles.pinEmpty}>このカテゴリのピンはまだありません</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
