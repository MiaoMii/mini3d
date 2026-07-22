import type { ColorRepresentation } from 'three'
import type { ModuleDefaultConfig } from '../index'

export interface AxesHelperConfig extends ModuleDefaultConfig {
  size?: number
  xAxisColor?: ColorRepresentation
  yAxisColor?: ColorRepresentation
  zAxisColor?: ColorRepresentation
}

export type ResolvedAxesHelperConfig = Required<
  Omit<AxesHelperConfig, 'id' | 'dataSourceId' | 'enterAnimation' | 'leaveAnimation'>
>

export const DEFAULT_MODULE_CONFIG: ResolvedAxesHelperConfig = {
  name: 'AxesHelper',
  size: 10,
  xAxisColor: '#ff0000',
  yAxisColor: '#00ff00',
  zAxisColor: '#0000ff',
  visible: true,
  renderOrder: 0,
  transitionDuration: 0.35,
  transitionEase: 'power2.out'
}
