'use client'

import { useEffect } from 'react'

const PIN_PATH = 'M24 0C10.745 0 0 10.745 0 24c0 16.4 24 40 24 40s24-23.6 24-40C48 10.745 37.255 0 24 0Z'
const FILTER_FALLBACKS = ['All', 'my pins', 'followers', 'caos', 'architecture', 'cafe', 'shops']

function buildSvgPin(src: string, label: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const clipId = `dropPhotoClip-${Math.random().toString(36).slice(2)}`
  svg.setAttribute('class', 'drop-runtime-svg-pin')
  svg.setAttribute('width', '54')
  svg.setAttribute('height', '72')
  svg.setAttribute('viewBox', '0 0 48 64')
  svg.setAttribute('aria-hidden', 'true')

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clip.setAttribute('id', clipId)
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '24')
  circle.setAttribute('cy', '22')
  circle.setAttribute('r', '16')
  clip.append(circle)
  defs.append(clip)

  const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  shadow.setAttribute('d', PIN_PATH)
  shadow.setAttribute('fill', 'rgba(0,0,0,0.18)')
  shadow.setAttribute('transform', 'translate(0 1.4)')

  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  shape.setAttribute('d', PIN_PATH)
  shape.setAttribute('fill', '#f7fbf9')

  const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
  image.setAttribute('href', src)
  image.setAttribute('x', '8')
  image.setAttribute('y', '6')
  image.setAttribute('width', '32')
  image.setAttribute('height', '32')
  image.setAttribute('clip-path', `url(#${clipId})`)
  image.setAttribute('preserveAspectRatio', 'xMidYMid slice')

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  ring.setAttribute('cx', '24')
  ring.setAttribute('cy', '22')
  ring.setAttribute('r', '16.8')
  ring.setAttribute('fill', 'none')
  ring.setAttribute('stroke', 'rgba(91,193,178,0.28)')
  ring.setAttribute('stroke-width', '2')

  svg.append(defs, shadow, shape, image, ring)
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', label)
  return svg
}

function repairPins(root: ParentNode = document) {
  root.querySelectorAll('button[class*=mapDropPin]').forEach((pin) => {
    const button = pin as HTMLButtonElement
    if (button.dataset.dropSvgPin === 'true') return
    const image = button.querySelector('img[class*=mapDropPinImage]') as HTMLImageElement | null
    const label = button.querySelector('span[class*=mapDropPinName]') as HTMLSpanElement | null
    if (!image) return

    const svg = buildSvgPin(image.currentSrc || image.src, label?.textContent?.trim() || button.getAttribute('aria-label') || 'Drop')
    image.replaceWith(svg)
    if (label) label.classList.add('drop-runtime-pin-label')
    button.dataset.dropSvgPin = 'true'
  })
}

function getOriginalFilterButtons() {
  return [...document.querySelectorAll('div[class*=chipsRow] button')] as HTMLButtonElement[]
}

function getFilterLabels() {
  const labels = getOriginalFilterButtons()
    .map((button) => button.textContent?.trim())
    .filter((label): label is string => Boolean(label))
  return labels.length ? labels : FILTER_FALLBACKS
}

function isMapScale() {
  return Boolean(document.querySelector('div[class*=mapWrapVisible]'))
}

function repairFilters() {
  const original = document.querySelector('div[class*=chipsRow]') as HTMLDivElement | null
  if (original) original.classList.add('drop-runtime-original-filter-row')

  let proxy = document.querySelector('#drop-runtime-filter-proxy') as HTMLDivElement | null
  if (!proxy) {
    proxy = document.createElement('div')
    proxy.id = 'drop-runtime-filter-proxy'
    proxy.className = 'drop-runtime-filter-proxy'
    proxy.setAttribute('aria-label', 'カテゴリフィルター')
    document.body.append(proxy)
  }

  const labels = getFilterLabels()
  const activeText = getOriginalFilterButtons().find((button) => String(button.className).includes('chipActive'))?.textContent?.trim() ?? 'All'
  proxy.replaceChildren(
    ...labels.map((label) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label
      button.className = label === activeText ? 'drop-runtime-filter-chip drop-runtime-filter-chip-active' : 'drop-runtime-filter-chip'
      button.addEventListener('click', () => {
        const target = getOriginalFilterButtons().find((originalButton) => originalButton.textContent?.trim() === label)
        target?.click()
      })
      return button
    }),
  )
}

function repairScaleVisibility() {
  const mapScale = isMapScale()
  document.documentElement.classList.toggle('drop-runtime-map-scale', mapScale)
  document.documentElement.classList.toggle('drop-runtime-globe-scale', !mapScale)
}

function repairPopup() {
  const card = document.querySelector('div[class*=friendDetail__]') as HTMLDivElement | null
  if (!card) return
  card.classList.add('drop-runtime-popup')
  card.querySelector('img[class*=dropDetailImage]')?.classList.add('drop-runtime-popup-image')
  card.querySelector('div[class*=friendDetailBody]')?.classList.add('drop-runtime-popup-body')
  card.querySelector('div[class*=friendDetailActions]')?.classList.add('drop-runtime-popup-actions')
  card.querySelector('[class*=primaryAction]')?.classList.add('drop-runtime-hidden-action')
  card.querySelector('[class*=closeAction]')?.classList.add('drop-runtime-close')
}

