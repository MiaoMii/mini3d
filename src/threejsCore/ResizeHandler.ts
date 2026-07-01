import type { EventBus } from "./EventBus";
import type { CoreCanvas, CoreEventMap, ResizeInfo } from "./types";

export interface ResizeHandlerOptions {
  container?: HTMLElement;
  initialSize?: ResizeInfo;
  pixelRatio?: number | (() => number);
  maxPixelRatio?: number;
  observe?: boolean;
}

export class ResizeHandler {
  private readonly canvas: CoreCanvas;
  private current: ResizeInfo;
  private readonly eventBus: EventBus<CoreEventMap>;
  private readonly options: ResizeHandlerOptions;
  private resizeObserver: ResizeObserver | null = null;
  private resizeCallback: ((size: ResizeInfo) => void) | null = null;
  private started = false;

  constructor(
    canvas: CoreCanvas,
    eventBus: EventBus<CoreEventMap>,
    options: ResizeHandlerOptions = {},
  ) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.options = options;
    this.current = options.initialSize ?? this.measure();
  }

  setCallback(callback: (size: ResizeInfo) => void): void {
    this.resizeCallback = callback;
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize);
    }

    if (
      this.options.observe !== false &&
      typeof window !== "undefined" &&
      "ResizeObserver" in window
    ) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.target);
    }

    this.refresh(true);
  }

  refresh(force = false): ResizeInfo {
    const next = this.measure();
    const changed =
      force ||
      next.width !== this.current.width ||
      next.height !== this.current.height ||
      next.pixelRatio !== this.current.pixelRatio;

    this.current = next;

    if (changed) {
      this.resizeCallback?.(next);
      this.eventBus.emit("resize", next);
    }

    return next;
  }

  setSize(size: ResizeInfo, force = true): void {
    const changed =
      force ||
      size.width !== this.current.width ||
      size.height !== this.current.height ||
      size.pixelRatio !== this.current.pixelRatio;

    this.current = size;

    if (changed) {
      this.resizeCallback?.(size);
      this.eventBus.emit("resize", size);
    }
  }

  getSize(): ResizeInfo {
    return this.current;
  }

  destroy(): void {
    if (!this.started) {
      return;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleResize);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.started = false;
  }

  private get target(): HTMLElement {
    if (this.options.container) {
      return this.options.container;
    }

    if ("parentElement" in this.canvas && this.canvas.parentElement) {
      return this.canvas.parentElement;
    }

    return this.canvas as HTMLElement;
  }

  private handleResize = (): void => {
    this.refresh();
  };

  private measure(): ResizeInfo {
    const target = this.target;
    const width = target.clientWidth || this.getCanvasWidth() || 1;
    const height = target.clientHeight || this.getCanvasHeight() || 1;
    const pixelRatio = this.resolvePixelRatio();

    return {
      width,
      height,
      pixelRatio,
      aspect: width / height,
    };
  }

  private getCanvasWidth(): number {
    if ("clientWidth" in this.canvas && this.canvas.clientWidth > 0) {
      return this.canvas.clientWidth;
    }

    return this.canvas.width || 1;
  }

  private getCanvasHeight(): number {
    if ("clientHeight" in this.canvas && this.canvas.clientHeight > 0) {
      return this.canvas.clientHeight;
    }

    return this.canvas.height || 1;
  }

  private resolvePixelRatio(): number {
    const configured = this.options.pixelRatio;
    const pixelRatio =
      typeof configured === "function"
        ? configured()
        : configured ?? this.getDevicePixelRatio();

    return Math.min(Math.max(pixelRatio, 1), this.options.maxPixelRatio ?? 2);
  }

  private getDevicePixelRatio(): number {
    return typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  }
}
