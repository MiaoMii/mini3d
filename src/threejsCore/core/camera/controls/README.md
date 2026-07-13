# ControlsModule 使用示例

`ControlsModule` 基于 Three.js `OrbitControls`，负责相机交互、视角设置和飞行动画。

以下示例通过 `Engins.ctx.controlsModule` 访问控制器。向量参数支持三种格式：

```ts
;[x, y, z]
new Vector3(x, y, z)
{
  x, y, z
}
```

## 创建引擎

控制器是引擎内建模块，会自动接收 `start`、`update` 和 `destroy` 等生命周期调用。

```ts
import { Engins } from './core'

const canvas = document.querySelector('canvas')!

const engine = new Engins({
  canvas,
  camera: {
    position: [100, 80, 100],
    target: [0, 0, 0]
  },
  controls: {
    enableDamping: true,
    dampingFactor: 0.05,
    minDistance: 10,
    maxDistance: 2000,
    enablePan: true,
    enableRotate: true,
    flightDuration: 2,
    worldUp: [0, 1, 0]
  }
})

await engine.start()
```

后续示例中的 `controls` 指向同一个控制器实例：

```ts
const controls = engine.ctx.controlsModule
```

## 立即设置相机视角

`setView()` 会取消当前飞行动画并立即更新相机。

```ts
controls.setView({
  destination: [200, 120, 200],
  target: [0, 0, 0]
})
```

也可以指定观察方向和相机上方向：

```ts
controls.setView({
  destination: [200, 120, 200],
  orientation: {
    direction: [-1, -0.5, -1],
    up: [0, 1, 0],
    range: 300
  }
})
```

## 飞行到指定位置

```ts
controls.flyTo({
  destination: [300, 180, 300],
  target: [0, 0, 0],
  duration: 2.5,
  maximumHeight: 500,
  complete: () => {
    console.log('相机飞行完成')
  },
  cancel: () => {
    console.log('相机飞行已取消')
  }
})
```

用户开始操作控制器时，当前飞行动画会自动取消。

## 使用方位角、俯仰角和翻滚角

角度单位为弧度：

- `heading`：水平方向角
- `pitch`：俯仰角
- `roll`：相机翻滚角
- `range`：相机到观察目标的距离

```ts
controls.flyTo({
  destination: [100, 100, 100],
  duration: 2,
  orientation: {
    heading: Math.PI / 4,
    pitch: -Math.PI / 6,
    roll: 0,
    range: 200
  }
})
```

## 从指定角度观察目标

`lookAt()` 会根据目标、角度和距离计算相机位置，并立即设置视角。

```ts
controls.lookAt([0, 30, 0], {
  heading: Math.PI / 4,
  pitch: -Math.PI / 4,
  range: 300
})
```

## 飞行到模型包围球

这个方法适合在模型加载完成后自动聚焦模型。

```ts
import { Box3, Sphere } from 'three'

const boundingSphere = new Box3().setFromObject(model).getBoundingSphere(new Sphere())

controls.flyToBoundingSphere(
  {
    center: boundingSphere.center,
    radius: boundingSphere.radius
  },
  {
    duration: 2,
    offset: {
      heading: Math.PI / 4,
      pitch: -Math.PI / 6
    },
    complete: () => {
      console.log('模型已聚焦')
    }
  }
)
```

不传 `offset.range` 时，控制器会根据相机视场角和包围球半径计算观察距离。

## 动态修改控制参数

```ts
controls.updateConfig({
  autoRotate: true,
  autoRotateSpeed: 1,
  enablePan: false,
  minDistance: 20,
  maxDistance: 1000
})
```

关闭自动旋转：

```ts
controls.updateConfig({
  autoRotate: false
})
```

## 控制飞行动画

取消当前飞行：

```ts
if (controls.isFlying) {
  controls.cancelFlight()
}
```

立即到达终点并调用 `complete` 回调：

```ts
controls.completeFlight()
```

## 访问 OrbitControls

通过 `instance` 可以访问原生 `OrbitControls`：

```ts
const orbitControls = controls.instance

if (orbitControls) {
  orbitControls.saveState()
  orbitControls.reset()
}
```

读取当前观察目标：

```ts
const target = controls.target
console.log(target.x, target.y, target.z)
```

## 停止和销毁引擎

通过引擎结束所有已注册模块的生命周期：

```ts
await engine.stop()
await engine.destroy()
```

| 配置项                         | 中文说明                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `enabled?: boolean`            | 是否启用控制器。设为 `false` 后用户无法进行任何交互操作。                                                       |
| `enableDamping?: boolean`      | 是否启用阻尼（惯性）效果。开启后相机移动会更加平滑，需要在动画循环中调用 `update()`。                           |
| `dampingFactor?: number`       | 阻尼系数，值越大停止越快，值越小惯性越明显。                                                                    |
| `autoRotate?: boolean`         | 是否自动围绕目标点旋转。                                                                                        |
| `autoRotateSpeed?: number`     | 自动旋转速度。                                                                                                  |
| `enableZoom?: boolean`         | 是否允许缩放。                                                                                                  |
| `zoomSpeed?: number`           | 缩放速度。                                                                                                      |
| `minDistance?: number`         | 透视相机距离目标点的最小距离。防止过度拉近。                                                                    |
| `maxDistance?: number`         | 透视相机距离目标点的最大距离。防止过度拉远。                                                                    |
| `minZoom?: number`             | 正交相机最小缩放值。                                                                                            |
| `maxZoom?: number`             | 正交相机最大缩放值。                                                                                            |
| `zoomToCursor?: boolean`       | 缩放时是否以鼠标光标位置为中心，而不是以目标点为中心。                                                          |
| `enablePan?: boolean`          | 是否允许平移（拖动画面）。                                                                                      |
| `panSpeed?: number`            | 平移速度。                                                                                                      |
| `screenSpacePanning?: boolean` | 是否按屏幕坐标系平移。`true` 表示沿屏幕 XY 平移；`false` 表示沿世界空间方向平移。                               |
| `enableRotate?: boolean`       | 是否允许旋转视角。                                                                                              |
| `rotateSpeed?: number`         | 旋转速度。                                                                                                      |
| `minPolarAngle?: number`       | 最小垂直极角（弧度）。限制向上/向下旋转范围。`0` 表示正上方。                                                   |
| `maxPolarAngle?: number`       | 最大垂直极角（弧度）。`Math.PI` 表示正下方。                                                                    |
| `minAzimuthAngle?: number`     | 最小水平方位角（弧度）。限制左右旋转范围。                                                                      |
| `maxAzimuthAngle?: number`     | 最大水平方位角（弧度）。限制左右旋转范围。                                                                      |
| `flightDuration?: number`      | 相机飞行动画持续时间（通常用于 `CameraControls` 的 `fitToBox()`、`setLookAt()` 等平滑过渡操作），单位一般为秒。 |
| `worldUp?: Vector3Value`       | 世界坐标系的上方向向量。默认通常为 `(0, 1, 0)`，即 Y 轴朝上。                                                   |
