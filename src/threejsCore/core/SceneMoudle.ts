import type { IModule } from './index'
import { Scene, Color } from 'three'
import { DEFAULT_SCENE_CONFIG } from './config'
import type { SceneConfig } from './config'

export class SceneMoudle implements IModule<SceneConfig> {
  readonly id = 'scene'
  readonly name: string = 'scene'
  readonly order = -1000
  readonly config: Required<SceneConfig>
  private readonly instance: Scene

  /**
   * 创建场景模块实例。
   */
  constructor(config: SceneConfig = {}) {
    this.config = {
      background: config.background ?? DEFAULT_SCENE_CONFIG.background
    }
    this.instance = new Scene()
    this.updateBackground()
  }

  /**
   * 启动场景模块。
   */
  start() {}

  /**
   * 执行场景模块的帧更新钩子。
   */
  update() {}

  /**
   * 应用场景模块的配置变更。
   */
  updateConfig(config: Partial<SceneConfig>): void {
    Object.assign(this.config, config)

    if (config.background !== undefined) {
      this.updateBackground()
    }
  }

  /**
   * 获取 Three.js 场景实例。
   */
  get scene() {
    return this.instance
  }

  /**
   * 根据场景配置更新背景颜色。
   */
  private updateBackground(): void {
    this.instance.background =
      this.config.background === null ? null : new Color(this.config.background)
  }
}
