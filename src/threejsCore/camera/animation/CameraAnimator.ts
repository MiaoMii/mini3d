import gsap from "gsap";
import { Camera, Vector3 } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { resolveEasing } from "./easings";
import type { MoveOptions } from "./types";

export class CameraAnimator {
  private readonly camera: Camera;
  private controls: OrbitControls | null = null;
  private readonly fallbackTarget = new Vector3();
  private readonly interpolatedTarget = new Vector3();
  private tween: ReturnType<typeof gsap.to> | null = null;

  constructor(camera: Camera, controls?: OrbitControls | null) {
    this.camera = camera;
    this.controls = controls ?? null;
  }

  setControls(controls: OrbitControls | null): void {
    this.controls = controls;
  }

  moveTo(options: MoveOptions): void {
    this.stop();

    const fromTarget = options.from?.target ?? this.controls?.target ?? this.fallbackTarget;
    const toPosition = options.to.position ?? this.camera.position;
    const toTarget = options.to.target ?? fromTarget;
    const fromPosition = (options.from?.position ?? this.camera.position).clone();
    const fromTargetClone = fromTarget.clone();
    const toPositionClone = toPosition.clone();
    const toTargetClone = toTarget.clone();
    const tweenState = { progress: 0 };

    this.tween = gsap.to(tweenState, {
      progress: 1,
      duration: Math.max(options.duration ?? 0.8, 0.001),
      ease: resolveEasing(options.easing),
      onUpdate: () => {
        this.camera.position.lerpVectors(
          fromPosition,
          toPositionClone,
          tweenState.progress,
        );

        if (this.controls) {
          this.controls.target.lerpVectors(
            fromTargetClone,
            toTargetClone,
            tweenState.progress,
          );
          this.controls.update();
        } else {
          this.interpolatedTarget.lerpVectors(
            fromTargetClone,
            toTargetClone,
            tweenState.progress,
          );
          this.camera.lookAt(this.interpolatedTarget);
        }

        options.onUpdate?.(tweenState.progress);
      },
      onComplete: () => {
        this.tween = null;
        options.onComplete?.();
      },
    });
  }

  update(): void {
    // GSAP owns animation timing; this method is kept for module compatibility.
  }

  stop(): void {
    this.tween?.kill();
    this.tween = null;
  }

  isActive(): boolean {
    return Boolean(this.tween?.isActive());
  }
}
