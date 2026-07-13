import type { CoreEventMap } from './index'

export type EventListener<Payload> = (payload: Payload) => void
export type Unsubscribe = () => void

type StoredListener = (payload: unknown) => void

export class EventBus<Events extends Record<string, unknown> = CoreEventMap> {
  private readonly listeners = new Map<keyof Events & string, Set<StoredListener>>()

  on<Key extends keyof Events & string>(
    event: Key,
    listener: EventListener<Events[Key]>
  ): Unsubscribe {
    const storedListener = listener as StoredListener
    const listeners = this.getListeners(event)

    listeners.add(storedListener)

    return () => this.off(event, listener)
  }

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

  emit<Key extends keyof Events & string>(event: Key, payload: Events[Key]): void {
    const listeners = this.listeners.get(event)

    if (!listeners) {
      return
    }

    ;[...listeners].forEach((listener) => listener(payload))
  }

  clear(): void {
    this.listeners.clear()
  }

  private getListeners<Key extends keyof Events & string>(event: Key) {
    let listeners = this.listeners.get(event)

    if (!listeners) {
      listeners = new Set<StoredListener>()
      this.listeners.set(event, listeners)
    }

    return listeners
  }
}
