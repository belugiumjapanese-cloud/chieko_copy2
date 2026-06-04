'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { demoProfilePlanet } from '../data/demoProfilePlanet'
import { mockFolders, mockPins, mockThemes } from '../data/mockMapData'
import { formatProfilePlanetStats } from '../utils/formatProfilePlanet'
import { loadProfilePlanetTheme, saveProfilePlanetTheme } from '../utils/themeStorage'
import type { MapFolder, MapPin, UserMapTheme } from '../types/map'
import styles from '../styles/profile-planet.module.css'
import { ProfilePlanetCanvas } from './ProfilePlanetCanvas'
import { ProfilePlanetImage } from './ProfilePlanetImage'
import { ProfilePlanetCustomizer } from './ProfilePlanetCustomizer'
import { ProfilePlanetPinCard } from './ProfilePlanetPinCard'
import { ProfilePlanetFolderList } from './ProfilePlanetFolderList'
import { ProfilePlanetMapboxPreview } from './ProfilePlanetMapboxPreview'

const defaultTheme = mockThemes.darkPlanet

export function ProfilePlanetDemo() {
  const [activeTheme, setActiveTheme] = useState<UserMapTheme>({ ...defaultTheme })
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<MapFolder | null>(null)
  const [mapTransition, setMapTransition] = useState<{ id: number; message: string } | null>(null)
  const [hasLoadedStoredTheme, setHasLoadedStoredTheme] = useState(false)
  const previewPins = mockPins.slice(0, 4)
  const showMapTransition = (message: string) => {
    setMapTransition({ id: Date.now(), message })
  }
  const handlePinSelect = (pin: MapPin) => {
    setSelectedPin(pin)
    setSelectedFolder(null)
    showMapTransition('Flying to selected place...')
  }
  const handleFolderSelect = (folder: MapFolder) => {
    setSelectedFolder(folder)
    setSelectedPin(null)
    showMapTransition(`Opening ${folder.name} map...`)
  }
  const handleThemeReset = () => {
    const nextTheme = { ...defaultTheme }

    setActiveTheme(nextTheme)
    saveProfilePlanetTheme(nextTheme)
  }
  const themeStyle = useMemo(
    () =>
      ({
        '--planet-ocean-color': activeTheme.oceanColor,
        '--planet-land-color': activeTheme.landColor,
        '--planet-background-color': activeTheme.backgroundColor,
        '--planet-atmosphere-color': activeTheme.atmosphereColor,
        '--planet-pin-color': activeTheme.pinColor,
        '--planet-road-color': activeTheme.roadColor,
        '--planet-building-color': activeTheme.buildingColor,
        '--planet-label-color': activeTheme.labelColor,
      }) as CSSProperties,
    [activeTheme],
  )

  useEffect(() => {
    setActiveTheme(loadProfilePlanetTheme(defaultTheme))
    setHasLoadedStoredTheme(true)
  }, [])

  useEffect(() => {
    if (!hasLoadedStoredTheme) return

    saveProfilePlanetTheme(activeTheme)
  }, [activeTheme, hasLoadedStoredTheme])

  useEffect(() => {
    if (!mapTransition) return

    const timeout = window.setTimeout(() => {
      setMapTransition((currentTransition) => {
        if (currentTransition?.id !== mapTransition.id) return currentTransition

        return null
      })
    }, 1100)

    return () => window.clearTimeout(timeout)
  }, [mapTransition])

  return (
    <main className={styles.shell} style={themeStyle}>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Experiment</p>
          <h1 className={styles.title}>{demoProfilePlanet.title}</h1>
          <p className={styles.subtitle}>{demoProfilePlanet.subtitle}</p>
          <section className={styles.stats} aria-label={formatProfilePlanetStats(demoProfilePlanet.stats)}>
            {demoProfilePlanet.stats.map((stat) => (
              <div className={styles.stat} key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </section>
        </header>

        <section className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>3D profile planet</h2>
              <span>{mockPins.length} memory pins</span>
            </div>
            <div className={styles.planetPlaceholder}>
              <ProfilePlanetCanvas
                theme={activeTheme}
                pins={mockPins}
                selectedFolderId={selectedFolder?.id}
                selectedPinId={selectedPin?.id}
                onPinSelect={handlePinSelect}
              />
            </div>
            <ProfilePlanetPinCard selectedPin={selectedPin} folders={mockFolders} />
          </article>

          <div className={styles.sideColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Customization controls</h2>
                <span>Live theme</span>
              </div>
              <ProfilePlanetCustomizer
                theme={activeTheme}
                onThemeChange={setActiveTheme}
                onReset={handleThemeReset}
              />
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Folders</h2>
                <span>Mock folder filter</span>
              </div>
              <ProfilePlanetFolderList
                folders={mockFolders}
                pins={mockPins}
                selectedFolder={selectedFolder}
                onFolderSelect={handleFolderSelect}
              />
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Mapbox preview</h2>
                <span>Mock pins only</span>
              </div>
              <ProfilePlanetMapboxPreview
                pins={mockPins}
                selectedPin={selectedPin}
                selectedFolder={selectedFolder}
                theme={activeTheme}
                transitionMessage={mapTransition?.message ?? null}
                onPinSelect={handlePinSelect}
              />
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Mock pins</h2>
                <span>Local data only</span>
              </div>
              <div className={styles.mockList}>
                {previewPins.map((pin) => (
                  <div className={styles.mockPin} key={pin.id}>
                    <div className={styles.mockThumb}>
                      <ProfilePlanetImage src={pin.imageUrl} alt={pin.imageAlt} fallbackLabel={pin.title} />
                    </div>
                    <div>
                      <strong>{pin.title}</strong>
                      <span>{pin.tags.map((tag) => `#${tag}`).join(' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
