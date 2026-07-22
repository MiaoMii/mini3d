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

  constructor(config: SceneConfig = {}) {
    this.config = {
      background: config.background ?? DEFAULT_SCENE_CONFIG.background
    }
    this.instance = new Scene()
    this.updateBackground()
  }

  start() {}

  update() {}

  updateConfig(config: Partial<SceneConfig>): void {
    Object.assign(this.config, config)

    if (config.background !== undefined) {
      this.updateBackground()
    }
  }

  get scene() {
    return this.instance
  }

  private updateBackground(): void {
    this.instance.background =
      this.config.background === null ? null : new Color(this.config.background)
  }
}
