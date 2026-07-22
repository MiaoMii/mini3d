import type { ModuleStyleSchema } from '../types'
import { DEFAULT_CUBE_MODULE_CONFIG } from './config'
import { EASING_LABELS, EASING_OPTIONS } from '../styleSchema'

export const styleSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: '名称',
      default: DEFAULT_CUBE_MODULE_CONFIG.name
    },
    visible: {
      type: 'boolean',
      title: '显示',
      default: DEFAULT_CUBE_MODULE_CONFIG.visible
    },
    size: {
      type: 'number',
      title: '尺寸',
      minimum: 0,
      default: DEFAULT_CUBE_MODULE_CONFIG.size
    },
    color: {
      type: 'string',
      format: 'color',
      title: '颜色',
      default: DEFAULT_CUBE_MODULE_CONFIG.color
    },
    position: {
      type: 'array',
      title: '位置',
      minItems: 3,
      maxItems: 3,
      default: [...DEFAULT_CUBE_MODULE_CONFIG.position],
      items: [
        { type: 'number', title: 'X' },
        { type: 'number', title: 'Y' },
        { type: 'number', title: 'Z' }
      ]
    },
    rotateSpeed: {
      type: 'array',
      title: '旋转速度',
      minItems: 3,
      maxItems: 3,
      default: [...DEFAULT_CUBE_MODULE_CONFIG.rotateSpeed],
      items: [
        { type: 'number', title: 'X' },
        { type: 'number', title: 'Y' },
        { type: 'number', title: 'Z' }
      ]
    },
    renderOrder: {
      type: 'number',
      title: '渲染顺序',
      default: DEFAULT_CUBE_MODULE_CONFIG.renderOrder
    },
    transitionDuration: {
      type: 'number',
      title: '过渡时长',
      minimum: 0,
      default: DEFAULT_CUBE_MODULE_CONFIG.transitionDuration
    },
    transitionEase: {
      type: 'string',
      title: '过渡缓动',
      enum: EASING_OPTIONS,
      enumNames: EASING_LABELS,
      default: DEFAULT_CUBE_MODULE_CONFIG.transitionEase
    },
    enterAnimation: {
      type: 'object',
      title: '进入动画',
      default: { ...DEFAULT_CUBE_MODULE_CONFIG.enterAnimation },
      properties: {
        enabled: {
          type: 'boolean',
          title: '启用',
          default: DEFAULT_CUBE_MODULE_CONFIG.enterAnimation.enabled
        },
        duration: {
          type: 'number',
          title: '时长',
          minimum: 0,
          default: DEFAULT_CUBE_MODULE_CONFIG.enterAnimation.duration
        },
        ease: {
          type: 'string',
          title: '缓动',
          enum: EASING_OPTIONS,
          enumNames: EASING_LABELS,
          default: DEFAULT_CUBE_MODULE_CONFIG.enterAnimation.ease
        },
        startScale: {
          type: 'number',
          title: '初始缩放',
          minimum: 0,
          default: DEFAULT_CUBE_MODULE_CONFIG.enterAnimation.startScale
        },
        startOpacity: {
          type: 'number',
          title: '初始透明度',
          minimum: 0,
          maximum: 1,
          default: DEFAULT_CUBE_MODULE_CONFIG.enterAnimation.startOpacity
        }
      }
    },
    leaveAnimation: {
      type: 'object',
      title: '离开动画',
      default: { ...DEFAULT_CUBE_MODULE_CONFIG.leaveAnimation },
      properties: {
        enabled: {
          type: 'boolean',
          title: '启用',
          default: DEFAULT_CUBE_MODULE_CONFIG.leaveAnimation.enabled
        },
        duration: {
          type: 'number',
          title: '时长',
          minimum: 0,
          default: DEFAULT_CUBE_MODULE_CONFIG.leaveAnimation.duration
        },
        ease: {
          type: 'string',
          title: '缓动',
          enum: EASING_OPTIONS,
          enumNames: EASING_LABELS,
          default: DEFAULT_CUBE_MODULE_CONFIG.leaveAnimation.ease
        },
        endScale: {
          type: 'number',
          title: '结束缩放',
          minimum: 0,
          default: DEFAULT_CUBE_MODULE_CONFIG.leaveAnimation.endScale
        },
        endOpacity: {
          type: 'number',
          title: '结束透明度',
          minimum: 0,
          maximum: 1,
          default: DEFAULT_CUBE_MODULE_CONFIG.leaveAnimation.endOpacity
        }
      }
    }
  }
} satisfies ModuleStyleSchema

export default styleSchema
