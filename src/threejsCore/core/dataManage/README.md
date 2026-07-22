你是一名资深 TypeScript、Three.js 和前端架构工程师。

请基于当前项目现有代码实现一套数据管理系统。

不要大规模重写已有架构，先分析当前项目的目录结构、Engine、Context、ModuleManager、模块生命周期、现有数据相关代码以及现有请求工具，然后进行增量式实现。

==================================================
一、项目背景
==================================================

当前项目是一个基于 Three.js 的可视化引擎架构。

现有核心结构包含：

- Engine
- Context
- Scene
- Renderer
- Camera
- Loop
- EventBus
- Resize
- ModuleManager
- Module

现在需要增加数据系统。

核心设计原则：

DataSource
↓
可视化数据操作面板 / 数据源控制器
↓
DataManager
↓
统一管理数据
↓
DataStore
↓
保存数据并通知订阅者
↓
Module
↓
通过 dataId 绑定数据
↓
onDataChange(data)

==================================================
二、核心要求
==================================================

模块通过 dataId 与数据建立关联关系。

DataSource 不是底层 API 请求类，也不是简单的 fetch 封装。

DataSource 是一个可视化的数据操作面板 / 数据源控制器。

它用于：

- 配置数据
- 配置数据类型
- 配置 API 地址
- 配置请求参数
- 配置轮询
- 手动请求
- 修改参数
- 重新请求
- 查看数据状态
- 查看请求状态
- 查看错误状态
- 查看当前数据

模块不直接请求 API。

模块只通过 dataId 订阅数据。

数据发生变化后，自动通知所有绑定该 dataId 的模块。

==================================================
三、ID 设计要求
==================================================

系统中所有实体 ID 必须使用 UUID。

包括：

- Module ID
- DataSource ID
- DataStore ID
- Data ID

禁止使用业务名称作为 ID。

禁止：

'map-data'
'ring-data'
'label-data'
'map-module'

必须使用 UUID。

例如：

'550e8400-e29b-41d4-a716-446655440000'

优先使用：

crypto.randomUUID()

如果项目已经存在 UUID 工具，则优先复用项目已有工具。

UUID 只作为唯一标识，不承担业务含义。

如果需要业务名称，单独使用：

- name
- label
- title

例如：

{
id: crypto.randomUUID(),
name: '地图数据'
}

不要把业务名称直接作为 ID。

==================================================
四、核心数据关系
==================================================

DataSource、DataStore、Module 是独立实体。

它们通过 dataId 建立关联。

关系如下：

DataSource
│
│ dataId: UUID
▼
DataStore
│
│ dataId: UUID
▼
Module
│
│ dataId: UUID
▼
onDataChange(data)

例如：

DataSource：

{
id: UUID,
name: '地图数据源',
dataId: UUID
}

DataStore：

{
id: UUID,
dataId: UUID,
data: ...
}

Module：

{
id: UUID,
name: '地图模块',
dataId: UUID
}

其中：

DataSource.dataId === DataStore.dataId === Module.dataId

同一个 dataId 可以被多个模块绑定。

例如：

DataSource
│
▼
DataStore
│
│ dataId = UUID
├───────────────┐
▼ ▼
MapModule RingModule

当数据发生变化时：

MapModule.onDataChange(data)

RingModule.onDataChange(data)

==================================================
五、DataManager
==================================================

DataManager 是统一的数据管理中心。

负责：

- 注册数据
- 删除数据
- 获取数据
- 更新数据
- 更新请求参数
- 订阅数据变化
- 取消订阅
- 管理 DataStore
- 管理 DataSource
- 管理轮询
- 管理请求状态

推荐 API：

dataManager.register(dataId, config)

dataManager.get(dataId)

dataManager.set(dataId, data)

dataManager.updateParams(dataId, params)

dataManager.subscribe(dataId, listener)

dataManager.unsubscribe(dataId, listener)

dataManager.remove(dataId)

dataManager.request(dataId)

dataManager.startPolling(dataId)

dataManager.stopPolling(dataId)

注意：

dataId 必须是 UUID。

例如：

const dataId = crypto.randomUUID()

dataManager.register(dataId, {
type: 'api',
url: '/api/map'
})

==================================================
六、DataStore
==================================================

每个数据资源对应一个 DataStore。

建议结构：

interface DataStore<T = unknown> {
id: string
dataId: string
data?: T
status: 'idle' | 'loading' | 'success' | 'error'
error?: Error
updatedAt?: number
}

要求：

- id 使用 UUID
- dataId 使用 UUID
- data 保存当前数据
- status 保存当前数据状态
- error 保存错误
- updatedAt 保存更新时间

DataStore 支持：

get()

set(data)

subscribe(listener)

unsubscribe(listener)

updateParams(params)

当执行：

dataStore.set(data)

必须：

1. 更新数据
2. 更新状态
3. 更新更新时间
4. 通知所有订阅者

