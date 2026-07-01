import type { ResizeInfo, WorkerClientMessage, WorkerHostMessage } from "./types";

export interface WorkerClientOptions<TAppConfig = unknown> {
  canvas: HTMLCanvasElement;
  worker: Worker;
  app?: TAppConfig;
  autoStart?: boolean;
  maxPixelRatio?: number;
  observe?: boolean;
}

type HostMessageListener = (message: WorkerHostMessage) => void;

export class WorkerClient<TAppConfig = unknown> {
  readonly offscreen: OffscreenCanvas;
  readonly worker: Worker;

  private readonly app?: TAppConfig;
  private readonly canvas: HTMLCanvasElement;
  private readonly listeners = new Set<HostMessageListener>();
  private readonly maxPixelRatio: number;
  private readonly observe: boolean;
  private resizeObserver: ResizeObserver | null = null;
  private started = false;

  constructor(options: WorkerClientOptions<TAppConfig>) {
    if (!("transferControlToOffscreen" in options.canvas)) {
      throw new Error("OffscreenCanvas is not supported by this browser.");
    }

    this.canvas = options.canvas;
    this.worker = options.worker;
    this.app = options.app;
    this.maxPixelRatio = options.maxPixelRatio ?? 2;
    this.observe = options.observe ?? true;
    this.offscreen = options.canvas.transferControlToOffscreen();
    this.worker.addEventListener("message", this.handleMessage);
    this.post(
      {
        type: "init",
        canvas: this.offscreen,
        size: this.measure(),
        app: this.app,
      },
      [this.offscreen],
    );

    this.watchResize();

    if (options.autoStart) {
      this.start();
    }
  }

  onMessage(listener: HostMessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.post({ type: "start" });
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.post({ type: "stop" });
  }

  invalidate(): void {
    this.post({ type: "invalidate" });
  }

  resize = (): void => {
    this.post({ type: "resize", size: this.measure() });
  };

  destroy(options: { terminateWorker?: boolean } = {}): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.resize);
    this.worker.removeEventListener("message", this.handleMessage);
    this.post({ type: "destroy" });

    if (options.terminateWorker) {
      this.worker.terminate();
    }
  }

  private watchResize(): void {
    window.addEventListener("resize", this.resize);

    if (this.observe && "ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
    }
  }

  private measure(): ResizeInfo {
    const target = this.canvas.parentElement ?? this.canvas;
    const width = target.clientWidth || this.canvas.clientWidth || this.canvas.width || 1;
    const height = target.clientHeight || this.canvas.clientHeight || this.canvas.height || 1;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);

    return {
      width,
      height,
      pixelRatio,
      aspect: width / height,
    };
  }

  private post(message: WorkerClientMessage, transfer?: Transferable[]): void {
    this.worker.postMessage(message, transfer ?? []);
  }

  private handleMessage = (event: MessageEvent<WorkerHostMessage>): void => {
    this.listeners.forEach((listener) => listener(event.data));
  };
}
