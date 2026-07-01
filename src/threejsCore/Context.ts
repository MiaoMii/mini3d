import type { Camera, Scene } from "three";
import type { EventBus } from "./EventBus";
import type { Loop } from "./Loop";
import type { ModuleManager } from "./ModuleManager";
import type { Renderer } from "./Renderer";
import type { ResizeHandler } from "./ResizeHandler";
import type { CoreCanvas, CoreEventMap } from "./types";

export interface EngineContextOptions {
  canvas: CoreCanvas;
  container?: HTMLElement;
  scene: Scene;
  camera: Camera;
  renderer: Renderer;
  loop: Loop;
  events: EventBus<CoreEventMap>;
  modules: ModuleManager;
  resize: ResizeHandler;
}

export class EngineContext {
  readonly canvas: CoreCanvas;
  readonly container?: HTMLElement;
  readonly scene: Scene;
  readonly camera: Camera;
  readonly renderer: Renderer;
  readonly loop: Loop;
  readonly events: EventBus<CoreEventMap>;
  readonly modules: ModuleManager;
  readonly resize: ResizeHandler;

  private readonly services = new Map<string, unknown>();

  constructor(options: EngineContextOptions) {
    this.canvas = options.canvas;
    this.container = options.container;
    this.scene = options.scene;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.loop = options.loop;
    this.events = options.events;
    this.modules = options.modules;
    this.resize = options.resize;
  }

  set<TValue>(key: string, value: TValue): this {
    this.services.set(key, value);
    return this;
  }

  get<TValue>(key: string): TValue {
    if (!this.services.has(key)) {
      throw new Error(`Service "${key}" is not registered in EngineContext.`);
    }

    return this.services.get(key) as TValue;
  }

  maybe<TValue>(key: string): TValue | undefined {
    return this.services.get(key) as TValue | undefined;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  delete(key: string): boolean {
    return this.services.delete(key);
  }

  clear(): void {
    this.services.clear();
  }
}
