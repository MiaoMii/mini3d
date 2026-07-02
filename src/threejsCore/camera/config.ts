import type { Vector3 } from "three";
import type { EasingName } from "./animation";

export type CameraMode = "perspective" | "orthographic";

export type Vector3Tuple = [number, number, number];
export type Vector3Value = Vector3 | Vector3Tuple | { x: number; y: number; z: number };

export interface PerspectiveCameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  position?: Vector3Value;
  target?: Vector3Value;
}

export interface OrthographicCameraConfig {
  frustumSize?: number;
  near?: number;
  far?: number;
  position?: Vector3Value;
  target?: Vector3Value;
  topDown?: boolean;
}

export interface CameraControlsConfig {
  enabled?: boolean;
  enableDamping?: boolean;
  dampingFactor?: number;
  enablePan?: boolean;
  enableRotate?: boolean;
  enableZoom?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface CameraAnimationConfig {
  duration?: number;
  easing?: EasingName;
}

export interface CameraConfig {
  mode?: CameraMode;
  perspective?: PerspectiveCameraConfig;
  orthographic?: OrthographicCameraConfig;
  controls?: CameraControlsConfig | false;
  animation?: CameraAnimationConfig;
  serviceKey?: string;
}

export const DEFAULT_CAMERA_SERVICE_KEY = "camera";

export const DEFAULT_CAMERA_CONFIG: Required<
  Pick<CameraConfig, "mode" | "serviceKey">
> = {
  mode: "perspective",
  serviceKey: DEFAULT_CAMERA_SERVICE_KEY,
};
