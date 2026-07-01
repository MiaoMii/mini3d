import type { EventBus } from "./EventBus";
import type {
  CoreEventMap,
  IModule,
  ModuleLifecyclePhase,
  ResizeInfo,
  TickInfo,
} from "./types";
import type { EngineContext } from "./Context";

export class ModuleManager {
  private context: EngineContext | null = null;
  private readonly eventBus: EventBus<CoreEventMap>;
  private readonly initializedModules = new Set<string>();
  private readonly modules: IModule[] = [];

  constructor(eventBus: EventBus<CoreEventMap>) {
    this.eventBus = eventBus;
  }

  register(module: IModule): void {
    if (this.modules.some((item) => item.name === module.name)) {
      throw new Error(`Module "${module.name}" is already registered.`);
    }

    this.modules.push(module);
    this.modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.eventBus.emit("module:registered", { module });
  }

  get(name: string): IModule | undefined {
    return this.modules.find((module) => module.name === name);
  }

  getAll(): IModule[] {
    return [...this.modules];
  }

  async init(context: EngineContext): Promise<void> {
    this.context = context;

    for (const module of this.modules) {
      await this.initModule(module, context);
    }
  }

  async start(): Promise<void> {
    const context = this.requireContext();

    for (const module of this.modules) {
      await this.runAsync(module, "start", () => module.start?.(context));
      this.eventBus.emit("module:started", { module });
    }
  }

  update(tick: TickInfo): void {
    const context = this.requireContext();

    for (const module of this.modules) {
      this.runSync(module, "update", () => module.update?.(tick, context));
    }
  }

  resize(size: ResizeInfo): void {
    const context = this.requireContext();

    for (const module of this.modules) {
      this.runSync(module, "resize", () => module.resize?.(size, context));
    }
  }

  async stop(): Promise<void> {
    const context = this.requireContext();

    for (const module of [...this.modules].reverse()) {
      await this.runAsync(module, "stop", () => module.stop?.(context));
      this.eventBus.emit("module:stopped", { module });
    }
  }

  async destroy(): Promise<void> {
    const context = this.requireContext();

    for (const module of [...this.modules].reverse()) {
      await this.runAsync(module, "destroy", () => module.destroy?.(context));
      this.eventBus.emit("module:destroyed", { module });
    }

    this.modules.length = 0;
    this.initializedModules.clear();
    this.context = null;
  }

  private async initModule(module: IModule, context: EngineContext): Promise<void> {
    if (this.initializedModules.has(module.name)) {
      return;
    }

    await this.runAsync(module, "init", () => module.init?.(context));
    this.initializedModules.add(module.name);
    this.eventBus.emit("module:initialized", { module });
  }

  private async runAsync(
    module: IModule,
    phase: ModuleLifecyclePhase,
    hook: () => void | Promise<void> | undefined,
  ): Promise<void> {
    try {
      await hook();
    } catch (error) {
      this.eventBus.emit("module:error", { module, phase, error });
      throw error;
    }
  }

  private runSync(
    module: IModule,
    phase: ModuleLifecyclePhase,
    hook: () => void | undefined,
  ): void {
    try {
      hook();
    } catch (error) {
      this.eventBus.emit("module:error", { module, phase, error });
    }
  }

  private requireContext(): EngineContext {
    if (!this.context) {
      throw new Error("ModuleManager has not been initialized.");
    }

    return this.context;
  }
}
