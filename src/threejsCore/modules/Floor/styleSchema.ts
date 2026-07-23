import type { ModuleStyleSchema } from '../types'
import { DEFAULT_MODULE_CONFIG } from './config'

export const styleSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: '名称',
      default: DEFAULT_MODULE_CONFIG.name
    },
    gridSize: {
      type: 'number',
      title: '网格尺寸',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.gridSize
    },
    gridDivision: {
      type: 'number',
      title: '分割数',
      minimum: 0,
      maximum: 500,
      default: DEFAULT_MODULE_CONFIG.gridDivision
    },
    gridColor: {
      type: 'string',
      format: 'color',
      title: '网格颜色',
      default: DEFAULT_MODULE_CONFIG.gridColor ?? '#ffffff'
    },
    shapeSize: {
      type: 'number',
      title: '十字花尺寸',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.shapeSize
    },
    shapeColor: {
      type: 'string',
      format: 'color',
      title: '十字花颜色',
      default: DEFAULT_MODULE_CONFIG.shapeColor ?? '#ffffff'
    },
    pointSize: {
      type: 'number',
      title: '网格点尺寸',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.pointSize
    },
    pointColor: {
      type: 'string',
      format: 'color',
      title: '网格点颜色',
      default: DEFAULT_MODULE_CONFIG.pointColor ?? '#ffffff'
    },
    pointLayout: {
      type: 'array',
      title: '网格行列',
      minItems: 2,
      maxItems: 2,
      default: [...DEFAULT_MODULE_CONFIG.pointLayout],
      items: [
        { type: 'number', title: '行数' },
        { type: 'number', title: '列数' }
      ]
    },
    flashEnabled: {
      type: 'boolean',
      title: '启用闪烁',
      default: DEFAULT_MODULE_CONFIG.flashEnabled
    },
    flashColor: {
      type: 'string',
      format: 'color',
      title: '闪烁颜色',
      default: DEFAULT_MODULE_CONFIG.flashColor ?? '#ffffff'
    },
    flashOpacity: {
      type: 'number',
      title: '闪烁透明度',
      minimum: 0,
      maximum: 1,
      default: DEFAULT_MODULE_CONFIG.flashOpacity
    },
    flashDuration: {
      type: 'number',
      title: '闪烁时长',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.flashDuration
    },
    flashConcurrent: {
      type: 'number',
      title: '闪烁并发',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.flashConcurrent
    },
    cellLineEnabled: {
      type: 'boolean',
      title: '启用分割线',
      default: DEFAULT_MODULE_CONFIG.cellLineEnabled
    },
    cellLineColor: {
      type: 'string',
      format: 'color',
      title: '分割线颜色',
      default: DEFAULT_MODULE_CONFIG.cellLineColor ?? '#ffffff'
    },
    cellLineOpacity: {
      type: 'number',
      title: '分割线透明度',
      minimum: 0,
      maximum: 1,
      default: DEFAULT_MODULE_CONFIG.cellLineOpacity
    },
    beamEnabled: {
      type: 'boolean',
      title: '启用光柱',
      default: DEFAULT_MODULE_CONFIG.beamEnabled
    },
    beamColor: {
      type: 'string',
      format: 'color',
      title: '光柱颜色',
      default: DEFAULT_MODULE_CONFIG.beamColor ?? '#ffffff'
    },
    beamHeight: {
      type: 'number',
      title: '光柱高度',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.beamHeight
    },
    beamLength: {
      type: 'number',
      title: '光柱拖尾',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.beamLength
    },
    beamSpeed: {
      type: 'number',
      title: '光柱速度',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.beamSpeed
    },
    beamWidth: {
      type: 'number',
      title: '光柱粗细',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.beamWidth
    },
    beamConcurrent: {
      type: 'number',
      title: '光柱数量',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.beamConcurrent
    },
    beamOpacity: {
      type: 'number',
      title: '光柱透明度',
      minimum: 0,
      maximum: 1,
      default: DEFAULT_MODULE_CONFIG.beamOpacity
    }
  }
} satisfies ModuleStyleSchema

export default styleSchema
