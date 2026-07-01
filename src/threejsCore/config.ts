import type { Camera, Scene } from "three";
import type { LoopOptions } from "./Loop";
import type { RendererOptions } from "./Renderer";
import type { ResizeHandlerOptions } from "./ResizeHandler";
import type { CoreCanvas, IModule } from "./types";

export interface CoreConfig<TAppConfig = unknown> {
  canvas: CoreCanvas;
  container?: HTMLElement;
  scene?: Scene;
  camera?: Camera;
  renderer?: RendererOptions;
  resize?: ResizeHandlerOptions;
  loop?: LoopOptions;
  modules?: IModule[];
  autoStart?: boolean;
  app?: TAppConfig;
}

export type AppConfig<TAppConfig = unknown> = CoreConfig<TAppConfig>;
