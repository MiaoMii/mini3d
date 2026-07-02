import { Camera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { EngineContext } from "../Context";
import type { IModule, ResizeInfo, TickInfo } from "../types";
import { CameraAnimator } from "./animation";
import {
  DEFAULT_CAMERA_CONFIG,
  type CameraConfig,
  type CameraMode,
  type Vector3Value,
} from "./config";
import { cameraRegistry, type ICamera } from "./cameras";
import { toVector3 } from "./cameras/utils";

export interface CameraModuleApi {
  controls: OrbitControls | null;
  getActiveCamera: () => Camera;
  getMode: () => CameraMode;
  moveTo: CameraAnimator["moveTo"];
  setMode: (mode: CameraMode, options?: { animate?: boolean }) => void;
  setPosition: (position: Vector3Value) => void;
  setTarget: (target: Vector3Value) => void;
  stopAnimation: () => void;
}

export class CameraModule implements IModule<CameraConfig>, CameraModuleApi {
  readonly name = "camera";
  readonly order = -1000;
  readonly config: CameraConfig;

  controls: OrbitControls | null = null;

  private activeCamera: ICamera | null = null;
  private animator: CameraAnimator | null = null;
  private cameras = new Map<CameraMode, ICamera>();
  private context: EngineContext | null = null;

  constructor(config: CameraConfig = {}) {
    this.config = {
      ...DEFAULT_CAMERA_CONFIG,
      ...config,
    };
  }

  init(context: EngineContext): void {
    this.context = context;
    this.createCameras(context.resize.getSize());
    this.setMode(this.config.mode ?? DEFAULT_CAMERA_CONFIG.mode);
    context.set(this.config.serviceKey ?? DEFAULT_CAMERA_CONFIG.serviceKey, this);
  }

  update(_tick: TickInfo, context: EngineContext): void {
    const controlsNeedUpdate = Boolean(
      this.controls?.enabled &&
        (this.controls.enableDamping || this.controls.autoRotate),
    );

    if (controlsNeedUpdate) {
      this.controls?.update();
      this.syncActiveTargetFromControls();
    }

    if (controlsNeedUpdate) {
      context.loop.invalidate();
    }
  }

  resize(size: ResizeInfo): void {
    this.cameras.forEach((camera) => camera.resize(size));
  }

  destroy(context: EngineContext): void {
    this.animator?.stop();
    this.controls?.dispose();
    this.controls = null;
    this.cameras.forEach((camera) => {
      camera.instance.parent?.remove(camera.instance);
      camera.dispose?.();
    });
    this.cameras.clear();
    context.delete(this.config.serviceKey ?? DEFAULT_CAMERA_CONFIG.serviceKey);
  }

  getActiveCamera(): Camera {
    return this.requireActiveCamera().instance;
  }

  getMode(): CameraMode {
    return this.requireActiveCamera().mode;
  }

  setMode(mode: CameraMode, options: { animate?: boolean } = {}): void {
    const context = this.requireContext();
    const nextCamera = this.cameras.get(mode);

    if (!nextCamera) {
      throw new Error(`Camera mode "${mode}" is not registered.`);
    }

    const previousCamera = this.activeCamera;
    const previousControlsTarget = this.controls?.target.clone() ?? previousCamera?.target.clone();

    if (previousCamera && previousCamera !== nextCamera) {
      nextCamera.setPosition(previousCamera.instance.position);
      nextCamera.lookAt(previousControlsTarget ?? previousCamera.target);
      previousCamera.instance.parent?.remove(previousCamera.instance);
    }

    this.activeCamera = nextCamera;
    context.scene.add(nextCamera.instance);
    context.setCamera(nextCamera.instance);
    this.rebuildControls(context, nextCamera);
    this.animator = new CameraAnimator(nextCamera.instance, this.controls);

    if (options.animate && previousCamera) {
      this.moveTo({
        from: {
          position: previousCamera.instance.position,
          target: previousControlsTarget ?? previousCamera.target,
        },
        to: {
          position: nextCamera.instance.position,
          target: nextCamera.target,
        },
        duration: this.config.animation?.duration,
        easing: this.config.animation?.easing,
      });
    }

    context.loop.invalidate();
  }

  moveTo: CameraAnimator["moveTo"] = (options) => {
    const context = this.requireContext();
    const onUpdate = options.onUpdate;
    const onComplete = options.onComplete;

    this.requireAnimator().moveTo({
      ...options,
      onUpdate: (progress) => {
        this.syncActiveTargetFromControls();
        onUpdate?.(progress);
        context.loop.invalidate();
      },
      onComplete: () => {
        this.syncActiveTargetFromControls();
        onComplete?.();
        context.loop.invalidate();
      },
    });
    context.loop.invalidate();
  };

  setPosition(position: Vector3Value): void {
    this.requireActiveCamera().setPosition(position);
    this.requireContext().loop.invalidate();
  }

  setTarget(target: Vector3Value): void {
    const nextTarget = toVector3(target);
    const activeCamera = this.requireActiveCamera();

    activeCamera.lookAt(nextTarget);
    this.controls?.target.copy(nextTarget);
    this.controls?.update();
    this.requireContext().loop.invalidate();
  }

  stopAnimation(): void {
    this.animator?.stop();
  }

  private createCameras(size: ResizeInfo): void {
    this.cameras.set("perspective", cameraRegistry.perspective(this.config, size));
    this.cameras.set("orthographic", cameraRegistry.orthographic(this.config, size));
  }

  private rebuildControls(context: EngineContext, camera: ICamera): void {
    this.controls?.dispose();
    this.controls = null;

    if (this.config.controls === false || !isOrbitControlsElement(context.canvas)) {
      return;
    }

    this.controls = new OrbitControls(camera.instance, context.canvas);
    this.controls.target.copy(camera.target);

    const controlsConfig = this.config.controls ?? {};
    this.controls.enabled = controlsConfig.enabled ?? true;
    this.controls.enableDamping = controlsConfig.enableDamping ?? true;
    this.controls.dampingFactor = controlsConfig.dampingFactor ?? 0.05;
    this.controls.enablePan = controlsConfig.enablePan ?? true;
    this.controls.enableRotate = controlsConfig.enableRotate ?? true;
    this.controls.enableZoom = controlsConfig.enableZoom ?? true;

    if (controlsConfig.minDistance !== undefined) {
      this.controls.minDistance = controlsConfig.minDistance;
    }

    if (controlsConfig.maxDistance !== undefined) {
      this.controls.maxDistance = controlsConfig.maxDistance;
    }

    if (controlsConfig.minZoom !== undefined) {
      this.controls.minZoom = controlsConfig.minZoom;
    }

    if (controlsConfig.maxZoom !== undefined) {
      this.controls.maxZoom = controlsConfig.maxZoom;
    }

    this.controls.addEventListener("change", () => {
      this.syncActiveTargetFromControls();
      context.loop.invalidate();
    });
    this.controls.update();
  }

  private syncActiveTargetFromControls(): void {
    if (this.activeCamera && this.controls) {
      this.activeCamera.target.copy(this.controls.target);
    }
  }

  private requireActiveCamera(): ICamera {
    if (!this.activeCamera) {
      throw new Error("CameraModule has not been initialized.");
    }

    return this.activeCamera;
  }

  private requireAnimator(): CameraAnimator {
    if (!this.animator) {
      throw new Error("CameraModule animator has not been initialized.");
    }

    return this.animator;
  }

  private requireContext(): EngineContext {
    if (!this.context) {
      throw new Error("CameraModule has not been initialized.");
    }

    return this.context;
  }
}

export function createCameraModule(config?: CameraConfig): CameraModule {
  return new CameraModule(config);
}

function isOrbitControlsElement(
  canvas: EngineContext["canvas"],
): canvas is HTMLCanvasElement {
  return (
    "addEventListener" in canvas &&
    "removeEventListener" in canvas &&
    "style" in canvas
  );
}
