import type { ModuleStyleSchema } from '../types'
import { DEFAULT_MODULE_CONFIG } from './config'
import CustomUpload from '@/components/StyleCustom/CustomUpload.vue'
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
    imageUrl: {
      type: 'string',
      title: '图片上传',
      default: DEFAULT_MODULE_CONFIG.imageUrl,
      'ui:widget': CustomUpload,
      'ui:config': { accept: 'png,jpg' }
    },
    size: {
      type: 'array',
      title: '尺寸',
      minItems: 2,
      maxItems: 2,
      default: [...DEFAULT_MODULE_CONFIG.size],
      items: [
        { type: 'number', title: 'W' },
        { type: 'number', title: 'H' },
      ]
    },
    position: {
      type: 'array',
      title: '位置偏移',
      minItems: 3,
      maxItems: 3,
      default: [...DEFAULT_MODULE_CONFIG.position],
      items: [
        { type: 'number', title: 'X' },
        { type: 'number', title: 'Y' },
        { type: 'number', title: 'Z' }
      ]
    },
    color: {
      type: 'string',
      format: 'color',
      title: '颜色',
      default: DEFAULT_MODULE_CONFIG.color
    },
    opacity: {
      type: 'number',
      title: '透明度',
      minimum: 0,
      maximum: 1,
      default: DEFAULT_MODULE_CONFIG.opacity
    },
    rotateSpeed: {
      type: 'number',
      title: '旋转速度',
      minimum: -10,
      maximum: 10,
      default: DEFAULT_MODULE_CONFIG.rotateSpeed
    },
  }
} satisfies ModuleStyleSchema

export default styleSchema
