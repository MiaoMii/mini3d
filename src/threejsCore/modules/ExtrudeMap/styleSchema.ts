import type { ModuleStyleSchema } from '../types'
import { DEFAULT_MODULE_CONFIG } from './config'
import { EASING_LABELS, EASING_OPTIONS } from '../styleSchema'
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
    mapJsonUrl: {
      type: 'string',
      title: '地图数据地址',
      default: DEFAULT_MODULE_CONFIG.mapJsonUrl,
      'ui:widget': CustomUpload,
      'ui:config': { accept: 'geojson' }
    },
    boundaryJsonUrl: {
      type: 'string',
      title: '边界数据地址',
      default: DEFAULT_MODULE_CONFIG.boundaryJsonUrl,
      'ui:widget': CustomUpload,
      'ui:config': { accept: 'geojson' }
    },
    depth: {
      type: 'number',
      title: '拉伸深度',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.depth
    },
    scale: {
      type: 'number',
      title: '地图缩放',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.scale
    },
    center: {
      type: 'array',
      title: '地图中心',
      minItems: 2,
      maxItems: 2,
      default: [...DEFAULT_MODULE_CONFIG.center],
      items: [
        { type: 'number', title: '经度' },
        { type: 'number', title: '纬度' }
      ]
    },
    position: {
      type: 'array',
      title: '位置',
      minItems: 3,
      maxItems: 3,
      default: [...DEFAULT_MODULE_CONFIG.position],
      items: [
        { type: 'number', title: 'X' },
        { type: 'number', title: 'Y' },
        { type: 'number', title: 'Z' }
      ]
    },
    rotation: {
      type: 'array',
      title: '旋转',
      minItems: 3,
      maxItems: 3,
      default: [...DEFAULT_MODULE_CONFIG.rotation],
      items: [
        { type: 'number', title: 'X' },
        { type: 'number', title: 'Y' },
        { type: 'number', title: 'Z' }
      ]
    },
    storkColor: {
      type: 'string',
      format: 'color',
      title: '描边颜色',
      default: DEFAULT_MODULE_CONFIG.storkColor
    },
    storkWidth: {
      type: 'number',
      title: '描边宽度',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.storkWidth
    },

    faceOpacity: {
      type: 'number',
      title: '表面透明度',
      minimum: 0,
      maximum: 1,
      default: DEFAULT_MODULE_CONFIG.faceOpacity
    },
    faceSideColor1: {
      type: 'string',
      format: 'color',
      title: '顶面渐变色一',
      default: DEFAULT_MODULE_CONFIG.faceSideColor1
    },
    faceSideColor2: {
      type: 'string',
      format: 'color',
      title: '顶面渐变色二',
      default: DEFAULT_MODULE_CONFIG.faceSideColor2
    },
    faceColor: {
      type: 'string',
      format: 'color',
      title: '顶面高亮颜色',
      default: DEFAULT_MODULE_CONFIG.faceColor
    },
    sideColorTop: {
      type: 'string',
      format: 'color',
      title: '侧面顶部颜色',
      default: DEFAULT_MODULE_CONFIG.sideColorTop
    },
    sideColorBottom: {
      type: 'string',
      format: 'color',
      title: '侧面底部颜色',
      default: DEFAULT_MODULE_CONFIG.sideColorBottom
    },
    sideScanColor: {
      type: 'string',
      format: 'color',
      title: '侧面扫光颜色',
      default: DEFAULT_MODULE_CONFIG.sideScanColor
    },
    faceMaterialUrl: {
      type: 'string',
      title: '表面贴图地址',
      default: DEFAULT_MODULE_CONFIG.faceMaterialUrl,
      'ui:widget': CustomUpload
    },
    faceMaterialOpacity: {
      type: 'string',
      title: '表面贴图透明度',
      default: DEFAULT_MODULE_CONFIG.faceMaterialOpacity
    },
    boundaryLineColor: {
      type: 'string',
      format: 'color',
      title: '边界线流光颜色',
      default: DEFAULT_MODULE_CONFIG.boundaryLineColor
    },
    boundaryLineWidth: {
      type: 'number',
      title: '边界线流光宽度',
      default: DEFAULT_MODULE_CONFIG.boundaryLineWidth
    },
    label: {
      type: 'object',
      title: '标签',
      default: {
        ...DEFAULT_MODULE_CONFIG.label,
        showList: [...(DEFAULT_MODULE_CONFIG.label.showList ?? [])],
        fontColor: DEFAULT_MODULE_CONFIG.label.fontColor ?? '#ffffff'
      },
      properties: {
        show: {
          type: 'boolean',
          title: '显示标签',
          default: DEFAULT_MODULE_CONFIG.label.show
        },
        showList: {
          type: 'array',
          title: '显示区域',
          default: [...(DEFAULT_MODULE_CONFIG.label.showList ?? [])],
          items: {
            type: 'string',
            title: '区域名称'
          }
        },
        fontSize: {
          type: 'number',
          title: '字体大小',
          minimum: 0,
          default: DEFAULT_MODULE_CONFIG.label.fontSize
        },
        scale: {
          type: 'number',
          title: '标签缩放',
          minimum: 0,
          default: DEFAULT_MODULE_CONFIG.label.scale
        },
        fontColor: {
          type: 'string',
          format: 'color',
          title: '字体颜色',
          default: DEFAULT_MODULE_CONFIG.label.fontColor ?? '#ffffff'
        },
        fontFamil: {
          type: 'string',
          title: '字体',
          default: DEFAULT_MODULE_CONFIG.label.fontFamil
        }
      }
    },
    renderOrder: {
      type: 'number',
      title: '渲染顺序',
      default: DEFAULT_MODULE_CONFIG.renderOrder
    },
    transitionDuration: {
      type: 'number',
      title: '过渡时长',
      minimum: 0,
      default: DEFAULT_MODULE_CONFIG.transitionDuration
    },
    transitionEase: {
      type: 'string',
      title: '过渡缓动',
      enum: EASING_OPTIONS,
      enumNames: EASING_LABELS,
      default: DEFAULT_MODULE_CONFIG.transitionEase
    },
    enterAnimation: {
      type: 'object',
      title: '进入动画',
      default: { ...DEFAULT_MODULE_CONFIG.enterAnimation },
      properties: {
        enabled: {
          type: 'boolean',
          title: '启用',
          default: DEFAULT_MODULE_CONFIG.enterAnimation.enabled
        },
        duration: {
          type: 'number',
          title: '时长',
          minimum: 0,
          default: DEFAULT_MODULE_CONFIG.enterAnimation.duration
        },
        ease: {
          type: 'string',
          title: '缓动',
          enum: EASING_OPTIONS,
          enumNames: EASING_LABELS,
          default: DEFAULT_MODULE_CONFIG.enterAnimation.ease
        },
        startScale: {
          type: 'number',
          title: '初始缩放',
          minimum: 0,
          default: DEFAULT_MODULE_CONFIG.enterAnimation.startScale
        },
        startOpacity: {
          type: 'number',
          title: '初始透明度',
          minimum: 0,
          maximum: 1,
          default: DEFAULT_MODULE_CONFIG.enterAnimation.startOpacity
        }
      }
    },
    leaveAnimation: {
      type: 'object',
      title: '离开动画',
      default: { ...DEFAULT_MODULE_CONFIG.leaveAnimation },
      properties: {
        enabled: {
          type: 'boolean',
          title: '启用',
          default: DEFAULT_MODULE_CONFIG.leaveAnimation.enabled
        },
        duration: {
          type: 'number',
          title: '时长',
          minimum: 0,
          default: DEFAULT_MODULE_CONFIG.leaveAnimation.duration
        },
        ease: {
          type: 'string',
          title: '缓动',
          enum: EASING_OPTIONS,
          enumNames: EASING_LABELS,
          default: DEFAULT_MODULE_CONFIG.leaveAnimation.ease
        },
        endScale: {
          type: 'number',
          title: '结束缩放',
          minimum: 0,
          default: DEFAULT_MODULE_CONFIG.leaveAnimation.endScale
        },
        endOpacity: {
          type: 'number',
          title: '结束透明度',
          minimum: 0,
          maximum: 1,
          default: DEFAULT_MODULE_CONFIG.leaveAnimation.endOpacity
        }
      }
    }
  }
} satisfies ModuleStyleSchema

export default styleSchema
