import {
  SRGBColorSpace,
  WebGLRenderer,
  type Camera,
  type ColorRepresentation,
  type ColorSpace,
  type Scene,
  type WebGLRendererParameters,
} from "three";
import type { CoreCanvas } from "./types";

export interface RendererOptions extends Omit<WebGLRendererParameters, "canvas"> {
  width?: number;
  height?: number;
  pixelRatio?: number;
  maxPixelRatio?: number;
  clearColor?: ColorRepresentation;
  clearAlpha?: number;
  outputColorSpace?: ColorSpace;
}

export interface RendererCreateOptions extends RendererOptions {
  canvas: CoreCanvas;
}

export class Renderer {
  readonly instance: WebGLRenderer;

  constructor(options: RendererCreateOptions) {
    const {
      canvas,
      width = this.getCanvasWidth(canvas),
      height = this.getCanvasHeight(canvas),
      pixelRatio,
      maxPixelRatio = 2,
      clearColor,
      clearAlpha = 1,
      outputColorSpace = SRGBColorSpace,
      ...rendererOptions
    } = options;

    this.instance = new WebGLRenderer({
      antialias: true,
      alpha: true,
      ...rendererOptions,
      canvas: canvas as WebGLRendererParameters["canvas"],
    });
    this.instance.outputColorSpace = outputColorSpace;

    if (clearColor !== undefined) {
      this.instance.setClearColor(clearColor, clearAlpha);
    }

    this.setSize(width, height, this.resolvePixelRatio(pixelRatio, maxPixelRatio));
  }

  setSize(width: number, height: number, pixelRatio = this.instance.getPixelRatio()): void {
    this.instance.setPixelRatio(pixelRatio);
    this.instance.setSize(Math.max(width, 1), Math.max(height, 1), false);
  }

  render(scene: Scene, camera: Camera): void {
    this.instance.render(scene, camera);
  }

  destroy(): void {
    this.instance.dispose();
    this.instance.forceContextLoss();
  }

  private resolvePixelRatio(pixelRatio?: number, maxPixelRatio = 2): number {
    if (typeof pixelRatio === "number" && Number.isFinite(pixelRatio) && pixelRatio > 0) {
      return pixelRatio;
    }

    const devicePixelRatio =
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;

    return Math.min(devicePixelRatio, maxPixelRatio);
  }

  private getCanvasWidth(canvas: CoreCanvas): number {
    if ("clientWidth" in canvas && canvas.clientWidth > 0) {
      return canvas.clientWidth;
    }

    return canvas.width || 1;
  }

  private getCanvasHeight(canvas: CoreCanvas): number {
    if ("clientHeight" in canvas && canvas.clientHeight > 0) {
      return canvas.clientHeight;
    }

    return canvas.height || 1;
  }
}
