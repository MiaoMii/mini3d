import { OrthographicCamera, Vector3 } from "three";
import type { ResizeInfo } from "../../types";
import type { OrthographicCameraConfig, Vector3Value } from "../config";
import type { ICamera } from "./ICamera";
import { toVector3 } from "./utils";

export class OrthographicCameraImpl implements ICamera<OrthographicCamera> {
  readonly mode = "orthographic";
  readonly instance: OrthographicCamera;
  readonly target: Vector3;
  private frustumSize: number;

  constructor(config: OrthographicCameraConfig = {}, aspect = 1) {
    this.frustumSize = config.frustumSize ?? 20;
    this.instance = new OrthographicCamera(0, 0, 0, 0, config.near ?? 0.1, config.far ?? 10000);
    this.target = toVector3(config.target, new Vector3());
    this.setPosition(config.position ?? (config.topDown ? [0, 10, 0] : [10, 10, 10]));
    this.resize({
      width: aspect,
      height: 1,
      pixelRatio: 1,
      aspect,
    });
    this.lookAt(this.target);
  }

  lookAt(target: Vector3Value): void {
    this.target.copy(toVector3(target));
    this.instance.lookAt(this.target);
    this.instance.updateProjectionMatrix();
  }

  resize(size: ResizeInfo): void {
    const halfHeight = this.frustumSize / 2;
    const halfWidth = halfHeight * size.aspect;

    this.instance.left = -halfWidth;
    this.instance.right = halfWidth;
    this.instance.top = halfHeight;
    this.instance.bottom = -halfHeight;
    this.instance.updateProjectionMatrix();
  }

  setFrustumSize(size: number): void {
    if (Number.isFinite(size) && size > 0) {
      this.frustumSize = size;
    }
  }

  setPosition(position: Vector3Value): void {
    this.instance.position.copy(toVector3(position));
  }
}
