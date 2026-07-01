import { MathUtils, PerspectiveCamera, OrthographicCamera, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const DEFAULT_CAMERA_FOV = 45;
const DEFAULT_CAMERA_NEAR = 1;
const DEFAULT_CAMERA_FAR = 10000;
const DEFAULT_CAMERA_POSITION = new Vector3(10, 10, 10);
const DEFAULT_ORTHOGRAPHIC_DIRECTION = new Vector3(0, 1, 0);
const DEFAULT_ORTHOGRAPHIC_FRUSTUM_SIZE = 20;

export class Camera {
  constructor({ sizes, scene, canvas }, options = { isOrthographic: false }) {
    this.sizes = sizes;
    this.scene = scene;
    this.canvas = canvas;
    this.options = Object.assign(
      { isOrthographic: false, orthographicTopDown: true },
      options
    );
    this.orthographicFrustumSize = DEFAULT_ORTHOGRAPHIC_FRUSTUM_SIZE;
    this.perspectiveDirection = DEFAULT_CAMERA_POSITION.clone();
    this.setInstance();
  }
  setInstance() {
    this.instance = null;
    this.setCamera(this.options.isOrthographic);

    this.instance.position.copy(DEFAULT_CAMERA_POSITION);

    this.scene.add(this.instance);
  }
  /**
   * 设置当前相机
   * @param {*} isOrthographic true 默认正交相机，false 透视相机
   */
  setCamera(isOrthographic = true, orthographicFrustumSize = null) {
    let aspect = this.sizes.width / this.sizes.height;
    if (isOrthographic) {
      let s = this.getOrthographicFrustumSize(orthographicFrustumSize);
      this.instance = new OrthographicCamera(
        -s * aspect,
        s * aspect,
        s,
        -s,
        1,
        10000
      );
    } else {
      // 透视相机
      this.instance = new PerspectiveCamera(
        DEFAULT_CAMERA_FOV,
        aspect,
        DEFAULT_CAMERA_NEAR,
        DEFAULT_CAMERA_FAR
      );
    }
    this.setControls();
  }
  getOrthographicFrustumSize(size = null) {
    if (Number.isFinite(size) && size > 0) {
      this.orthographicFrustumSize = size;
      return size;
    }

    const target = this.controls?.target ?? new Vector3();
    const position = this.instance?.position ?? DEFAULT_CAMERA_POSITION;
    const distance = position.distanceTo(target);

    if (distance > 0) {
      const fov = this.instance?.isPerspectiveCamera
        ? this.instance.fov
        : DEFAULT_CAMERA_FOV;
      this.orthographicFrustumSize = Math.max(
        distance * Math.tan(MathUtils.degToRad(fov) / 2),
        1
      );
    }

    return this.orthographicFrustumSize;
  }
  setControls() {
    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
    this.controls.update();
  }
  setMode(isOrthographic = false) {
    const nextIsOrthographic = Boolean(isOrthographic);
    if (this.options.isOrthographic === nextIsOrthographic) {
      return;
    }

    const prevPosition = this.instance
      ? this.instance.position.clone()
      : DEFAULT_CAMERA_POSITION.clone();
    const prevTarget = this.controls ? this.controls.target.clone() : new Vector3();
    const prevDirection = prevPosition.clone().sub(prevTarget);
    const prevDistance = Math.max(prevDirection.length(), 1);
    const prevZoom = this.instance?.zoom ?? 1;
    const nextFrustumSize = nextIsOrthographic
      ? this.getOrthographicFrustumSize()
      : null;

    if (this.instance) {
      this.scene.remove(this.instance);
    }
    this.controls?.dispose?.();

    this.options.isOrthographic = nextIsOrthographic;
    this.setCamera(nextIsOrthographic, nextFrustumSize);
    this.instance.zoom = nextIsOrthographic ? prevZoom : 1;
    this.scene.add(this.instance);

    this.controls.target.copy(prevTarget);

    if (nextIsOrthographic && this.options.orthographicTopDown) {
      if (prevDirection.lengthSq() > 0) {
        this.perspectiveDirection.copy(prevDirection);
      }
      this.instance.position.copy(
        prevTarget
          .clone()
          .add(DEFAULT_ORTHOGRAPHIC_DIRECTION.clone().multiplyScalar(prevDistance))
      );
    } else if (!nextIsOrthographic && this.perspectiveDirection.lengthSq() > 0) {
      this.instance.position.copy(prevTarget).add(this.perspectiveDirection);
    } else {
      this.instance.position.copy(prevPosition);
    }

    this.controls.update();
    this.instance.updateProjectionMatrix();
  }
  resize() {
    let aspect = this.sizes.width / this.sizes.height;
    if (this.options.isOrthographic) {
      let s = this.orthographicFrustumSize;
      this.instance.left = -s * aspect;
      this.instance.right = s * aspect;
      this.instance.top = s;
      this.instance.bottom = -s;
    } else {
      this.instance.aspect = aspect;
    }
    this.instance.updateProjectionMatrix();
  }
  update() {
    this.controls.update();
  }
  destroy() {
    this.controls.dispose();
  }
}
