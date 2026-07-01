<template>
  <section class="animation-preview">
    <div class="animation-preview__tabs">
      <button
        type="button"
        :class="['animation-preview__tab', { 'animation-preview__tab--active': activeTab === 'sichuan' }]"
        @click="switchTab('sichuan')"
      >
        四川地图
      </button>
      <button
        type="button"
        :class="['animation-preview__tab', { 'animation-preview__tab--active': activeTab === 'yaan' }]"
        @click="switchTab('yaan')"
      >
        雅安地图
      </button>
      <button
        type="button"
        class="animation-preview__tab animation-preview__copy"
        @click="copyCameraState"
      >
        {{ copied ? '已复制' : '复制相机' }}
      </button>
    </div>
    <canvas ref="canvasRef" class="animation-preview__canvas" />
  </section>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  AmbientLight,
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  Object3D,
  Raycaster,
  Vector2,
  Vector3,
} from 'three'
import { geoMercator } from 'd3-geo'
import { Mini3d } from '@/mini3d'
import { makeCameraFly } from '@/map/camerafly'
import { MapLayer, type MapViewBounds } from '@/map/layers/MapLayer'
import type { MapLayerConfig } from '@/types/map'
import type { Mini3dLike } from '@/map/utils'
import { getProjectedGeoJsonPlaneBounds } from '@/map/utils'
import sichuanGeoJson from '@/assets/json/四川省-市.geojson?raw'
import yaanGeoJson from '@/assets/json/雅安市.geojson?raw'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const activeTab = ref<'sichuan' | 'yaan'>('sichuan')
const copied = ref(false)

let app: InstanceType<typeof Mini3d> | null = null
let mapLayer: MapLayer | null = null
let boundaryGroup: Group | null = null
let raycaster: Raycaster | null = null
let pointer = new Vector2()
let clickableMeshes: Mesh[] = []
let copiedTimer: number | null = null
let cameraFly: ReturnType<typeof makeCameraFly> | null = null
let cameraFlyTick: ((delta: number) => void) | null = null
let cameraInitialized = false

const sichuanMapConfig: MapLayerConfig = {
  id: 'animation-sichuan',
  name: '四川省',
  geojson: '四川省-市.geojson',
  visible: true,
  color: '#19a7d8',
  sideColor: '#082a40',
  opacity: 0.94,
  sideOpacity: 0.76,
  depth: 0.62,
  scale: 1,
  "position": {
    "x": 2.6777363437702206e-8,
    "y": 14.454324675366284,
    "z": 21.034352508129587
  },
  "lookAt": {
    "x": 2.6777363437702206e-8,
    "y": 0.2790000122040511,
    "z": -2.178530831287163e-7
  },
  "rotation": {
    "x": -0.5930025618815258,
    "y": 0,
    "z": 0
  },
  projection: {
    center: [103.8, 30.6],
    scale: 130,
  },
  border: {
    visible: true,
    color: '#d8f8ff',
    opacity: 0.92,
    width: 1,
    elevation: 0.08,
  },
  transition: {
    duration: 0.8,
    ease: 'power3.out',
    initialScale: 0.9,
    cameraDuration: 1.2,
    cameraEase: 'power3.inOut',
    flyDistanceScale: 1.35,
    flyHeight: 8,
  },
  renderOrder: 6,
}

const yaanMapConfig: MapLayerConfig = {
  id: 'animation-yaan',
  name: '雅安市',
  geojson: '雅安市.geojson',
  visible: true,
  color: '#2ba66f',
  sideColor: '#0b3b35',
  opacity: 0.95,
  sideOpacity: 0.76,
  depth: 0.48,
  scale: 1,
 "position": {
    "x": -6.564937482522737e-8,
    "y": 28.48414239449857,
    "z": 41.946276310871156
  },
  "lookAt": {
    "x": -6.564937482522737e-8,
    "y": 0.2159999918192625,
    "z": 4.875405803517197e-7
  },
  "rotation": {
    "x": -0.593002561881526,
    "y": 0,
    "z": 0
  },
  projection: {
    center: [102.98, 30.05],
    scale: 980,
  },
  border: {
    visible: true,
    color: '#d7ffe8',
    opacity: 0.9,
    width: 1,
    elevation: 0.08,
  },
  transition: {
    duration: 0.8,
    ease: 'power3.out',
    initialScale: 0.9,
    cameraDuration: 1.2,
    cameraEase: 'power3.inOut',
    flyDistanceScale: 1.35,
    flyHeight: 8,
  },
  renderOrder: 6,
}

