import type { Mini3dMapConfig } from '@/types/map'

const geoJsonLoaders = import.meta.glob('../assets/json/*.geojson', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

export const defaultMapConfigId = 'sichuan'

const baseDistrictNameConfig: Mini3dMapConfig['districtName'] = {
  visible: true,
  nameField: 'name',
  positionField: 'centroid',
  fontSize: 14,
  color: '#f8fbff',
  offset: [0, 0, 0.78],
  scale: 0.018,
  zIndex: 2,
  className: 'district-name-label',
  style: {
    background: 'rgba(8, 24, 34, 0.68)',
    borderColor: 'rgba(130, 220, 255, 0.38)',
    borderRadius: '4px',
    fontWeight: 700,
    letterSpacing: '0',
    padding: '4px 8px',
    textShadow: '0 0 8px rgba(98, 225, 255, 0.65)',
  },
  transition: {
    duration: 0.52,
    ease: 'power2.out',
    stagger: 0.018,
    translateY: 10,
  },
}

export const mapConfigs: Mini3dMapConfig[] = [
  {
    id: 'sichuan',
    name: '四川省',
    background: '#08131f',
    camera: {
      position: [0, 20, 28],
      lookAt: [0, 0, 0],
    },
    map: {
      id: 'sichuan',
      name: '四川省',
      geojson: '四川省.geojson',
      visible: true,
      color: '#1d8ec4',
      sideColor: '#0a314a',
      opacity: 0.92,
      sideOpacity: 0.72,
      depth: 0.55,
      scale: 1,
      position: [0, 0, 0],
      projection: {
        center: [103.8, 30.6],
        scale: 130,
      },
      border: {
        visible: true,
        color: '#a4f0ff',
        opacity: 0.9,
        width: 1,
        elevation: 0.08,
      },
      transition: {
        duration: 0.72,
        ease: 'power2.out',
        initialScale: 0.94,
        cameraDuration: 1.28,
        cameraEase: 'power2.inOut',
        flyDistanceScale: 1.38,
        flyHeight: 8,
      },
      renderOrder: 6,
    },
    districtName: {
      ...baseDistrictNameConfig,
      offset: [0, 0, 0.82],
      scale: 0.024,
      fontSize: 15,
    },
  },
  {
    id: 'yaan',
    name: '雅安市',
    background: '#0b1618',
    camera: {
      position: [0, 16, 24],
      lookAt: [0, 0, 0],
    },
    map: {
      id: 'yaan',
      name: '雅安市',
      geojson: '雅安市.geojson',
      visible: true,
      color: '#2ba66f',
      sideColor: '#0b3b35',
      opacity: 0.95,
      sideOpacity: 0.76,
      depth: 0.48,
      scale: 1,
      position: [0, 0, 0],
      projection: {
        center: [102.98, 30.05],
        scale: 980,
      },
      border: {
        visible: true,
        color: '#d7ffe8',
        opacity: 0.86,
        width: 1,
        elevation: 0.08,
      },
      transition: {
        duration: 0.72,
        ease: 'power2.out',
        initialScale: 0.94,
        cameraDuration: 1.28,
        cameraEase: 'power2.inOut',
        flyDistanceScale: 1.38,
        flyHeight: 8,
      },
      renderOrder: 6,
    },
    districtName: {
      ...baseDistrictNameConfig,
      offset: [0, 0, 0.72],
      scale: 0.014,
      fontSize: 13,
      style: {
        ...baseDistrictNameConfig.style,
        background: 'rgba(7, 32, 27, 0.72)',
        borderColor: 'rgba(178, 255, 219, 0.42)',
        textShadow: '0 0 8px rgba(138, 255, 196, 0.7)',
      },
    },
  },
  {
    id: 'yaan-outline',
    name: '雅安市描边样式',
    background: '#11151a',
    camera: {
      position: [0, 16, 24],
      lookAt: [0, 0, 0],
    },
    map: {
      id: 'yaan-outline',
      name: '雅安市描边样式',
      geojson: '雅安市.geojson',
      visible: true,
      color: '#7257d8',
      sideColor: '#2b2552',
      opacity: 0.78,
      sideOpacity: 0.58,
      depth: 0.48,
      scale: 1,
      position: [0, 0, 0],
      projection: {
        center: [102.98, 30.05],
        scale: 980,
      },
      border: {
        visible: true,
        color: '#ffdf7f',
        opacity: 1,
        width: 1,
        elevation: 0.08,
      },
      transition: {
        duration: 0.72,
        ease: 'power2.out',
        initialScale: 0.94,
        cameraDuration: 1.28,
        cameraEase: 'power2.inOut',
        flyDistanceScale: 1.38,
        flyHeight: 8,
      },
      renderOrder: 6,
    },
    districtName: {
      ...baseDistrictNameConfig,
      offset: [0, 0, 0.76],
      scale: 0.014,
      fontSize: 13,
      color: '#fff1b8',
      style: {
        ...baseDistrictNameConfig.style,
        background: 'rgba(29, 24, 42, 0.72)',
        borderColor: 'rgba(255, 223, 127, 0.5)',
        textShadow: '0 0 9px rgba(255, 212, 96, 0.75)',
      },
    },
  },
  {
    id: 'qinghai',
    name: '青海省',
    background: '#06121e',
    camera: {
      position: [-3, 22, 30],
      lookAt: [0, 0, 0],
    },
    map: {
      id: 'qinghai',
      name: '青海省',
      geojson: '青海省.geojson',
      visible: true,
      color: '#157ea8',
      sideColor: '#09263d',
      opacity: 0.94,
      sideOpacity: 0.74,
      depth: 0.62,
      scale: 1,
      position: [0, 0, 0],
      projection: {
        center: [96.2, 36.1],
        scale: 86,
      },
      border: {
        visible: true,
        color: '#d8f8ff',
        opacity: 0.92,
        width: 1,
        elevation: 0.1,
      },
      transition: {
        duration: 0.86,
        ease: 'power3.out',
        initialScale: 0.88,
        cameraDuration: 1.35,
        cameraEase: 'power3.inOut',
        flyDistanceScale: 1.46,
        flyHeight: 9,
      },
      renderOrder: 6,
    },
    districtName: {
      ...baseDistrictNameConfig,
      offset: [0, 0, 0.92],
      scale: 0.032,
      fontSize: 13,
      color: '#eafcff',
      style: {
        ...baseDistrictNameConfig.style,
        background: 'rgba(4, 21, 36, 0.74)',
        borderColor: 'rgba(152, 235, 255, 0.45)',
        textShadow: '0 0 9px rgba(112, 224, 255, 0.78)',
      },
    },
  },
]

export const mapConfigIds = mapConfigs.map((item) => item.id)

export async function getMapConfig(id: string): Promise<Mini3dMapConfig> {
  await new Promise((resolve) => setTimeout(resolve, 160))

  const config = mapConfigs.find((item) => item.id === id)
  if (!config) {
    throw new Error(`地图配置不存在：${id}`)
  }

  return JSON.parse(JSON.stringify(config)) as Mini3dMapConfig
}

export async function loadMapGeoJson(geojson: string): Promise<string> {
  const fileName = geojson.endsWith('.geojson') ? geojson : `${geojson}.geojson`
  const loader = geoJsonLoaders[`../assets/json/${fileName}`]

  if (!loader) {
    throw new Error(`GeoJSON 文件不存在：src/assets/json/${fileName}`)
  }

  return loader()
}
