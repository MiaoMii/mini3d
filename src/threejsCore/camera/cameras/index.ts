import type { ResizeInfo } from "../../types";
import type { CameraConfig, CameraMode } from "../config";
import type { ICamera } from "./ICamera";
import { OrthographicCameraImpl } from "./OrthographicCameraImpl";
import { PerspectiveCameraImpl } from "./PerspectiveCameraImpl";

export type CameraFactory = (config: CameraConfig, size: ResizeInfo) => ICamera;

export const cameraRegistry: Record<CameraMode, CameraFactory> = {
  perspective: (config, size) => new PerspectiveCameraImpl(config.perspective, size.aspect),
  orthographic: (config, size) => new OrthographicCameraImpl(config.orthographic, size.aspect),
};

export * from "./ICamera";
export * from "./OrthographicCameraImpl";
export * from "./PerspectiveCameraImpl";