onMounted(() => {
  if (!canvasRef.value) return

  app = new Mini3d(canvasRef.value)
  app.scene.background = new Color('#04101d')
  setupLight()
  raycaster = new Raycaster()
  cameraFly = makeCameraFly(app.camera.instance)
  cameraFlyTick = (delta: number) => {
    cameraFly?.update(delta * 1000)
  }
  app.time.on('tick', cameraFlyTick)
  switchTab('sichuan')

  canvasRef.value.addEventListener('click', handleCanvasClick)
})

onBeforeUnmount(() => {
  canvasRef.value?.removeEventListener('click', handleCanvasClick)
  if (app?.camera.instance?.position) {
    gsap.killTweensOf(app.camera.instance.position)
  }
  if (app?.camera.controls?.target) {
    gsap.killTweensOf(app.camera.controls.target)
  }
  if (copiedTimer !== null) {
    window.clearTimeout(copiedTimer)
    copiedTimer = null
  }
  if (cameraFlyTick) {
    app?.time.off('tick', cameraFlyTick)
  }
  boundaryGroup?.traverse((child) => {
    if (child instanceof LineLoop) {
      child.geometry.dispose()
    }
  })
  boundaryGroup?.parent?.remove(boundaryGroup)
  mapLayer?.destroy()
  app?.destroy()
  boundaryGroup = null
  raycaster = null
  cameraFly = null
  cameraFlyTick = null
  clickableMeshes = []
  mapLayer = null
  app = null
})

async function copyCameraState() {
  if (!app?.camera.instance) return

  const camera = app.camera.instance
  const target = app.camera.controls?.target ?? new Vector3()
  const cameraState = {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    lookAt: {
      x: target.x,
      y: target.y,
      z: target.z,
    },
    rotation: {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z,
    },
  }
  const text = JSON.stringify(cameraState, null, 2)

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
  } else {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  copied.value = true
  if (copiedTimer !== null) {
    window.clearTimeout(copiedTimer)
  }
  copiedTimer = window.setTimeout(() => {
    copied.value = false
    copiedTimer = null
  }, 1200)
}

