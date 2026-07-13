import { Timer } from 'three/examples/jsm/misc/Timer.js'
import type { CoreEventMap, EventBus } from './index'
export class Loop {
  private rafId: number | null = null
  readonly eventbus
  readonly timer: Timer
  private running = false
  constructor(events: EventBus<CoreEventMap>) {
    this.eventbus = events
    this.timer = new Timer()
  }

  start() {
    if (this.running) return
    this.running = true
    this.rafId = this.requestFrame(this.tick)
  }

  stop() {
    this.running = false
    if (this.rafId !== null) {
      this.cancelFrame(this.rafId)
      this.rafId = null
    }
  }

  destroy() {
    this.stop()
    this.timer.reset()
  }

  tick(timestamp?: number) {
    if (!this.running) return
    this.timer.update(timestamp)
    const delta = this.timer.getDelta()
    const elapsed = this.timer.getElapsed()
    this.eventbus.emit('loop:tick', { delta, elapsed })

    // 调用下一帧
    this.rafId = this.requestFrame(this.tick)
  }

  private requestFrame(callback: (timestamp?: number) => void): number {
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame(callback.bind(this))
    }

    return setTimeout(callback.bind(this), 16) as unknown as number
  }

  private cancelFrame(frameId: number): void {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frameId)
      return
    }

    clearTimeout(frameId)
  }
}
