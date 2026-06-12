import * as THREE from 'three'

export type GlobeView = {
  lng: number
  lat: number
}

export type GlobeMarkerInput = {
  id: string
  lat: number
  lng: number
  image: HTMLCanvasElement
  size?: number
}

type GlobeEngineOptions = {
  canvas: HTMLCanvasElement
  earthTexture: HTMLCanvasElement
  markers?: GlobeMarkerInput[]
  onDive?: (center: GlobeView) => void
  onMarkerSelect?: (id: string) => void
}

type Flight = {
  fromLng: number
  fromLat: number
  toLng: number
  toLat: number
  start: number
  duration: number
  thenDive: boolean
}

const MIN_DISTANCE = 1.3
const MAX_DISTANCE = 4.4
const DIVE_DISTANCE = 1.52
const MARKER_RADIUS = 1.028
const DEG = Math.PI / 180

const ATMOSPHERE_VERTEX = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const ATMOSPHERE_FRAGMENT = `
varying vec3 vNormal;
void main() {
  float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
  gl_FragColor = vec4(0.36, 0.58, 1.0, 1.0) * intensity;
}
`

const RIM_FRAGMENT = `
varying vec3 vNormal;
void main() {
  float intensity = pow(1.04 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 5.0);
  gl_FragColor = vec4(0.5, 0.7, 1.0, 1.0) * intensity * 0.55;
}
`

function normalizeLng(lng: number) {
  return ((lng + 540) % 360) - 180
}

function shortestLngDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (lng + 180) * DEG
  const theta = (90 - lat) * DEG
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

export class GlobeEngine {
  private canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private markerGroup = new THREE.Group()
  private markerById = new Map<string, THREE.Sprite>()
  private hiddenMarkers = new Set<string>()
  private raycaster = new THREE.Raycaster()

  private view: GlobeView = { lng: 137, lat: 34 }
  private distance = 3.9
  private distanceTarget = 2.9
  private fitDistance = 3.2
  private maxDistance = MAX_DISTANCE
  private initialFitDone = false
  private velocity = { lng: 0, lat: 0 }
  private pointers = new Map<number, { x: number; y: number }>()
  private lastPinchGap = 0
  private tapCandidate: { x: number; y: number } | null = null
  private lastMoveTime = 0
  private lastInteraction = 0
  private flight: Flight | null = null
  private diveFired = false
  private locked = false
  private paused = false
  private disposed = false
  private raf = 0
  private lastFrameTime = 0

  private onDive?: (center: GlobeView) => void
  private onMarkerSelect?: (id: string) => void

  constructor(options: GlobeEngineOptions) {
    this.canvas = options.canvas
    this.onDive = options.onDive
    this.onMarkerSelect = options.onMarkerSelect

    this.renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color('#05070f')

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 120)