function switchTab(tab: 'sichuan' | 'yaan') {
  if (!app) return

  const previousCamera = app.camera.instance
  const previousControlsTarget = app.camera.controls?.target.clone() ?? new Vector3()
  const previousPosition = previousCamera?.position.clone()
  activeTab.value = tab
  const config = tab === 'yaan' ? yaanMapConfig : sichuanMapConfig
  const geoJsonText = tab === 'yaan' ? yaanGeoJson : sichuanGeoJson

  if (app.camera.instance?.position) {
    gsap.killTweensOf(app.camera.instance.position)
  }
  if (app.camera.controls?.target) {
    gsap.killTweensOf(app.camera.controls.target)
  }
  boundaryGroup?.traverse((child) => {
    if (child instanceof LineLoop) {
      child.geometry.dispose()
    }
  })
  boundaryGroup?.parent?.remove(boundaryGroup)
  mapLayer?.destroy()
  boundaryGroup = null
  clickableMeshes = []

  const layerConfig: MapLayerConfig = {
    ...config,
    position: Array.isArray(config.position) ? config.position : [0, 0, 0],
  }

  mapLayer = new MapLayer(app as unknown as Mini3dLike)
  mapLayer.create(layerConfig, geoJsonText)

  const projection = geoMercator()
    .center(config.projection.center)
    .scale(config.projection.scale)
    .translate([0, 0])
  const projectedBounds = getProjectedGeoJsonPlaneBounds(
    geoJsonText,
    config.projection,
  )
  const offsetX = -projectedBounds.center.x
  const offsetY = -projectedBounds.center.y
  const boundaryMaterial = new LineBasicMaterial({
    color: tab === 'yaan' ? 0xd7ffe8 : 0xe7fbff,
    transparent: true,
    opacity: 0.98,
    depthTest: false,
  })
  const geoJsonData = JSON.parse(geoJsonText)
  const mapRoot = app.scene.getObjectByName(`map-layer-${layerConfig.id}`)
  const featureGroups = mapRoot?.children[0]?.children ?? []

  featureGroups.forEach((featureGroup: Object3D, index: number) => {
    const regionName = geoJsonData.features[index]?.properties?.name

    featureGroup.traverse((child) => {
      if (child instanceof Mesh && regionName) {
        child.userData.regionName = regionName
        clickableMeshes.push(child)
      }
    })
  })

  boundaryGroup = new Group()
  boundaryGroup.name = `${layerConfig.id}-boundary-lines`
  boundaryGroup.rotation.x = -Math.PI / 2

  geoJsonData.features.forEach((feature: any) => {
    feature.geometry.coordinates.forEach((polygon: number[][][]) => {
      polygon.forEach((ring: number[][]) => {
        const points = ring
          .map((point) => projection(point as [number, number]))
          .filter((point): point is [number, number] => Boolean(point))
          .map(([x, y]) => new Vector3(x + offsetX, -y + offsetY, config.depth + 0.22))

        if (points.length < 2) return

        const geometry = new BufferGeometry().setFromPoints(points)
        const line = new LineLoop(geometry, boundaryMaterial)
        line.renderOrder = config.renderOrder + 20
        boundaryGroup?.add(line)
      })
    })
  })

  app.scene.add(boundaryGroup)

  const bounds = mapLayer.getViewBounds()
  setupGrid(bounds)
  setupCamera(bounds, config, {
    position: previousPosition,
    lookAt: previousControlsTarget,
    animate: cameraInitialized,
  })
  cameraInitialized = true
}

function setupLight() {
  if (!app) return

  app.scene.add(new AmbientLight(0xffffff, 3.6))

  const mainLight = new DirectionalLight(0xffffff, 4.4)
  mainLight.position.set(-8, 18, 12)
  app.scene.add(mainLight)
}

function setupGrid(bounds: MapViewBounds | null) {
  if (!app) return

  const mapSize = bounds ? Math.max(bounds.size.x, bounds.size.z) : 50
  app.setGridHelper({
    size: Math.max(Math.ceil(mapSize * 1.4), 50),
    divisions: 22,
    colorCenterLine: 0x17627d,
    colorGrid: 0x163447,
  })
}

function setupCamera(
  bounds: MapViewBounds | null,
  config?: MapLayerConfig,
  previous?: {
    position?: Vector3
    lookAt: Vector3
    animate: boolean
  },
) {
  if (!app) return

  const camera = app.camera.instance
  if (!camera) return

  const controls = app.camera.controls
  const target = bounds?.center.clone() ?? new Vector3()
  const mapSize = bounds ? Math.max(bounds.size.x, bounds.size.z) : 26
  const position = target.clone().add(new Vector3(0, mapSize * 0.62, mapSize * 0.92))

  if (
    config &&
    !Array.isArray(config.position) &&
    config.lookAt &&
    config.rotation
  ) {
    if (previous?.animate && cameraFly && previous.position) {
      cameraFly({
        fromPos: {
          x: previous.position.x,
          y: previous.position.y,
          z: previous.position.z,
        },
        fromLookAt: {
          x: previous.lookAt.x,
          y: previous.lookAt.y,
          z: previous.lookAt.z,
        },
        toPos: {
          x: config.position.x,
          y: config.position.y,
          z: config.position.z,
        },
        toLookAt: {
          x: config.lookAt.x,
          y: config.lookAt.y,
          z: config.lookAt.z,
        },
        duration: config.transition.cameraDuration * 1000,
        easing: 'easeInOutCubic',
        onUpdate: (progress: number) => {
          controls?.target.lerpVectors(
            previous.lookAt,
            new Vector3(config.lookAt!.x, config.lookAt!.y, config.lookAt!.z),
            progress,
          )
          controls?.update()
        },
        onComplete: () => {
          controls?.target.set(config.lookAt!.x, config.lookAt!.y, config.lookAt!.z)
          controls?.update()
          camera.rotation.set(config.rotation!.x, config.rotation!.y, config.rotation!.z)
          camera.updateProjectionMatrix()
        },
      })
    } else {
      camera.position.set(config.position.x, config.position.y, config.position.z)
      controls?.target.set(config.lookAt.x, config.lookAt.y, config.lookAt.z)
      controls?.update()
      camera.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z)
      camera.updateProjectionMatrix()
    }
    return
  }

  camera.position.copy(position)
  controls?.target.copy(target)
  controls?.update()
  camera.lookAt(target)
  camera.updateProjectionMatrix()
}

