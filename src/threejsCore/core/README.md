-- `Engine.ts` 总入口，组装 `scene/camera/renderer/loop/context/modules/resize`

-- `Renderde.ts` 唯一 `WebGLRenderer`

-- `Loop.ts` 渲染模式

-- `EventBus.ts` 类型化事件总线

-- `ModuleManager.ts` 模块注册、排序、生命周期

-- `Context.ts` `EngineContext` 依赖注入容器

-- `Resize.ts` 尺寸监听、像素比、广播

-- `types.ts` 类型

-- `config.ts` `CoreConfig/AppConfig`

-- `index.ts` 统一导出

## 组件发送事件，模块接收事件

公共业务事件通过 `engineEvents`、`engine.events` 和 `context.events` 传递，这三个入口使用同一个事件实例。

```text
Vue 组件
  → engineEvents.emit()
  → 公共 EventBus
  → context.events.on()
  → Three.js 模块
```

### 1. 定义事件类型

事件类型需要由发送方和接收方共同引用，避免两边分别维护事件名称和载荷结构。

```ts
// modules/ExtrudeMap/events.ts
export interface ExtrudeMapEvents {
  'extrude-map:focus-region': {
    regionName: string
    duration?: number
  }
}
```

事件名称使用 `领域:动作`，事件载荷使用对象，方便后续增加字段。

### 2. Vue 组件发送事件

组件不需要获取 `Engins` 实例，直接导入公共事件入口。

```vue
<script setup lang="ts">
import { engineEvents } from '@/views/Projects/mapScene3D/threejsCore/core'
import type { ExtrudeMapEvents } from '@/views/Projects/mapScene3D/threejsCore/modules/ExtrudeMap/events'

const events = engineEvents.withTypes<ExtrudeMapEvents>()

function focusBeijing(): void {
  events.emit('extrude-map:focus-region', {
    regionName: '北京市',
    duration: 1.2
  })
}
</script>

<template>
  <button type="button" @click="focusBeijing">
    定位北京
  </button>
</template>
```

### 3. 模块接收事件

模块通过初始化方法中的 `context.events` 订阅。以下代码需要合并到模块已有的 `init()` 和 `destroy()` 中，不要重复声明生命周期方法。

```ts
import type { EngineContext, Unsubscribe } from '../../core'
import type { ExtrudeMapEvents } from './events'

export class ExtrudeMapModule {
  readonly id = 'extrude-map'

  private unsubscribeFocusRegion: Unsubscribe | null = null

  init(context: EngineContext): void {
    const events = context.events.withTypes<ExtrudeMapEvents>()

    this.unsubscribeFocusRegion = events.on(
      'extrude-map:focus-region',
      ({ regionName, duration }) => {
        this.focusRegion(regionName, duration ?? 1)
      }
    )

    // 继续执行模块原有的初始化逻辑。
  }

  destroy(context: EngineContext): void {
    this.unsubscribeFocusRegion?.()
    this.unsubscribeFocusRegion = null

    // 继续执行模块原有的资源释放逻辑。
  }

  private focusRegion(regionName: string, duration: number): void {
    console.log('模块接收到区域定位事件：', regionName, duration)

    // 在这里执行区域高亮、相机定位等业务逻辑。
  }
}
```

### 4. 使用要求

- `withTypes()` 只增加 TypeScript 类型约束，不会创建新的事件实例。
- `on()` 和 `once()` 返回取消订阅函数。
- 模块必须在 `destroy()` 中取消订阅，避免模块重建后重复接收事件。
- 组件如果订阅事件，也必须在 `onBeforeUnmount()` 中取消订阅。
- 公共业务事件使用 `engineEvents` 或 `context.events`。
- `context.eventsBus` 仅供渲染循环、尺寸变化等内部事件使用。
