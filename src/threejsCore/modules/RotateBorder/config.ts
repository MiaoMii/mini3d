import type { ColorRepresentation } from 'three'
import type { ModuleDefaultConfig } from '../index'
import rotationBorderBg1 from './images/rotationBorder1.png'
import rotationBorderBg2 from './images/rotationBorder1.png'
export interface RotateBorderConfig extends ModuleDefaultConfig {
  size?: number[]
  rotateSpeed?: number
  imageUrl?: string
  color?: ColorRepresentation
  opacity?: number
  position?: number[]
}

export type ResolvedRotateBorderConfig = Required<
  Omit<RotateBorderConfig, 'id' | 'dataSourceId' | 'enterAnimation' | 'leaveAnimation'>
>

export const DEFAULT_MODULE_CONFIG: ResolvedRotateBorderConfig = {
  name: 'RotateBorder',
  size: [10, 10],
  rotateSpeed: 1,
  imageUrl: '',
  color: '0x48afff',
  opacity: 0.2,
  position: [0, 0, 0],
  visible: true,
  renderOrder: 0,
  transitionDuration: 0.35,
  transitionEase: 'power2.out'
}
