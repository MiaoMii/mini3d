/// <reference path="./three-timer.d.ts" />

import type { Camera, Scene, WebGLRenderer } from "three";
import type { Timer } from "three/examples/jsm/misc/Timer.js";
import type { EngineContext } from "./Context";

export type CoreCanvas = HTMLCanvasElement | OffscreenCanvas;

export type ModuleLifecyclePhase =
  | "register"
  | "init"
  | "start"
  | "update"
  | "resize"
  | "stop"
  | "destroy";

export interface TickInfo {
  delta: number;
  elapsed: number;
  frame: number;
  timer: Timer;
}

export interface ResizeInfo {
  width: number;
  height: number;
  pixelRatio: number;
  aspect: number;
}

export interface IModule<TConfig = unknown> {
  name: string;
  order?: number;
  config?: TConfig;
  init?: (context: EngineContext) => void | Promise<void>;
  start?: (context: EngineContext) => void | Promise<void>;
  update?: (tick: TickInfo, context: EngineContext) => void;
  resize?: (size: ResizeInfo, context: EngineContext) => void;
  stop?: (context: EngineContext) => void | Promise<void>;
  destroy?: (context: EngineContext) => void | Promise<void>;
}

export interface ModuleEventPayload {
  module: IModule;
}

export interface ModuleErrorPayload extends ModuleEventPayload {
  phase: ModuleLifecyclePhase;
  error: unknown;
}

export interface CoreEventMap {
  [event: string]: unknown;
  "engine:initialized": { context: EngineContext };
  "engine:start": { context: EngineContext };
  "engine:stop": undefined;
  "engine:destroy": undefined;
  "engine:error": { error: unknown };
  "loop:tick": TickInfo;
  "loop:render": TickInfo;
  resize: ResizeInfo;
  "module:registered": ModuleEventPayload;
  "module:initialized": ModuleEventPayload;
  "module:started": ModuleEventPayload;
  "module:stopped": ModuleEventPayload;
  "module:destroyed": ModuleEventPayload;
  "module:error": ModuleErrorPayload;
}

export interface CoreRuntime {
  canvas: CoreCanvas;
  container?: HTMLElement;
  scene: Scene;
  camera: Camera;
  renderer: WebGLRenderer;
}

export type WorkerClientMessage =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      size: ResizeInfo;
      app?: unknown;
    }
  | {
      type: "resize";
      size: ResizeInfo;
    }
  | {
      type: "start";
    }
  | {
      type: "stop";
    }
  | {
      type: "invalidate";
    }
  | {
      type: "destroy";
    };

export type WorkerHostMessage =
  | {
      type: "ready";
    }
  | {
      type: "started";
    }
  | {
      type: "stopped";
    }
  | {
      type: "destroyed";
    }
  | {
      type: "error";
      message: string;
      stack?: string;
    };