==================================================
七、DataSource
==================================================

DataSource 是一个可视化的数据操作面板 / 数据源控制器。

DataSource 至少包含：

interface DataSourceConfig {
id: string
dataId: string
name?: string
type: 'static' | 'api'
}

id 必须使用 UUID。

dataId 必须使用 UUID。

API 类型数据示例：

{
id: crypto.randomUUID(),
dataId: crypto.randomUUID(),
name: '地图数据源',
type: 'api',
url: '/api/map',
method: 'GET',
params: {
city: 'beijing'
},
polling: 5000
}

DataSource 需要支持：

- 手动请求
- 修改参数
- 重新请求
- 开启轮询
- 停止轮询
- 获取当前数据
- 获取当前状态
- 获取错误信息

==================================================
八、API 数据
==================================================

支持 API 数据。

例如：

const dataId = crypto.randomUUID()

dataManager.register(dataId, {
type: 'api',
url: '/api/map',
method: 'GET',
params: {
city: 'beijing'
},
polling: 5000
})

要求：

1. 支持手动请求
2. 支持轮询
3. 支持停止轮询
4. 支持修改请求参数
5. 修改参数后自动重新请求
6. 请求成功后更新 DataStore
7. 数据变化后通知所有订阅模块
8. 请求失败时更新 error
9. 请求状态正确更新
10. 避免请求竞态

==================================================
九、参数修改
==================================================

支持通过 dataId 修改请求参数：

dataManager.updateParams(dataId, {
city: 'shanghai'
})

dataId 必须是 UUID。

参数支持部分更新。

例如原参数：

{
city: 'beijing',
type: 'all'
}

调用：

dataManager.updateParams(dataId, {
city: 'shanghai'
})

最终参数：

{
city: 'shanghai',
type: 'all'
}

参数变化后必须：

1. 更新参数
2. 取消或忽略旧请求
3. 重新请求 API
4. 更新 DataStore
5. 通知所有订阅者

==================================================
十、轮询
==================================================

API 数据支持轮询：

startPolling(dataId)

stopPolling(dataId)

要求：

- 不重复创建定时器
- 同一个 dataId 只能存在一个轮询任务
- 参数变化后不能产生多个轮询任务
- DataStore 销毁时停止轮询
- DataManager 删除 dataId 时停止轮询
- DataSource 销毁时停止轮询
- 请求失败后轮询仍然可以继续
- 支持手动停止轮询

==================================================
十一、请求竞态
==================================================

必须处理请求竞态。

场景：

请求 A 发出

请求 B 发出

请求 B 先返回

请求 A 后返回

不能让请求 A 的旧数据覆盖请求 B 的新数据。

请使用合理机制处理，例如：

- requestId
- AbortController
- 其他请求竞态控制机制

优先复用项目已有的请求工具。

==================================================
十二、静态数据
==================================================

支持静态数据。

例如：

const dataId = crypto.randomUUID()

dataManager.register(dataId, {
type: 'static',
data: {
theme: 'dark',
scale: 1
}
})

静态数据必须支持：

dataManager.get(dataId)

dataManager.set(dataId, data)

dataManager.subscribe(dataId, listener)

静态数据变化后同样需要通知绑定的模块。

==================================================
十三、模块绑定 dataId
==================================================

模块通过 dataId 绑定数据。

例如：

const dataId = crypto.randomUUID()

moduleManager.register({
id: crypto.randomUUID(),
name: '地图模块',
type: 'map',
dataId
})

模块初始化时：

1. 获取 dataId
2. 订阅 dataId
3. 如果当前已经有数据，立即执行 onDataChange(data)
4. 后续数据变化时执行 onDataChange(data)
5. 模块销毁时取消订阅

示例：

class MapModule {
private unsubscribe?: () => void

init(context) {
this.unsubscribe = context.data.subscribe(
this.dataId,
(data) => {
this.onDataChange(data)
}
)
}

onDataChange(data) {
// 根据最新数据更新 Three.js 对象
}

destroy() {
this.unsubscribe?.()
}
}

要求：

- 模块销毁后不能继续收到数据更新
- 避免内存泄漏
- 多个模块可以绑定同一个 dataId

==================================================
十四、模块职责
==================================================

Module 负责：

- 创建 Three.js 对象
- 使用数据
- 更新 Three.js 对象
- 销毁自身资源

Module 不负责：

- fetch
- API 请求
- 轮询
- API 参数管理
- 数据缓存
- 数据源管理

==================================================
十五、DataSource 职责
==================================================

DataSource 负责：

- 可视化数据配置
- 配置 API
- 配置请求参数
- 配置轮询
- 手动请求
- 修改请求参数
- 重新请求
- 查看数据状态
- 查看请求状态
- 查看错误
- 查看数据预览

==================================================
十六、DataManager 职责
==================================================

DataManager 负责：

