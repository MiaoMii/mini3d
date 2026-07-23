import type { AnimationConfig, ModuleDefaultConfig } from '../config'
import type { Vector3Tuple } from 'three'

export interface ExtrudeMapEnterAnimationConfig extends AnimationConfig {
  startScale?: number
  startOpacity?: number
}

export interface ExtrudeMapLeaveAnimationConfig extends AnimationConfig {
  endScale?: number
  endOpacity?: number
}

export interface ExtrudeMapConfig
  extends ModuleDefaultConfig<ExtrudeMapEnterAnimationConfig, ExtrudeMapLeaveAnimationConfig> {
  depth?: number
  scale?: number
  center?: [number, number]
  position?: Vector3Tuple
  rotation?: [number, number, number]
  mapJsonUrl?: string
  boundaryJsonUrl?: string
  storkColor?: string
  storkWidth?: number
  faceOpacity?: number
  faceSideColor1?: string
  faceSideColor2?: string
  faceColor?: string
  sideColorTop?: string
  sideColorBottom?: string
  sideScanColor?: string
  faceMaterialUrl?: string
  faceMaterialOpacity?: string
  boundaryLineColor?: string
  boundaryLineWidth?: number
  label?: {
    show: boolean
    showList?: string[]
    fontSize?: number
    scale?: number
    fontColor?: string
    fontFamil?: string
  }
}

export type ResolvedExtrudeMapConfig = Required<Omit<ExtrudeMapConfig, 'id' | 'dataSourceId'>>

export const DEFAULT_MODULE_CONFIG: ResolvedExtrudeMapConfig = {
  name: 'extrudeMap',
  position: [0, 0, 0],
  depth: 0.2,
  scale: 1,
  center: [116.3683244, 39.915085],
  rotation: [-Math.PI / 2, 0, 0],
  mapJsonUrl: '',
  boundaryJsonUrl: '',
  storkColor: '#ffffff',
  storkWidth: 1.5,
  faceOpacity: 0.85,
  faceSideColor1: '#1890ff',
  faceSideColor2: '#096dd9',
  faceColor: '#096dd9',
  sideColorTop: '#40a9ff',
  sideColorBottom: '#0050b3',
  sideScanColor: '#0050b3',
  faceMaterialUrl: '',
  faceMaterialOpacity: '0.9',
  boundaryLineColor: '#378CDA',
  boundaryLineWidth: 7.5,
  label: {
    show: true,
    showList: [],
    fontSize: 14,
    scale: 1.0,
    fontColor: '#ffffff',
    fontFamil: 'Microsoft Yahei'
  },
  visible: true,
  renderOrder: 0,
  transitionDuration: 0.35,
  transitionEase: 'power2.out',
  enterAnimation: {
    enabled: true,
    duration: 0.6,
    ease: 'power2.out',
    startScale: 0,
    startOpacity: 0
  },
  leaveAnimation: {
    enabled: true,
    duration: 0.4,
    ease: 'power2.in',
    endScale: 0,
    endOpacity: 0
  }
}
