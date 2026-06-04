'use client'

import type { MapFolder, MapPin } from '../types/map'
import styles from '../styles/profile-planet.module.css'
import { ProfilePlanetImage } from './ProfilePlanetImage'

type ProfilePlanetFolderListProps = {
  folders: MapFolder[]
  pins: MapPin[]
  selectedFolder: MapFolder | null
  onFolderSelect: (folder: MapFolder) => void
}

function countPinsInFolder(folder: MapFolder, pins: MapPin[]) {
  if (folder.pinIds.length > 0) return folder.pinIds.length

  return pins.filter((pin) => pin.folderId === folder.id).length
}

export function ProfilePlanetFolderList({
  folders,
  pins,
  selectedFolder,
  onFolderSelect,
}: ProfilePlanetFolderListProps) {
  return (
    <div className={styles.folderListShell}>
      {selectedFolder ? (
        <section className={styles.selectedFolderPanel} aria-live="polite">
          <span>Selected folder</span>
          <h3>{selectedFolder.name}</h3>
          <p>{selectedFolder.description}</p>
          <dl>
            <div>
              <dt>Center</dt>
              <dd>
                {selectedFolder.centerLat.toFixed(4)}, {selectedFolder.centerLng.toFixed(4)}
              </dd>
            </div>
            <div>
              <dt>Zoom</dt>
              <dd>{selectedFolder.zoom}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className={styles.selectedFolderPanel} aria-live="polite">
          <span>Folder filter</span>
          <h3>Choose a folder</h3>
          <p>Select a folder to emphasize matching pins on the globe and fly the Mapbox preview to that area.</p>
        </section>
      )}

      <div className={styles.folderList}>
        {folders.map((folder) => {
          const isSelected = selectedFolder?.id === folder.id
          const pinCount = countPinsInFolder(folder, pins)

          return (
            <button
              aria-pressed={isSelected}
              className={`${styles.folderItem} ${isSelected ? styles.folderItemSelected : ''}`}
              key={folder.id}
              type="button"
              onClick={() => onFolderSelect(folder)}
            >
              <span className={styles.folderCover}>
                <ProfilePlanetImage
                  src={folder.coverImageUrl}
                  alt={folder.coverImageAlt}
                  fallbackLabel={folder.name}
                />
              </span>
              <span className={styles.folderContent}>
                <strong>{folder.name}</strong>
                <span>{folder.description}</span>
                <small>{pinCount} pins</small>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
