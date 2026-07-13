import type { IModule } from './index'
import { Scene, Color, Texture, CubeTexture } from 'three'

export class SceneMoudle implements IModule {
  readonly id = 'scene'
  readonly name: string = 'scene'
  private readonly instance: Scene
  constructor() {
    this.instance = new Scene()
  }

  start() {}

  update() {}

  setBackground(background: Color | Texture | CubeTexture | null = null) {
    this.instance.background = background
  }

  get scene() {
    return this.instance
  }
}
