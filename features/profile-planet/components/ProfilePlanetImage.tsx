'use client'

import { useState } from 'react'
import styles from '../styles/profile-planet.module.css'

type ProfilePlanetImageProps = {
  src: string
  alt: string
  fallbackLabel: string
}

export function ProfilePlanetImage({ src, alt, fallbackLabel }: ProfilePlanetImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={styles.imageFallback} role="img" aria-label={alt}>
        <span>{fallbackLabel}</span>
      </div>
    )
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} />
}
