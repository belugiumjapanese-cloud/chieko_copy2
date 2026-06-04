'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AdditiveBlending, BackSide, Group, Quaternion, Vector3 } from 'three'
import type { MapPin, UserMapTheme } from '../types/map'
import { latLngToVector3 } from '../utils/latLngToVector3'
import styles from '../styles/profile-planet.module.css'

type ProfilePlanetCanvasProps = {
  theme: UserMapTheme
  pins: MapPin[]
  selectedFolderId?: string | null
  selectedPinId?: MapPin['id'] | null
  onPinSelect?: (pin: MapPin) => void
}

type LandPatch = {
  id: string
  lat: number
  lng: number
  scale: [number, number, number]
}

const PLANET_RADIUS = 2
const SURFACE_OFFSET = 0.018
const PIN_OFFSET = 0.12

const landPatches: LandPatch[] = [
  { id: 'north-memory', lat: 55, lng: -18, scale: [0.58, 0.26, 1] },
  { id: 'europe-arc', lat: 49, lng: 12, scale: [0.7, 0.34, 1] },
  { id: 'tokyo-dot', lat: 35, lng: 139, scale: [0.46, 0.2, 1] },
  { id: 'atlantic-soft', lat: 20, lng: -45, scale: [0.62, 0.3, 1] },
  { id: 'southern-piece', lat: -24, lng: 132, scale: [0.74, 0.3, 1] },
  { id: 'small-island', lat: -8, lng: -10, scale: [0.34, 0.16, 1] },
  { id: 'quiet-edge', lat: 5, lng: 78, scale: [0.5, 0.22, 1] },
]

function createSurfaceTransform(lat: number, lng: number, radius: number) {
  const normal = latLngToVector3(lat, lng, 1).normalize()
  const position = normal.clone().multiplyScalar(radius)
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal)

  return {
    position,
    quaternion,
  }
}

function ProfilePlanetMesh({ theme, pins, selectedFolderId, selectedPinId, onPinSelect }: ProfilePlanetCanvasProps) {
  const planetRef = useRef<Group>(null)
  const landTransforms = useMemo(
    () =>
      landPatches.map((patch) => ({
        ...patch,
        ...createSurfaceTransform(patch.lat, patch.lng, PLANET_RADIUS + SURFACE_OFFSET),
      })),
    [],
  )
  const pinTransforms = useMemo(
    () =>
      pins.map((pin) => ({
        ...pin,
        ...createSurfaceTransform(pin.lat, pin.lng, PLANET_RADIUS + PIN_OFFSET),
      })),
    [pins],
  )

  useFrame((_, delta) => {
    if (!planetRef.current) return
    planetRef.current.rotation.y += delta * 0.22
    planetRef.current.rotation.x = Math.sin(Date.now() * 0.00018) * 0.04
  })

  return (
    <group ref={planetRef} rotation={[0.1, -0.35, 0]}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 96]} />
        <meshStandardMaterial color={theme.oceanColor} roughness={0.74} metalness={0.05} />
      </mesh>

      {landTransforms.map((patch) => (
        <mesh
          key={patch.id}
          position={patch.position}
          quaternion={patch.quaternion}
          raycast={() => null}
          scale={patch.scale}
        >
          <circleGeometry args={[1, 36]} />
          <meshStandardMaterial
            color={theme.landColor}
            roughness={0.86}
            metalness={0.02}
            transparent
            opacity={0.86}
          />
        </mesh>
      ))}

      {pinTransforms.map((pin) => {
        const isSelectedPin = pin.id === selectedPinId
        const isFolderFiltered = Boolean(selectedFolderId)
        const isInSelectedFolder = !selectedFolderId || pin.folderId === selectedFolderId
        const pinOpacity = isInSelectedFolder ? 1 : 0.28
        const pinScale = isSelectedPin ? 1.56 : isFolderFiltered && isInSelectedFolder ? 1.26 : isInSelectedFolder ? 1 : 0.78

        return (
          <group
            key={pin.id}
            position={pin.position}
            onPointerOut={() => {
              document.body.style.cursor = ''
            }}
            onPointerOver={(event) => {
              event.stopPropagation()
              document.body.style.cursor = 'pointer'
            }}
            scale={pinScale}
          >
            <mesh
              onClick={(event) => {
                event.stopPropagation()
                onPinSelect?.(pin)
              }}
              onPointerDown={(event) => {
                event.stopPropagation()
                onPinSelect?.(pin)
              }}
            >
              <sphereGeometry args={[0.14, 16, 16]} />
              <meshBasicMaterial color={theme.pinColor} transparent opacity={0.001} depthWrite={false} />
            </mesh>
            <mesh
              onClick={(event) => {
                event.stopPropagation()
                onPinSelect?.(pin)
              }}
              onPointerDown={(event) => {
                event.stopPropagation()
                onPinSelect?.(pin)
              }}
            >
              <sphereGeometry args={[0.045, 16, 16]} />
              <meshBasicMaterial color={theme.pinColor} transparent opacity={pinOpacity} />
            </mesh>
            <mesh scale={[1.8, 1.8, 1.8]}>
              <sphereGeometry args={[0.036, 16, 16]} />
              <meshBasicMaterial color={theme.pinColor} transparent opacity={isInSelectedFolder ? 0.2 : 0.04} />
            </mesh>
            <Html center distanceFactor={7}>
              <button
                aria-label={`Select ${pin.title}`}
                className={styles.globePinHitTarget}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onPinSelect?.(pin)
                }}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  onPinSelect?.(pin)
                }}
              />
            </Html>
          </group>
        )
      })}

      <mesh raycast={() => null}>
        <sphereGeometry args={[PLANET_RADIUS * 1.08, 96, 96]} />
        <meshBasicMaterial
          color={theme.atmosphereColor}
          side={BackSide}
          transparent
          opacity={0.2}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export function ProfilePlanetCanvas({
  theme,
  pins,
  selectedFolderId,
  selectedPinId,
  onPinSelect,
}: ProfilePlanetCanvasProps) {
  return (
    <div className={styles.planetCanvasShell}>
      <Canvas camera={{ position: [0, 0, 6.1], fov: 42 }} dpr={[1, 2]} className={styles.planetCanvas}>
        <color attach="background" args={[theme.backgroundColor]} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[4, 3, 5]} intensity={1.5} />
        <pointLight position={[-3, -2, 3]} intensity={0.55} color={theme.atmosphereColor} />
        <ProfilePlanetMesh
          theme={theme}
          pins={pins}
          selectedFolderId={selectedFolderId}
          selectedPinId={selectedPinId}
          onPinSelect={onPinSelect}
        />
      </Canvas>
    </div>
  )
}
