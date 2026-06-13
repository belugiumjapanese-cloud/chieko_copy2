'use client'

import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { auth, hasFirebaseConfig } from '../lib/firebase'
import { createDropWithImage, createFolder, listFolders } from '../lib/dropService'
import { readPhotoMetadata } from '../lib/photo'
import { reverseGeocode } from '../lib/geo'
import type { Coordinates, DropFolder } from '../lib/types'
import styles from './chieko.module.css'

type DropUploaderProps = {
  userId?: string
  mapboxToken?: string
  onCreated?: (dropId: string) => void
}

type LocationState = Coordinates & {
  placeName: string
  address: string
}

const DEFAULT_CENTER: [number, number] = [4.3517, 50.8503]

function createManualDropMarker() {
  const element = document.createElement('span')
  element.className = styles.manualDropMarker

  const drop = document.createElement('span')
  drop.className = styles.manualDropMarkerDrop
  element.append(drop)

  return element
}

function ManualLocationPicker({
  value,
  mapboxToken,
  onChange,
}: {
  value: Coordinates | null
  mapboxToken: string
  onChange: (coordinates: Coordinates) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || !mapboxToken) return

    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: value ? [value.lng, value.lat] : DEFAULT_CENTER,
      zoom: value ? 14 : 11,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('click', (event) => {
      onChange({ lat: event.lngLat.lat, lng: event.lngLat.lng })
    })
    mapRef.current = map

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [mapboxToken, onChange])

  useEffect(() => {
    if (!mapRef.current || !value) return

    markerRef.current?.remove()
    markerRef.current = new mapboxgl.Marker({ element: createManualDropMarker(), anchor: 'bottom' })
      .setLngLat([value.lng, value.lat])
      .addTo(mapRef.current)
    mapRef.current.easeTo({ center: [value.lng, value.lat], zoom: 14 })
  }, [value])

  if (!mapboxToken) {
    return <div className={styles.emptyMap}>Mapbox tokenを設定すると地図で場所指定できます。</div>
  }

  return <div ref={containerRef} className={styles.mapPicker} aria-label="場所指定マップ" />
}

export function DropUploader({ userId, mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '', onCreated }: DropUploaderProps) {
  const activeUserId = userId ?? auth.currentUser?.uid ?? ''
  const [folders, setFolders] = useState<DropFolder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('__new__')
  const [newFolderName, setNewFolderName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [location, setLocation] = useState<LocationState | null>(null)
  const [needsManualLocation, setNeedsManualLocation] = useState(false)
  const [caption, setCaption] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [takenAt, setTakenAt] = useState<Date | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!activeUserId) return

    let ignore = false
    listFolders(activeUserId)
      .then((items) => {
        if (ignore) return
        setFolders(items)
        setSelectedFolderId((current) => (current && current !== '__new__' ? current : items[0]?.id || '__new__'))
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'フォルダの読み込みに失敗しました'))

    return () => {
      ignore = true
    }
  }, [activeUserId])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const applyCoordinates = useCallback(
    async (coordinates: Coordinates) => {
      setStatus('場所を確認しています')
      try {
        const place = await reverseGeocode(coordinates, mapboxToken)
        setLocation({ ...coordinates, ...place })
      } catch {
        setLocation({
          ...coordinates,
          placeName: '場所未設定',
          address: `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
        })
      } finally {
        setStatus('')
      }
    },
    [mapboxToken],
  )

  async function handleFileChange(nextFile: File | null) {
    setError('')
    setStatus('')
    setFile(nextFile)
    setLocation(null)
    setNeedsManualLocation(false)
    setTakenAt(null)

    if (!nextFile) return

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(nextFile)
    })
    setStatus('写真のEXIFを読んでいます')

    try {
      const metadata = await readPhotoMetadata(nextFile)
      setTakenAt(metadata.takenAt)

      if (metadata.coordinates) {
        await applyCoordinates(metadata.coordinates)
      } else {
        setNeedsManualLocation(true)
        setStatus('場所情報なし。地図で場所を指定してください')
      }
    } catch (reason) {
      setNeedsManualLocation(true)
      setError(reason instanceof Error ? reason.message : 'EXIFの読み取りに失敗しました')
    }
  }

  async function handleSubmit() {
    if (!activeUserId) {
      setError('Firebase Authのユーザーが必要です')
      return
    }
    if (!hasFirebaseConfig()) {
      setError('Firebaseの環境変数が未設定です')
      return
    }
    if (!file || !location) {
      setError('写真と場所を設定してください')
      return
    }

    setIsSubmitting(true)
    setError('')
    setStatus('Dropを保存しています')

    try {
      const folderId =
        selectedFolderId === '__new__'
          ? await createFolder(activeUserId, newFolderName.trim() || 'New Folder')
          : selectedFolderId

      const dropId = await createDropWithImage(activeUserId, {
        imageFile: file,
        coordinates: location,
        placeName: location.placeName,
        address: location.address,
        folderId,
        caption,
        takenAt,
        isPublic,
      })

      setStatus('Dropを保存しました')
      setFile(null)
      setPreviewUrl('')
      setLocation(null)
      setNeedsManualLocation(false)
      setCaption('')
      setNewFolderName('')
      setSelectedFolderId(folderId)
      onCreated?.(dropId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Dropの保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = Boolean(file && location && selectedFolderId && activeUserId && !isSubmitting)

  return (
    <section className={styles.panel} aria-label="Drop投稿">
      <div className={styles.stack}>
        <div className={styles.fileBox}>
          <label className={styles.label} htmlFor="chieko-drop-photo">
            写真
          </label>
          <input
            id="chieko-drop-photo"
            className={styles.input}
            type="file"
            accept="image/*"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
        </div>

        {previewUrl ? (
          <div className={styles.preview}>
            <img className={styles.previewImage} src={previewUrl} alt="選択した写真" />
            <div className={styles.stack}>
              <p className={styles.status}>{location?.placeName ?? '場所を確認中'}</p>
              <p className={styles.muted}>{location?.address ?? 'EXIFまたは地図から場所を設定します'}</p>
              {takenAt ? <p className={styles.muted}>{takenAt.toLocaleDateString('ja-JP')}</p> : null}
            </div>
          </div>
        ) : null}

        {needsManualLocation ? (
          <div className={styles.stack}>
            <p className={styles.warning}>場所情報なし。地図をタップしてピンを置いてください。</p>
            <ManualLocationPicker value={location} mapboxToken={mapboxToken} onChange={applyCoordinates} />
          </div>
        ) : null}

        <div className={styles.folderInline}>
          <label className={styles.field}>
            <span className={styles.label}>フォルダ</span>
            <select className={styles.select} value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
              <option value="__new__">+ 新しいフォルダ</option>
            </select>
          </label>

          {selectedFolderId === '__new__' ? (
            <label className={styles.field}>
              <span className={styles.label}>新しいフォルダ名</span>
              <input className={styles.input} value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} />
            </label>
          ) : null}
        </div>

        <label className={styles.field}>
          <span className={styles.label}>キャプション</span>
          <textarea className={styles.textarea} value={caption} onChange={(event) => setCaption(event.target.value)} />
        </label>

        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          公開する
        </label>

        {status ? <p className={styles.status}>{status}</p> : null}
        {error ? <p className={styles.errorText}>{error}</p> : null}

        <button className={styles.button} type="button" onClick={handleSubmit} disabled={!canSubmit}>
          Drop
        </button>
      </div>
    </section>
  )
}
