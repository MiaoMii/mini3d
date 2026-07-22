import type { Engins } from '../core'
import { DEFAULT_SCENE_CONFIG } from '../core/config'
import type { SceneConfig } from '../core/config'
import { DEFAULT_CAMERA_CONFIG } from '../core/camera/config'
import type { CameraConfig } from '../core/camera/config'
import { DEFAULT_CONTROLS_CONFIG } from '../core/camera/controls/config'
import type { ControlsConfig } from '../core/camera/controls/config'
import type { ModuleStyleSchema } from './types'

export interface SceneCoreDefinition {
  id: string
  type: string
  label: string
  styleSchema: ModuleStyleSchema
  getConfig: (engine: Engins) => object
  updateConfig: (engine: Engins, config: object) => void | Promise<void>
}

const VECTOR3_ITEMS = [
  { type: 'number', title: 'X' },
  { type: 'number', title: 'Y' },
  { type: 'number', title: 'Z' }
]

const sceneStyleSchema = {
  type: 'object',
  properties: {
    background: {
      type: 'string',
      format: 'color',
      title: '背景颜色',
      default: DEFAULT_SCENE_CONFIG.background
    }
  }
} satisfies ModuleStyleSchema

const cameraStyleSchema = {
  type: 'object',
  properties: {
    mod: {
      type: 'string',
      title: '相机模式',
      enum: ['perspective', 'orthographic'],
      enumNames: ['透视相机', '正交相机'],
      default: DEFAULT_CAMERA_CONFIG.mod
    },
    fov: {
      type: 'number',
      title: '视野角度',
      minimum: 1,
      maximum: 179,
      default: DEFAULT_CAMERA_CONFIG.fov
    },
    near: {
      type: 'number',
      title: '近裁剪面',
      minimum: 0.001,
      default: DEFAULT_CAMERA_CONFIG.near
    },
    far: {
      type: 'number',
      title: '远裁剪面',
      minimum: 0.01,
      default: DEFAULT_CAMERA_CONFIG.far
    },
    position: {
      type: 'array',
      title: '相机位置',
      minItems: 3,
      maxItems: 3,
      default: [10, 10, 10],
      items: VECTOR3_ITEMS
    },
    target: {
      type: 'array',
      title: '观察目标',
      minItems: 3,
      maxItems: 3,
      default: [0, 0, 0],
      items: VECTOR3_ITEMS
    }
  }
} satisfies ModuleStyleSchema

const controlsStyleSchema = {
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean',
      title: '启用控制器',
      default: DEFAULT_CONTROLS_CONFIG.enabled
    },
    enableDamping: {
      type: 'boolean',
      title: '启用阻尼',
      default: DEFAULT_CONTROLS_CONFIG.enableDamping
    },
    dampingFactor: {
      type: 'number',
      title: '阻尼系数',
      minimum: 0,
      maximum: 1,
      default: DEFAULT_CONTROLS_CONFIG.dampingFactor
    },
    autoRotate: {
      type: 'boolean',
      title: '自动旋转',
      default: DEFAULT_CONTROLS_CONFIG.autoRotate
    },
    autoRotateSpeed: {
      type: 'number',
      title: '自动旋转速度',
      default: DEFAULT_CONTROLS_CONFIG.autoRotateSpeed
    },
    enableZoom: {
      type: 'boolean',
      title: '允许缩放',
      default: DEFAULT_CONTROLS_CONFIG.enableZoom
    },
    zoomSpeed: {
      type: 'number',
      title: '缩放速度',
      minimum: 0,
      default: DEFAULT_CONTROLS_CONFIG.zoomSpeed
    },
    minDistance: {
      type: 'number',
      title: '最小距离',
      minimum: 0,
      default: DEFAULT_CONTROLS_CONFIG.minDistance
    },
    maxDistance: {
      type: 'number',
      title: '最大距离',
      minimum: 0,
      default: DEFAULT_CONTROLS_CONFIG.maxDistance
    },
    zoomToCursor: {
      type: 'boolean',
      title: '缩放至光标',
      default: DEFAULT_CONTROLS_CONFIG.zoomToCursor
    },
    enablePan: {
      type: 'boolean',
      title: '允许平移',
      default: DEFAULT_CONTROLS_CONFIG.enablePan
    },
    panSpeed: {
      type: 'number',
      title: '平移速度',
      minimum: 0,
      default: DEFAULT_CONTROLS_CONFIG.panSpeed
    },
    screenSpacePanning: {
      type: 'boolean',
      title: '屏幕空间平移',
      default: DEFAULT_CONTROLS_CONFIG.screenSpacePanning
    },
    enableRotate: {
      type: 'boolean',
      title: '允许旋转',
      default: DEFAULT_CONTROLS_CONFIG.enableRotate
    },
    rotateSpeed: {
      type: 'number',
      title: '旋转速度',
      minimum: 0,
      default: DEFAULT_CONTROLS_CONFIG.rotateSpeed
    },
    minPolarAngle: {
      type: 'number',
      title: '最小垂直角',
      minimum: 0,
      maximum: Math.PI,
      default: DEFAULT_CONTROLS_CONFIG.minPolarAngle
    },
    maxPolarAngle: {
      type: 'number',
      title: '最大垂直角',
      minimum: 0,
      maximum: Math.PI,
      default: DEFAULT_CONTROLS_CONFIG.maxPolarAngle
    },
    flightDuration: {
      type: 'number',
      title: '飞行时长',
      minimum: 0,
      default: DEFAULT_CONTROLS_CONFIG.flightDuration
    },
    worldUp: {
      type: 'array',
      title: '世界向上方向',
      minItems: 3,
      maxItems: 3,
      default: [0, 1, 0],
      items: VECTOR3_ITEMS
    }
  }
} satisfies ModuleStyleSchema

export const sceneCoreDefinitions: readonly SceneCoreDefinition[] = [
  {
    id: 'scene',
    type: 'scene',
    label: '场景',
    styleSchema: sceneStyleSchema,
    getConfig: (engine) => engine.ctx.sceneModule.config,
    updateConfig: (engine, config) => {
      engine.ctx.sceneModule.updateConfig(config as Partial<SceneConfig>)
    }
  },
  {
    id: 'camera',
    type: 'camera',
    label: '相机',
    styleSchema: cameraStyleSchema,
    getConfig: (engine) => engine.ctx.cameraModule.config,
    updateConfig: (engine, config) => {
      const cameraConfig = config as Partial<CameraConfig>

      engine.ctx.cameraModule.updateConfig(cameraConfig)

      if (cameraConfig.position !== undefined || cameraConfig.target !== undefined) {
        engine.ctx.controlsModule.setView({
          destination: engine.ctx.cameraModule.config.position,
          target: engine.ctx.cameraModule.config.target
        })
      }
    }
  },
  {
    id: 'controls',
    type: 'controls',
    label: '控制器',
    styleSchema: controlsStyleSchema,
    getConfig: (engine) => engine.ctx.controlsModule.config,
    updateConfig: (engine, config) => {
      engine.ctx.controlsModule.updateConfig(config as Partial<ControlsConfig>)
    }
  }
]

export function findSceneCoreDefinition(idOrType: string): SceneCoreDefinition | undefined {
  return sceneCoreDefinitions.find(
    (definition) => definition.id === idOrType || definition.type === idOrType
  )
}
