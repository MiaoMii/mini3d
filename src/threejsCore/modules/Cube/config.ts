import type { ColorRepresentation, Vector3Tuple } from 'three'
import type { AnimationConfig, ModuleDefaultConfig } from '../config'

export interface CubeEnterAnimationConfig extends AnimationConfig {
  startScale?: number
  startOpacity?: number
}

export interface CubeLeaveAnimationConfig extends AnimationConfig {
  endScale?: number
  endOpacity?: number
}

export interface CubeModuleConfig
  extends ModuleDefaultConfig<CubeEnterAnimationConfig, CubeLeaveAnimationConfig> {
  size?: number
  color?: ColorRepresentation
  position?: Vector3Tuple
  rotateSpeed?: Vector3Tuple
}

export type ResolvedCubeModuleConfig = Required<
  Omit<CubeModuleConfig, 'id' | 'dataSourceId' | 'enterAnimation' | 'leaveAnimation'>
> & {
  enterAnimation: Required<CubeEnterAnimationConfig>
  leaveAnimation: Required<CubeLeaveAnimationConfig>
}

export const DEFAULT_CUBE_MODULE_CONFIG: ResolvedCubeModuleConfig = {
  name: 'cube',
  size: 1,
  color: '#00aaff',
  position: [0, 0, 0],
  visible: true,
  renderOrder: 0,
  rotateSpeed: [0, 0.8, 0],
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