function repairAll() {
  repairPins()
  repairFilters()
  repairScaleVisibility()
  repairPopup()
}

export function DropUiLabRuntimeFixes() {
  useEffect(() => {
    repairAll()
    const interval = window.setInterval(repairAll, 350)
    const observer = new MutationObserver(() => repairAll())
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => {
      window.clearInterval(interval)
      observer.disconnect()
      document.querySelector('#drop-runtime-filter-proxy')?.remove()
      document.documentElement.classList.remove('drop-runtime-map-scale', 'drop-runtime-globe-scale')
    }
  }, [])

  return (
    <style>{`
      .drop-runtime-original-filter-row {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      .drop-runtime-filter-proxy {
        position: fixed !important;
        top: calc(158px + env(safe-area-inset-top)) !important;
        left: 50% !important;
        z-index: 120 !important;
        display: flex !important;
        gap: 8px !important;
        width: min(430px, 100vw) !important;
        max-height: 56px !important;
        padding: 4px 12px 10px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        visibility: visible !important;
        transform: translateX(-50%) !important;
        scrollbar-width: none !important;
      }

      .drop-runtime-filter-proxy::-webkit-scrollbar {
        display: none;
      }

      .drop-runtime-filter-chip {
        flex: none !important;
        min-height: 36px !important;
        padding: 8px 15px !important;
        color: #f7faf7 !important;
        font-size: 0.72rem !important;
        font-weight: 800 !important;
        white-space: nowrap !important;
        background: rgba(0, 0, 0, 0.4) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 999px !important;
        box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2) !important;
        backdrop-filter: blur(8px) saturate(1.2) !important;
        -webkit-backdrop-filter: blur(8px) saturate(1.2) !important;
      }

      .drop-runtime-filter-chip-active {
        color: #101814 !important;
        background: #d7e2da !important;
        border-color: rgba(247, 250, 247, 0.88) !important;
      }

      .drop-runtime-map-scale [class*=statsRow] {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      .drop-runtime-map-scale .drop-runtime-filter-proxy {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      .drop-runtime-globe-scale [class*=statsRow] {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      .drop-runtime-globe-scale .drop-runtime-filter-proxy {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      button[class*=mapDropPin][data-drop-svg-pin='true'] {
        width: 58px !important;
        min-height: 92px !important;
        overflow: visible !important;
        padding: 0 !important;
        filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.32)) !important;
      }

      button[class*=mapDropPin][data-drop-svg-pin='true']::before,
      button[class*=mapDropPin][data-drop-svg-pin='true']::after {
        display: none !important;
      }

      .drop-runtime-svg-pin {
        display: block !important;
        width: 54px !important;
        height: 72px !important;
        overflow: visible !important;
        pointer-events: none !important;
      }

      .drop-runtime-pin-label {
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        margin-top: 3px !important;
        padding: 3px 8px !important;
        background: rgba(8, 13, 11, 0.82) !important;
        border: 1px solid rgba(91, 193, 178, 0.22) !important;
        border-radius: 999px !important;
      }

      .drop-runtime-popup {
        position: absolute !important;
        top: 208px !important;
        right: auto !important;
        bottom: auto !important;
        left: 50% !important;
        z-index: 45 !important;
        display: grid !important;
        grid-template-columns: 72px minmax(0, 1fr) 30px !important;
        gap: 10px !important;
        align-items: center !important;
        width: min(328px, calc(100% - 36px)) !important;
        min-height: 92px !important;
        max-height: 112px !important;
        padding: 10px !important;
        overflow: hidden !important;
        background: rgba(247, 250, 247, 0.98) !important;
        border: 1px solid rgba(16, 24, 20, 0.1) !important;
        border-radius: 16px !important;
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34) !important;
        transform: translateX(-50%) !important;
        backdrop-filter: blur(18px) saturate(1.12) !important;
        -webkit-backdrop-filter: blur(18px) saturate(1.12) !important;
      }

      .drop-runtime-popup::before {
        display: none !important;
      }

      .drop-runtime-popup-image {
        position: static !important;
        width: 72px !important;
        height: 72px !important;
        object-fit: cover !important;
        border-radius: 12px !important;
      }

      .drop-runtime-popup-body {
        position: static !important;
        display: grid !important;
        gap: 4px !important;
        min-width: 0 !important;
        width: auto !important;
        height: auto !important;
        padding: 0 !important;
      }

      .drop-runtime-popup-body strong,
      .drop-runtime-popup-body span {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .drop-runtime-popup-body strong {
        font-size: 0.92rem !important;
        line-height: 1.15 !important;
      }

      .drop-runtime-popup-body span {
        font-size: 0.72rem !important;
        line-height: 1.2 !important;
      }

      .drop-runtime-popup-body span:last-child {
        display: none !important;
      }

      .drop-runtime-popup-actions {
        position: static !important;
        display: flex !important;
        justify-content: flex-end !important;
        width: auto !important;
        height: auto !important;
        padding: 0 !important;
      }

      .drop-runtime-hidden-action {
        display: none !important;
      }

      .drop-runtime-close {
        width: 30px !important;
        height: 30px !important;
        color: #101814 !important;
        background: rgba(227, 233, 229, 0.95) !important;
        box-shadow: none !important;
      }
    `}</style>
  )
}
