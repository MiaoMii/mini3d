/// <reference path="./three-timer.d.ts" />

import { Timer } from "three/examples/jsm/misc/Timer.js";
import type { EventBus } from "./EventBus";
import type { CoreEventMap, TickInfo } from "./types";

export type LoopRenderMode = "always" | "dirty";

export interface LoopOptions {
  renderMode?: LoopRenderMode;
  maxDelta?: number;
}

interface LoopCallbacks {
  onTick?: (tick: TickInfo) => void;
  onRender?: (tick: TickInfo) => void;
}

export class Loop {
  readonly timer = new Timer();

  private callbacks: LoopCallbacks = {};
  private dirty = true;
  private readonly eventBus: EventBus<CoreEventMap>;
  private frame = 0;
  private rafId: number | null = null;
  private running = false;
  private readonly maxDelta: number;
  private readonly renderMode: LoopRenderMode;

  constructor(eventBus: EventBus<CoreEventMap>, options: LoopOptions = {}) {
    this.eventBus = eventBus;
    this.renderMode = options.renderMode ?? "always";
    this.maxDelta = options.maxDelta ?? 0.1;
  }

  setCallbacks(callbacks: LoopCallbacks): void {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.timer.reset();
    this.invalidate();
    this.rafId = this.requestFrame(this.tick);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.rafId !== null) {
      this.cancelFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.timer.dispose();
  }

  invalidate(): void {
    this.dirty = true;
  }

  isRunning(): boolean {
    return this.running;
  }

  private tick = (timestamp?: number): void => {
    if (!this.running) {
      return;
    }

    this.rafId = this.requestFrame(this.tick);
    this.timer.update(timestamp);

    const tick: TickInfo = {
      delta: Math.min(this.timer.getDelta(), this.maxDelta),
      elapsed: this.timer.getElapsed(),
      frame: this.frame,
      timer: this.timer,
    };

    this.frame += 1;
    this.callbacks.onTick?.(tick);
    this.eventBus.emit("loop:tick", tick);

    if (this.renderMode === "always" || this.dirty) {
      this.callbacks.onRender?.(tick);
      this.eventBus.emit("loop:render", tick);
      this.dirty = false;
    }
  };

  private requestFrame(callback: (timestamp?: number) => void): number {
    if (typeof requestAnimationFrame === "function") {
      return requestAnimationFrame(callback);
    }

    return setTimeout(callback, 16) as unknown as number;
  }

  private cancelFrame(frameId: number): void {
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(frameId);
      return;
    }

    clearTimeout(frameId);
  }
}
