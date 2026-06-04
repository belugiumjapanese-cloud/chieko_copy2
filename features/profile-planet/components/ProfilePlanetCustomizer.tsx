'use client'

import type { ChangeEvent } from 'react'
import { mockThemes } from '../data/mockMapData'
import type { UserMapTheme } from '../types/map'
import styles from '../styles/profile-planet.module.css'

type ProfilePlanetCustomizerProps = {
  theme: UserMapTheme
  onThemeChange: (theme: UserMapTheme) => void
  onReset: () => void
}

const themeControls: Array<{ key: keyof UserMapTheme; label: string }> = [
  { key: 'oceanColor', label: 'Ocean' },
  { key: 'landColor', label: 'Land' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'atmosphereColor', label: 'Atmosphere' },
  { key: 'pinColor', label: 'Pin' },
  { key: 'roadColor', label: 'Road' },
  { key: 'buildingColor', label: 'Building' },
  { key: 'labelColor', label: 'Label' },
]

const presetThemes = [
  { key: 'pinkPlanet', label: 'Pink Planet' },
  { key: 'yellowPlanet', label: 'Yellow Planet' },
  { key: 'darkPlanet', label: 'Dark Planet' },
  { key: 'bluePlanet', label: 'Blue Planet' },
  { key: 'greenPlanet', label: 'Green Planet' },
] as const

export function ProfilePlanetCustomizer({ theme, onThemeChange, onReset }: ProfilePlanetCustomizerProps) {
  const updateThemeColor = (key: keyof UserMapTheme) => (event: ChangeEvent<HTMLInputElement>) => {
    onThemeChange({
      ...theme,
      [key]: event.target.value,
    })
  }

  return (
    <div className={styles.customizer}>
      <div className={styles.presetGrid} aria-label="Profile planet preset themes">
        {presetThemes.map((preset) => {
          const presetTheme = mockThemes[preset.key]

          return (
            <button
              className={styles.presetButton}
              key={preset.key}
              type="button"
              onClick={() => onThemeChange({ ...presetTheme })}
            >
              <span
                className={styles.presetSwatch}
                style={{
                  background: `linear-gradient(135deg, ${presetTheme.oceanColor}, ${presetTheme.landColor})`,
                  boxShadow: `0 0 0 2px ${presetTheme.pinColor}`,
                }}
                aria-hidden="true"
              />
              {preset.label}
            </button>
          )
        })}
      </div>

      <div className={styles.colorGrid}>
        {themeControls.map((control) => (
          <label className={styles.colorControl} key={control.key}>
            <span>{control.label}</span>
            <input type="color" value={theme[control.key]} onChange={updateThemeColor(control.key)} />
            <code>{theme[control.key]}</code>
          </label>
        ))}
      </div>

      <button className={styles.resetButton} type="button" onClick={onReset}>
        Reset to default
      </button>
    </div>
  )
}