function handleCanvasClick(event: MouseEvent) {
  if (!app || !raycaster || clickableMeshes.length === 0) return

  const camera = app.camera.instance
  if (!camera) return

  const canvasRect = app.canvas.getBoundingClientRect()
  pointer.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1
  pointer.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const intersections = raycaster.intersectObjects(clickableMeshes, false)
  const pickedMesh = intersections[0]?.object as Mesh | undefined
  const regionName = pickedMesh?.userData.regionName
  if (!regionName) return

  const regionBox = new Box3()
  clickableMeshes.forEach((mesh) => {
    if (mesh.userData.regionName === regionName) {
      regionBox.expandByObject(mesh)
    }
  })

  if (regionBox.isEmpty()) return

  const target = new Vector3()
  const size = new Vector3()
  regionBox.getCenter(target)
  regionBox.getSize(size)

  const controls = app.camera.controls
  const currentTarget = controls?.target.clone() ?? new Vector3()
  const currentDirection = camera.position.clone().sub(currentTarget)
  const maxRegionSize = Math.max(size.x, size.z, 1)
  const finalDistance = maxRegionSize * 2.35

  if (currentDirection.lengthSq() < 0.0001) {
    currentDirection.set(0, 0.62, 0.92)
  }

  const finalPosition = target
    .clone()
    .add(currentDirection.normalize().multiplyScalar(finalDistance))

  finalPosition.y = Math.max(target.y + maxRegionSize * 0.72, finalPosition.y)
  gsap.killTweensOf(camera.position)
  gsap.to(camera.position, {
    x: finalPosition.x,
    y: finalPosition.y,
    z: finalPosition.z,
    duration: 1.05,
    ease: 'power3.inOut',
    onUpdate: () => {
      if (!controls) {
        camera.lookAt(target)
      }
    },
  })

  if (controls) {
    gsap.killTweensOf(controls.target)
    gsap.to(controls.target, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.05,
      ease: 'power3.inOut',
      onUpdate: () => {
        controls.update()
      },
    })
  }
}
</script>

<style scoped>
.animation-preview {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #04101d;
}

.animation-preview__tabs {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 2;
  display: flex;
  gap: 8px;
  padding: 6px;
  border: 1px solid rgba(173, 238, 255, 0.18);
  border-radius: 8px;
  background: rgba(4, 16, 29, 0.72);
  backdrop-filter: blur(10px);
}

.animation-preview__tab {
  min-width: 86px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: rgba(231, 251, 255, 0.72);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
}

.animation-preview__tab--active {
  border-color: rgba(216, 248, 255, 0.42);
  background: rgba(25, 167, 216, 0.22);
  color: #e7fbff;
}

.animation-preview__copy {
  border-color: rgba(215, 255, 232, 0.28);
  color: #d7ffe8;
}

.animation-preview__copy:hover {
  background: rgba(43, 166, 111, 0.2);
}

.animation-preview__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
