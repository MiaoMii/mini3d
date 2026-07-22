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
    visible: {
      type: 'boolean',
      title: '显示',
      default: DEFAULT_MODULE_CONFIG.visible
    },
    size: {
      type: 'number',
      title: '尺寸',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.size
    },
    xAxisColor: {
      type: 'string',
      format: 'color',
      title: 'x轴颜色',
      default: DEFAULT_MODULE_CONFIG.xAxisColor
    },
    yAxisColor: {
      type: 'string',
      format: 'color',
      title: 'y轴颜色',
      default: DEFAULT_MODULE_CONFIG.yAxisColor
    },
    zAxisColor: {
      type: 'string',
      format: 'color',
      title: 'z轴颜色',
      default: DEFAULT_MODULE_CONFIG.zAxisColor
    },
    renderOrder: {
      type: 'number',
      title: '渲染顺序',
      default: DEFAULT_MODULE_CONFIG.renderOrder
    }
  }
} satisfies ModuleStyleSchema

export default styleSchema
