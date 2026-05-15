'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { CATEGORIES, Category, MapPin, PinTag, TAGS } from '../../lib/types'
import { createId, loadAppState, saveAppState } from '../../lib/storage'
import { INITIAL_STATE } from '../../lib/constants'
import { saveRemoteOfficialPin } from '../../lib/remote-store'

type AdminForm = {
  name: string
  comment: string
  longitude: string
  latitude: string
  categories: Category[]
  tags: PinTag[]
}

const createAdminForm = (): AdminForm => ({
  name: '',
  comment: '',
  longitude: '139.7',
  latitude: '35.6',
  categories: [],
  tags: [],
})

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export default function AdminPage() {
  const [form, setForm] = useState<AdminForm>(() => createAdminForm())
  const [officialPins, setOfficialPins] = useState<MapPin[]>(INITIAL_STATE.officialPins)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setOfficialPins(loadAppState().officialPins)
  }, [])

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const longitude = Number(form.longitude)
      const latitude = Number(form.latitude)

      if (!form.name.trim()) {
        setMessage('場所の名前を入力してください。')
        return
      }

      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        setMessage('緯度経度を数値で入力してください。')
        return
      }

      if (form.categories.length === 0) {
        setMessage('カテゴリーを最低1つ選んでください。')
        return
      }

      const nextPin: MapPin = {
        id: createId('official'),
        ownerId: 'official',
        kind: 'official',
        visibility: 'public',
        name: form.name.trim(),
        comment: form.comment.trim() || undefined,
        longitude,
        latitude,
        categories: form.categories,
        tags: form.tags,
        ownerName: '運営',
        createdAt: new Date().toISOString(),
        likes: 0,
        likedByMe: false,
        comments: [],
      }

      const current = loadAppState()
      const nextState = {
        ...current,
        officialPins: [...current.officialPins, nextPin],
      }

      saveAppState(nextState)
      void saveRemoteOfficialPin(nextPin)
      setOfficialPins(nextState.officialPins)
      setForm(createAdminForm())
      setMessage('赤ピンを追加しました。')
    },
    [form],
  )

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>運営ピン登録</h1>
        </div>
        <Link href="/">Mapへ戻る</Link>
      </header>

      <section className="admin-layout">
        <form className="admin-form" onSubmit={submit}>
          <label>
            場所の名前
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            コメント
            <textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
          </label>
          <div className="coordinate-grid">
            <label>
              経度
              <input
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                inputMode="decimal"
              />
            </label>
            <label>
              緯度
              <input
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                inputMode="decimal"
              />
            </label>
          </div>
          <ChoiceGroup
            label="カテゴリー"
            values={CATEGORIES}
            selected={form.categories}
            onToggle={(category) => setForm({ ...form, categories: toggleValue(form.categories, category) })}
          />
          <ChoiceGroup
            label="タグ"
            values={TAGS}
            selected={form.tags}
            onToggle={(tag) => setForm({ ...form, tags: toggleValue(form.tags, tag) })}
          />
          {message && <p className="status-text">{message}</p>}
          <button className="primary-button" type="submit">
            赤ピンを追加
          </button>
        </form>

        <div className="admin-list">
          <h2>登録済み赤ピン</h2>
          {officialPins.map((pin) => (
            <article key={pin.id}>
              <strong>{pin.name}</strong>
              <span>
                {pin.longitude.toFixed(4)}, {pin.latitude.toFixed(4)}
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function ChoiceGroup<T extends string>({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string
  values: readonly T[]
  selected: T[]
  onToggle: (value: T) => void
}) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div>
        {values.map((value) => (
          <label className="check-chip" key={value}>
            <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
