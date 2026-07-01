import { AxesHelper, GridHelper, Scene, Mesh } from "three";
import { EventEmitter, Sizes, Time } from "../utils";
import { Renderer } from "./Renderer";
import { Camera } from "./Camera";
import { geoMercator } from "d3-geo";
export class Mini3d extends EventEmitter {
  constructor(canvas, config = {}) {
    super();
    let defaultConfig = {
      isOrthographic: false,
    };
    this.config = Object.assign({}, defaultConfig, config);
    this.canvas = canvas;
    this.scene = new Scene();
    this.gridHelper = null;
    this.sizes = new Sizes(this);
    this.time = new Time(this);
    this.camera = new Camera(this, {
      isOrthographic: this.config.isOrthographic,
    });
    this.renderer = new Renderer(this);
    this.sizes.on("resize", () => {
      this.resize();
    });
    this.time.on("tick", (delta) => {
      this.update(delta);
    });
  }
  /**
   * 设置AxesHelper
   * @param {*} size 尺寸
   * @returns
   */
  setAxesHelper(size = 250) {
    if (!size) {
      return false;
    }
    let axes = new AxesHelper(size);
    this.scene.add(axes);
  }
  /**
   * 设置GridHelper
   * @param {{ size?: number, divisions?: number, colorCenterLine?: number, colorGrid?: number }} options
   * @returns
   */
  setGridHelper(options = {}) {
    let {
      size = 100,
      divisions = 20,
      colorCenterLine = 0x1b4b70,
      colorGrid = 0x173240,
    } = options;

    if (!size || !divisions) {
      return false;
    }

    this.removeGridHelper();
    this.gridHelper = new GridHelper(
      size,
      divisions,
      colorCenterLine,
      colorGrid
    );
    this.gridHelper.name = "GridHelper";
    this.gridHelper.position.y = -0.02;
    this.scene.add(this.gridHelper);
  }
  removeGridHelper() {
    if (!this.gridHelper) return;

    this.gridHelper.parent?.remove(this.gridHelper);
    this.gridHelper.geometry?.dispose?.();

    if (Array.isArray(this.gridHelper.material)) {
      this.gridHelper.material.forEach((material) => material.dispose?.());
    } else {
      this.gridHelper.material?.dispose?.();
    }

    this.gridHelper = null;
  }
  resize() {
    this.camera.resize();
    this.renderer.resize();
  }
  update(delta) {
    this.camera.update(delta);
    this.renderer.update(delta);
  }
  /**
   * 销毁
   */
  destroy() {
    this.sizes.destroy();
    this.time.destroy();
    this.camera.destroy();
    this.renderer.destroy();
    this.removeGridHelper();
    this.scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        for (const key in child.material) {
          const value = child.material[key];
          if (value && typeof value.dispose === "function") {
            value.dispose();
          }
        }
      }
    });
    this.canvas.parentNode.removeChild(this.canvas);
  }
}