- 管理所有 dataId
- 管理 DataStore
- 管理 DataSource
- 管理订阅关系
- 管理轮询
- 管理请求
- 通知数据变化

==================================================
十七、Context 集成
==================================================

将 DataManager 集成到 Context。

最终可以：

context.data

例如：

context.data.register(...)

context.data.get(...)

context.data.set(...)

context.data.subscribe(...)

context.data.updateParams(...)

context.data.request(...)

context.data.startPolling(...)

context.data.stopPolling(...)

模块通过：

this.context.data

访问数据。

==================================================
十八、ModuleManager 集成
==================================================

模块通过 dataId 绑定数据。

dataId 必须是 UUID。

模块注册示例：

moduleManager.register({
id: crypto.randomUUID(),
name: '地图模块',
type: 'map',
dataId
})

模块创建后自动订阅对应 dataId。

模块销毁时自动取消订阅。

如果现有 ModuleManager 已经具备模块生命周期管理，请复用现有机制。

不要重复创建一套新的生命周期系统。

==================================================
十九、重复注册
==================================================

同一个 dataId 重复注册时，默认抛出明确错误。

例如：

Data with id "xxx" already exists.

如果当前项目已经存在明确的覆盖策略，则遵循项目现有设计。

==================================================
二十、目录结构
==================================================

请根据当前项目实际目录结构进行调整。

可以参考：

src/
├── core/
│ ├── Engine.ts
│ ├── Context.ts
│ ├── Loop.ts
│ └── EventBus.ts
│
├── module/
│ ├── ModuleManager.ts
│ ├── BaseModule.ts
│ └── ...
│
├── data/
│ ├── DataManager.ts
│ ├── DataStore.ts
│ ├── DataSource.ts
│ ├── ApiDataSource.ts
│ ├── StaticDataSource.ts
│ └── types.ts
│
└── index.ts

如果项目已有类似目录或类，请优先复用。

不要重复创建功能相同的类。

==================================================
二十一、代码要求
==================================================

要求：

- 使用 TypeScript
- 类型完整
- 尽量避免 any
- 使用 UUID
- 优先使用 crypto.randomUUID()
- 保持当前项目代码风格
- 不破坏已有 API
- 尽量增量修改
- 优先复用已有工具
- 优先复用已有请求工具
- 不重复实现已有功能
- 处理资源销毁
- 处理内存泄漏
- 处理请求竞态
- 处理轮询生命周期

==================================================
二十二、执行步骤
==================================================

第一步：

分析当前项目。

重点分析：

- 目录结构
- Engine
- Context
- ModuleManager
- Module 基类
- 模块生命周期
- 现有数据代码
- 现有请求工具
- 现有 UUID 工具

此阶段不要立即修改代码。

第二步：

输出架构分析：

1. 当前架构如何工作
2. 哪些代码可以复用
3. 哪些地方需要新增
4. 哪些地方需要修改
5. DataManager 如何接入
6. DataSource 如何接入
7. Module 如何通过 dataId 绑定数据

第三步：

设计数据系统：

输出：

- DataManager
- DataStore
- DataSource
- ApiDataSource
- StaticDataSource
- 类型定义
- 模块绑定方案
- UUID 设计方案

第四步：

实现代码。

第五步：

接入 Context。

确保：

context.data

可以使用。

第六步：

接入 ModuleManager。

确保：

Module 可以通过 dataId 绑定数据。

第七步：

实现示例。

至少包含：

1. 创建 UUID
2. 注册静态数据
3. 注册 API 数据
4. 手动请求
5. 开启轮询
6. 停止轮询
7. 修改参数后重新请求
8. 模块订阅数据
9. 多个模块绑定同一个 dataId
10. 模块销毁取消订阅

第八步：

编写测试。

至少测试：

- UUID 生成
- 静态数据注册
- API 数据注册
- 数据获取
- 数据更新
- 订阅通知
- 取消订阅
- 参数变化
- 轮询
- 停止轮询
- 重复注册
- 请求竞态
- 模块销毁
- 多模块订阅同一 dataId
- dataId 绑定关系

==================================================
最终目标
==================================================

实现以下完整数据链路：

DataSource
│
│ 可视化配置、操作、修改参数
▼
DataManager
│
│ 管理 UUID 对应的数据资源
▼
DataStore
│
│ 保存数据、状态、错误
│
│ 数据变化通知
▼
Module
│
│ 通过 dataId UUID 绑定数据
▼
onDataChange(data)

最终原则：

DataSource 负责操作数据。

DataManager 负责管理数据。

DataStore 负责保存数据和通知。

UUID 负责唯一标识实体。

dataId 负责建立模块与数据之间的关联。

Module 负责消费数据并更新 Three.js 可视化。

请严格按照：

先分析现有项目
再输出架构方案
最后实施代码

不要在没有分析现有项目的情况下直接重写架构。
