import { Timer } from 'three/examples/jsm/misc/Timer.js'
import type { CoreEventMap, EventBus } from './index'
export class Loop {
  private rafId: number | null = null
  readonly eventbus
  readonly timer: Timer
  private running = false
  /**
   * 创建渲染循环实例。
   */
  constructor(events: EventBus<CoreEventMap>) {
    this.eventbus = events
    this.timer = new Timer()
  }

  /**
   * 启动渲染循环。
   */
  start() {
    if (this.running) return
    this.running = true
    this.rafId = this.requestFrame(this.tick)
  }

  /**
   * 停止渲染循环。
   */
  stop() {
    this.running = false
    if (this.rafId !== null) {
      this.cancelFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * 释放渲染循环持有的资源。
   */
  destroy() {
    this.stop()
    this.timer.reset()
  }

  /**
   * 执行一帧更新并安排下一帧。
   */
  tick(timestamp?: number) {
    if (!this.running) return
    this.timer.update(timestamp)
    const delta = this.timer.getDelta()
    const elapsed = this.timer.getElapsed()
    this.eventbus.emit('loop:tick', { delta, elapsed })

    // 调用下一帧
    this.rafId = this.requestFrame(this.tick)
  }

  /**
   * 安排下一帧渲染循环回调。
   */
  private requestFrame(callback: (timestamp?: number) => void): number {
    if (typeof requestAnimationFrame === 'function') {
      return requestAnimationFrame(callback.bind(this))
    }

    return setTimeout(callback.bind(this), 16) as unknown as number
  }

  /**
   * 取消已安排的下一帧回调。
   */
  private cancelFrame(frameId: number): void {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frameId)
      return
    }

    clearTimeout(frameId)
  }
}