    const texture = new THREE.CanvasTexture(options.earthTexture)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()

    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), new THREE.MeshBasicMaterial({ map: texture }))
    this.scene.add(earth)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    atmosphere.scale.setScalar(1.18)
    this.scene.add(atmosphere)

    const rim = new THREE.Mesh(
      new THREE.SphereGeometry(1.001, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: RIM_FRAGMENT,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.scene.add(rim)

    this.scene.add(this.buildStars())
    this.scene.add(this.markerGroup)
    options.markers?.forEach((marker) => this.addMarker(marker))

    this.bindEvents()
    this.lastFrameTime = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private buildStars() {
    const count = 1600
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const direction = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 30)
      positions.set([direction.x, direction.y, direction.z], i * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.85 }),
    )
  }

  private addMarker(input: GlobeMarkerInput) {
    const texture = new THREE.CanvasTexture(input.image)
    texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))
    sprite.position.copy(latLngToVector3(input.lat, input.lng, MARKER_RADIUS))
    sprite.userData.id = input.id
    sprite.userData.baseSize = input.size ?? 0.11
    this.markerGroup.add(sprite)
    this.markerById.set(input.id, sprite)
  }

  private bindEvents() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown)
    this.canvas.addEventListener('pointermove', this.handlePointerMove)
    this.canvas.addEventListener('pointerup', this.handlePointerUp)
    this.canvas.addEventListener('pointercancel', this.handlePointerUp)
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (this.locked) return
    this.canvas.setPointerCapture(event.pointerId)
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    this.lastInteraction = performance.now()
    this.velocity = { lng: 0, lat: 0 }
    this.flight = null
    if (this.pointers.size === 1) {
      this.tapCandidate = { x: event.clientX, y: event.clientY }
    } else {
      this.tapCandidate = null
      this.lastPinchGap = this.pinchGap()
    }
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.locked || !this.pointers.has(event.pointerId)) return
    const previous = this.pointers.get(event.pointerId) as { x: number; y: number }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    this.lastInteraction = performance.now()

    if (this.pointers.size === 2) {
      const gap = this.pinchGap()
      if (this.lastPinchGap > 0 && gap > 0) {
        this.setDistanceTarget(this.distanceTarget * (this.lastPinchGap / gap))
      }
      this.lastPinchGap = gap
      return
    }

    const dx = event.clientX - previous.x
    const dy = event.clientY - previous.y
    if (this.tapCandidate) {
      const total = Math.hypot(event.clientX - this.tapCandidate.x, event.clientY - this.tapCandidate.y)
      if (total > 6) this.tapCandidate = null
    }

    const sensitivity = (0.082 * (this.distance - 1.02)) / Math.max(this.canvas.clientHeight / 640, 0.5)
    const deltaLng = -dx * sensitivity
    const deltaLat = dy * sensitivity
    this.view.lng += deltaLng
    this.view.lat = THREE.MathUtils.clamp(this.view.lat + deltaLat, -84, 84)

    const now = performance.now()
    const elapsed = Math.max(now - this.lastMoveTime, 8) / 1000
    this.velocity.lng = THREE.MathUtils.lerp(this.velocity.lng, deltaLng / elapsed, 0.45)
    this.velocity.lat = THREE.MathUtils.lerp(this.velocity.lat, deltaLat / elapsed, 0.45)
    this.lastMoveTime = now
  }

  private handlePointerUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    this.lastPinchGap = this.pointers.size === 2 ? this.pinchGap() : 0
    if (this.tapCandidate && this.pointers.size === 0) {
      this.handleTap(event.clientX, event.clientY)
    }
    if (this.pointers.size === 0) this.tapCandidate = null
  }

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault()
    if (this.locked) return
    this.lastInteraction = performance.now()
    this.setDistanceTarget(this.distanceTarget * Math.exp(event.deltaY * 0.0011))
  }

  private pinchGap() {
    const points = [...this.pointers.values()]
    if (points.length < 2) return 0
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  private setDistanceTarget(value: number) {
    this.distanceTarget = THREE.MathUtils.clamp(value, MIN_DISTANCE, this.maxDistance)
  }

  private handleTap(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(ndc, this.camera)
    const hits = this.raycaster.intersectObjects(this.markerGroup.children.filter((child) => child.visible))
    const id = hits[0]?.object.userData.id
    if (typeof id === 'string') this.onMarkerSelect?.(id)
  }

  private tick = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.tick)
    const dt = THREE.MathUtils.clamp((now - this.lastFrameTime) / 1000, 0, 0.05)
    this.lastFrameTime = now
    if (this.paused) return

    if (this.flight) {
      const t = Math.min((now - this.flight.start) / this.flight.duration, 1)
      const eased = easeInOutCubic(t)
      this.view.lng = this.flight.fromLng + shortestLngDelta(this.flight.fromLng, this.flight.toLng) * eased
      this.view.lat = THREE.MathUtils.lerp(this.flight.fromLat, this.flight.toLat, eased)
      if (t >= 1) {
        const thenDive = this.flight.thenDive
        this.flight = null
        if (thenDive) this.distanceTarget = MIN_DISTANCE
      }
    } else if (this.pointers.size === 0 && !this.locked) {
      this.view.lng += this.velocity.lng * dt
      this.view.lat = THREE.MathUtils.clamp(this.view.lat + this.velocity.lat * dt, -84, 84)
      const decay = Math.exp(-3.2 * dt)
      this.velocity.lng *= decay
      this.velocity.lat *= decay

      if (now - this.lastInteraction > 2600) {
        this.view.lng += 1.6 * dt
      }
    }

    this.distance += (this.distanceTarget - this.distance) * (1 - Math.exp(-7 * dt))
    if (!this.diveFired && this.distance < DIVE_DISTANCE) {
      this.diveFired = true
      this.locked = true
      this.distanceTarget = MIN_DISTANCE
      this.onDive?.(this.getView())
    }

    this.camera.position.copy(latLngToVector3(this.view.lat, normalizeLng(this.view.lng), this.distance))
    this.camera.lookAt(0, 0, 0)

    const cameraDirection = this.camera.position.clone().normalize()
    const markerScale = THREE.MathUtils.clamp(this.distance / 3, 0.6, 1.15)
    this.markerGroup.children.forEach((child) => {
      const sprite = child as THREE.Sprite
      const facing = sprite.position.clone().normalize().dot(cameraDirection)
      sprite.visible = facing > 0.12 && !this.hiddenMarkers.has(sprite.userData.id)
      const size = (sprite.userData.baseSize as number) * markerScale
      sprite.scale.setScalar(size)
    })

    this.renderer.render(this.scene, this.camera)
  }

  getView(): GlobeView {
    return { lng: normalizeLng(this.view.lng), lat: this.view.lat }
  }

  flyToAndDive(lng: number, lat: number, duration = 1100) {
    if (this.locked) return
    this.velocity = { lng: 0, lat: 0 }
    this.lastInteraction = performance.now()
    this.flight = {
      fromLng: this.view.lng,
      fromLat: this.view.lat,
      toLng: lng,
      toLat: lat,
      start: performance.now(),
      duration,
      thenDive: true,
    }
  }

  resetView(lng: number, lat: number) {
    this.view = { lng, lat: THREE.MathUtils.clamp(lat, -84, 84) }
    this.velocity = { lng: 0, lat: 0 }
    this.flight = null
    this.diveFired = false
    this.locked = false
    this.distance = 1.75
    this.distanceTarget = this.fitDistance
    this.lastInteraction = performance.now()
  }

  setMarkerHidden(id: string, hidden: boolean) {
    if (hidden) this.hiddenMarkers.add(id)
    else this.hiddenMarkers.delete(id)
  }

  setPaused(paused: boolean) {
    this.paused = paused
    if (!paused) this.lastFrameTime = performance.now()
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    // 画面の狭い方の辺に地球全体が収まるカメラ距離を求める
    // (半径1の球が半角θに収まる距離は 1/sinθ)。
    const halfV = (this.camera.fov / 2) * DEG
    const halfH = Math.atan(Math.tan(halfV) * this.camera.aspect)
    const minHalf = Math.min(halfV, halfH)
    this.fitDistance = Math.min(1.12 / Math.sin(minHalf), 8)
    this.maxDistance = this.fitDistance * 1.25
    if (!this.initialFitDone) {
      this.initialFitDone = true
      this.distance = this.fitDistance * 1.35
      this.distanceTarget = this.fitDistance
    } else if (!this.locked) {
      this.distanceTarget = Math.min(this.distanceTarget, this.maxDistance)
    }
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite) {
        object.geometry?.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.SpriteMaterial) {
            material.map?.dispose()
          }
          material.dispose()
        })
      }
    })
    this.renderer.dispose()
  }
}
