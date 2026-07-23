import type { EngineEventMap } from './types'

export type EventListener<Payload> = (payload: Payload) => void
export type Unsubscribe = () => void

type StoredListener = (payload: unknown) => void

export class EventBus<Events extends object = EngineEventMap> {
  private readonly listeners = new Map<keyof Events & string, Set<StoredListener>>()

  /**
   * 创建保留当前事件类型定义的事件总线。
   */
  withTypes<AdditionalEvents extends object>(): EventBus<Events & AdditionalEvents> {
    return this as unknown as EventBus<Events & AdditionalEvents>
  }

  /**
   * 注册事件监听器。
   */
  on<Key extends keyof Events & string>(
    event: Key,
    listener: EventListener<Events[Key]>
  ): Unsubscribe {
    const storedListener = listener as StoredListener
    const listeners = this.getListeners(event)

    listeners.add(storedListener)

    return () => this.off(event, listener)
  }

  /**
   * 注册仅执行一次的事件监听器。
   */
  once<Key extends keyof Events & string>(
    event: Key,
    listener: EventListener<Events[Key]>
  ): Unsubscribe {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe()
      listener(payload)
    })

    return unsubscribe
  }

  /**
   * 移除事件监听器；未提供监听器时移除该事件的全部监听。
   */
  off<Key extends keyof Events & string>(event: Key, listener?: EventListener<Events[Key]>): void {
    if (!listener) {
      this.listeners.delete(event)
      return
    }

    const listeners = this.listeners.get(event)
    listeners?.delete(listener as StoredListener)

    if (listeners?.size === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * 向当前事件的所有监听器发布数据。
   */
  emit<Key extends keyof Events & string>(event: Key, payload: Events[Key]): void {
    const listeners = this.listeners.get(event)

    if (!listeners) {
      return
    }

    ;[...listeners].forEach((listener) => listener(payload))
  }

  /**
   * 移除事件总线中的全部监听器。
   */
  clear(): void {
    this.listeners.clear()
  }

  /**
   * 获取指定事件当前注册的监听器。
   */
  private getListeners<Key extends keyof Events & string>(event: Key) {
    let listeners = this.listeners.get(event)

    if (!listeners) {
      listeners = new Set<StoredListener>()
      this.listeners.set(event, listeners)
    }

    return listeners
  }
}
