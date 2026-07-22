import type { Object3D } from 'three'

interface Object3DProperties {
  name: string
  visible: boolean
  renderOrder: number
}

export function syncObject3DProperties(instance: Object3D, config: Object3DProperties): void {
  instance.name = config.name
  instance.visible = config.visible
  instance.renderOrder = config.renderOrder
}
