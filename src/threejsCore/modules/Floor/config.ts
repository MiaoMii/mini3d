import type { ColorRepresentation } from 'three'
import type { ModuleDefaultConfig } from '../index'

export interface FloorConfig extends ModuleDefaultConfig {
  // 网格基础
  gridSize?: number,
  gridDivision?: number,
  gridColor?: ColorRepresentation,

  // 十字花
  shapeSize?: number,
  shapeColor?: ColorRepresentation,

  // 点阵
  pointSize?: number,
  pointColor?: ColorRepresentation,
  pointLayout?: [number, number]

  // 闪光
  flashEnabled?: true,
  flashColor?: ColorRepresentation,
  flashOpacity?: number,
  flashDuration?: number,
  flashConcurrent?: number,

  // 分割线
  cellLineEnabled?: true,
  cellLineColor?: ColorRepresentation,
  cellLineOpacity?: number,

  // 升起光柱
  beamEnabled?: true,
  beamColor?: ColorRepresentation,
  beamHeight?: number,
  beamLength?: number,
  beamSpeed?: number,
  beamWidth?: number,
  beamConcurrent?: number,
  beamOpacity?: number,


}

export type ResolvedFloorConfig = Required<
  Omit<FloorConfig, 'id' | 'dataSourceId' | 'enterAnimation' | 'leaveAnimation'>
>

export const DEFAULT_MODULE_CONFIG: ResolvedFloorConfig = {
  name: 'Floor',
  //网格基础
  gridSize: 100,
  gridDivision: 20,
  gridColor: '#28373a',
  // 十字花
  shapeSize: 1,
  shapeColor: '#8e9b9e',
  // 点阵
  pointSize: 0.2,
  pointColor: '#28373a',
  pointLayout: [200, 200],
  // 闪光
  flashEnabled: true,
  flashColor: '#ffffff',
  flashOpacity: 0.18,
  flashDuration: 0.5,
  flashConcurrent: 140,
  // 分割线
  cellLineEnabled: true,
  cellLineColor: '#ffffff',
  cellLineOpacity: 0.3,
  // 升起光柱
  beamEnabled: true,
  beamColor: '#00eeee',
  beamHeight: 12,
  beamLength: 3,
  beamSpeed: 14,
  beamWidth: 0.06,
  beamConcurrent: 30,
  beamOpacity: 0.9,
  // 基础设置
  visible: true,
  renderOrder: 0,
  transitionDuration: 0.35,
  transitionEase: 'power2.out'
}
