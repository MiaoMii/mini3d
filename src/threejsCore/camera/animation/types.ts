import type { Vector3 } from "three";
import type { EasingFunction, EasingName } from "./easings";

export interface CameraTarget {
  position: Vector3;
  target: Vector3;
}

export interface MoveOptions {
  from?: Partial<CameraTarget>;
  to: Partial<CameraTarget>;
  duration?: number;
  easing?: EasingName | EasingFunction;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}
