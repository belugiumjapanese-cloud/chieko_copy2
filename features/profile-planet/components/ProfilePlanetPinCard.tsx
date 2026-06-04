'use client'

import type { MapFolder, MapPin } from '../types/map'
import styles from '../styles/profile-planet.module.css'
import { ProfilePlanetImage } from './ProfilePlanetImage'

type ProfilePlanetPinCardProps = {
  selectedPin: MapPin | null
  folders: MapFolder[]
}

export function ProfilePlanetPinCard({ selectedPin, folders }: ProfilePlanetPinCardProps) {
  if (!selectedPin) {
    return (
      <section className={styles.pinCardEmpty} aria-live="polite">
        <span>Personal planet</span>
        <strong>Select a pin on your planet.</strong>
        <p>Your saved memory will appear here with its photo, folder, tags, and coordinates.</p>
      </section>
    )
  }

  const folder = folders.find((item) => item.id === selectedPin.folderId)

  return (
    <section className={styles.pinCard} aria-live="polite">
      <div className={styles.pinCardImage}>
        <ProfilePlanetImage
          src={selectedPin.imageUrl}
          alt={selectedPin.imageAlt}
          fallbackLabel={selectedPin.title}
        />
      </div>
      <div className={styles.pinCardContent}>
        <div className={styles.pinCardKicker}>
          <span>Selected memory</span>
          {folder ? <strong>{folder.name}</strong> : <strong>Unsorted</strong>}
        </div>
        <h3>{selectedPin.title}</h3>
        <p>{selectedPin.description}</p>
        <div className={styles.pinCardTags}>
          {selectedPin.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <dl className={styles.pinCardMeta}>
          <div>
            <dt>Latitude</dt>
            <dd>{selectedPin.lat.toFixed(4)}</dd>
          </div>
          <div>
            <dt>Longitude</dt>
            <dd>{selectedPin.lng.toFixed(4)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
