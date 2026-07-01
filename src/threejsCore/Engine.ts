import {
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  Vector3,
  type Camera,
} from "three";
import { EngineContext } from "./Context";
import { EventBus } from "./EventBus";
import { Loop } from "./Loop";
import { ModuleManager } from "./ModuleManager";
import { Renderer } from "./Renderer";
import { ResizeHandler } from "./ResizeHandler";
import type { CoreConfig } from "./config";
import type { CoreEventMap, IModule, ResizeInfo, TickInfo } from "./types";

const DEFAULT_CAMERA_POSITION = new Vector3(10, 10, 10);

export class Engine {
  readonly camera: Camera;
  readonly canvas: CoreConfig["canvas"];
  readonly container?: HTMLElement;
  readonly context: EngineContext;
  readonly events = new EventBus<CoreEventMap>();
  readonly loop: Loop;
  readonly modules = new ModuleManager(this.events);
  readonly renderer: Renderer;
  readonly resize: ResizeHandler;
  readonly scene: Scene;

  private destroyed = false;
  private initialized = false;
  private started = false;

  constructor(config: CoreConfig) {
    this.canvas = config.canvas;
    this.container =
      config.container ??
      ("parentElement" in config.canvas ? config.canvas.parentElement ?? undefined : undefined);
    this.scene = config.scene ?? new Scene();
    this.resize = new ResizeHandler(this.canvas, this.events, {
      ...config.resize,
      container: config.resize?.container ?? this.container,
    });

    const size = this.resize.getSize();

    this.camera = config.camera ?? this.createDefaultCamera(size.aspect);
    this.renderer = new Renderer({
      width: size.width,
      height: size.height,
      pixelRatio: size.pixelRatio,
      ...config.renderer,
      canvas: this.canvas,
    });
    this.loop = new Loop(this.events, config.loop);
    this.context = new EngineContext({
      canvas: this.canvas,
      container: this.container,
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      loop: this.loop,
      events: this.events,
      modules: this.modules,
      resize: this.resize,
    });

    if (!this.camera.parent) {
      this.scene.add(this.camera);
    }

    this.resize.setCallback(this.handleResize);
    this.loop.setCallbacks({
      onTick: this.handleTick,
      onRender: this.handleRender,
    });

    config.modules?.forEach((module) => this.use(module));

    if (config.autoStart) {
      void this.start().catch((error: unknown) => {
        this.events.emit("engine:error", { error });
      });
    }
  }

  use(module: IModule): this {
    this.modules.register(module);
    return this;
  }

  async init(): Promise<void> {
    this.ensureAlive();

    if (this.initialized) {
      return;
    }

    await this.modules.init(this.context);
    this.resize.start();
    this.initialized = true;
    this.events.emit("engine:initialized", { context: this.context });
  }

  async start(): Promise<void> {
    this.ensureAlive();

    if (this.started) {
      return;
    }

    await this.init();
    await this.modules.start();
    this.loop.start();
    this.started = true;
    this.events.emit("engine:start", { context: this.context });
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.loop.stop();
    await this.modules.stop();
    this.started = false;
    this.events.emit("engine:stop", undefined);
  }

  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    await this.stop();
    await this.modules.destroy();
    this.resize.destroy();
    this.loop.destroy();
    this.renderer.destroy();
    this.context.clear();
    this.destroyed = true;
    this.events.emit("engine:destroy", undefined);
    this.events.clear();
  }

  invalidate(): void {
    this.loop.invalidate();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  refreshSize(): ResizeInfo {
    return this.resize.refresh(true);
  }

  private createDefaultCamera(aspect: number): PerspectiveCamera {
    const camera = new PerspectiveCamera(45, aspect, 0.1, 10000);

    camera.position.copy(DEFAULT_CAMERA_POSITION);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  private handleTick = (tick: TickInfo): void => {
    this.modules.update(tick);
  };

  private handleRender = (): void => {
    this.render();
  };

  private handleResize = (size: ResizeInfo): void => {
    this.renderer.setSize(size.width, size.height, size.pixelRatio);
    this.updateCameraProjection(size);
    this.modules.resize(size);
    this.invalidate();
  };

  private updateCameraProjection(size: ResizeInfo): void {
    if (this.camera instanceof PerspectiveCamera) {
      this.camera.aspect = size.aspect;
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.camera instanceof OrthographicCamera) {
      const height = this.camera.top - this.camera.bottom;
      const width = height * size.aspect;

      this.camera.left = -width / 2;
      this.camera.right = width / 2;
      this.camera.updateProjectionMatrix();
    }
  }

  private ensureAlive(): void {
    if (this.destroyed) {
      throw new Error("Engine has already been destroyed.");
    }
  }
}
