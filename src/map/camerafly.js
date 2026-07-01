/**
 * cameraFly — Three.js 丝滑镜头补间
 *
 * 在起始相机状态和结束相机状态之间平滑过渡：位置 + 朝向 + FOV。
 * 朝向支持两种写法（二选一，结束态和起始态各自独立）：
 *   1) lookAt: 一个注视点 {x,y,z}（相机始终看向它）
 *   2) rotation: 欧拉角 {x,y,z}（弧度，直接给相机的旋转）
 *
 * @param {THREE.Camera} camera      要驱动的相机
 * @param {Object}       opts
 *   --- 起始态（可省略，省略则用相机当前状态）---
 *   @param {{x,y,z}} [opts.fromPos]      起始位置
 *   @param {{x,y,z}} [opts.fromLookAt]   起始注视点
 *   @param {{x,y,z}} [opts.fromRotation] 起始欧拉角（弧度），与 fromLookAt 二选一
 *   @param {number}  [opts.fromFov]      起始 FOV
 *   --- 结束态（必填位置，朝向二选一）---
 *   @param {{x,y,z}} opts.toPos          结束位置
 *   @param {{x,y,z}} [opts.toLookAt]     结束注视点
 *   @param {{x,y,z}} [opts.toRotation]   结束欧拉角（弧度），与 toLookAt 二选一
 *   @param {number}  [opts.toFov]        结束 FOV
 *   --- 时间 / 速度 ---
 *   @param {number}  [opts.duration=1200] 时长（毫秒）。与 speed 二选一
 *   @param {number}  [opts.speed]         速度（世界单位/秒）；给了就按距离自动算时长，覆盖 duration
 *   @param {number}  [opts.delay=0]       开始前延迟（毫秒）
 *   --- 曲线 / 回调 ---
 *   @param {string|function} [opts.easing='easeInOutCubic'] 缓动名或自定义 t=>t
 *   @param {function} [opts.onStart]      开始时回调
 *   @param {function} [opts.onUpdate]     每帧回调 (progress 0..1)
 *   @param {function} [opts.onComplete]   完成时回调
 *
 * @returns {{cancel:function, finish:function, done:Promise}}
 *   cancel(): 立即停在当前帧；finish(): 跳到终点；done: 完成后 resolve 的 Promise
 *
 * 用法：
 *   const fly = makeCameraFly(camera);            // 绑定一个相机，得到 fly()
 *   // 在你的渲染循环里调用一次： fly.update();
 *   fly({ toPos:{x:0,y:40,z:30}, toLookAt:{x:0,y:0,z:0}, speed:60 });
 */

import * as THREE from "three";

// ---- 缓动库 ----
const Easings = {
  linear:        t => t,
  easeInQuad:    t => t*t,
  easeOutQuad:   t => 1-(1-t)*(1-t),
  easeInOutQuad: t => t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2,
  easeInCubic:   t => t*t*t,
  easeOutCubic:  t => 1-Math.pow(1-t,3),
  easeInOutCubic:t => t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2,
  easeInOutQuart:t => t<0.5 ? 8*t*t*t*t : 1-Math.pow(-2*t+2,4)/2,
  easeOutBack:   t => { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); },
  easeInOutSine: t => -(Math.cos(Math.PI*t)-1)/2,
};

/**
 * 给一个相机创建 fly 控制器。
 * 返回的 fly 既是“启动补间”的函数，也带 .update() 供渲染循环调用。
 */
export function makeCameraFly(camera) {
  let active = null;   // 当前补间

  const V = (o, dx=0, dy=0, dz=0) =>
    new THREE.Vector3(o?.x ?? dx, o?.y ?? dy, o?.z ?? dz);

  function fly(opts) {
    // 起始态：未给则取相机当前
    const fromPos = opts.fromPos ? V(opts.fromPos) : camera.position.clone();
    const fromFov = opts.fromFov ?? camera.fov;

    // 起始朝向 -> 统一转成四元数
    const fromQuat = new THREE.Quaternion();
    if (opts.fromRotation) {
      fromQuat.setFromEuler(new THREE.Euler(
        opts.fromRotation.x||0, opts.fromRotation.y||0, opts.fromRotation.z||0));
    } else if (opts.fromLookAt) {
      const m = new THREE.Matrix4().lookAt(fromPos, V(opts.fromLookAt), camera.up);
      fromQuat.setFromRotationMatrix(m);
    } else {
      fromQuat.copy(camera.quaternion);
    }

    // 结束态
    const toPos = V(opts.toPos);
    const toFov = opts.toFov ?? fromFov;
    const toQuat = new THREE.Quaternion();
    if (opts.toRotation) {
      toQuat.setFromEuler(new THREE.Euler(
        opts.toRotation.x||0, opts.toRotation.y||0, opts.toRotation.z||0));
    } else if (opts.toLookAt) {
      const m = new THREE.Matrix4().lookAt(toPos, V(opts.toLookAt), camera.up);
      toQuat.setFromRotationMatrix(m);
    } else {
      toQuat.copy(fromQuat); // 不给朝向则保持
    }

    // 时长：speed 优先（按位移距离换算）
    let duration = opts.duration ?? 1200;
    if (opts.speed && opts.speed > 0) {
      const dist = fromPos.distanceTo(toPos);
      duration = (dist / opts.speed) * 1000;
      if (duration < 1) duration = 1;
    }

    const ease = typeof opts.easing === 'function'
      ? opts.easing
      : (Easings[opts.easing] || Easings.easeInOutCubic);

    let resolveDone;
    const done = new Promise(res => resolveDone = res);

    active = {
      fromPos, toPos, fromQuat, toQuat, fromFov, toFov,
      duration, delay: opts.delay ?? 0, ease,
      onStart: opts.onStart, onUpdate: opts.onUpdate, onComplete: opts.onComplete,
      elapsed: 0, started: false, resolveDone,
    };

    return {
      cancel() { if (active) { active = null; resolveDone(); } },
      finish() { if (active) { active.elapsed = active.delay + active.duration; } },
      done,
    };
  }

  // 渲染循环里每帧调用一次。dtMs 可不传（用内部时钟）。
  let last = performance.now();
  fly.update = function (dtMs) {
    const now = performance.now();
    const dt = dtMs ?? (now - last);
    last = now;
    if (!active) return;

    const a = active;
    a.elapsed += dt;

    if (a.elapsed < a.delay) return;
    if (!a.started) { a.started = true; a.onStart && a.onStart(); }

    const raw = (a.elapsed - a.delay) / a.duration;
    const t = Math.min(raw, 1);
    const k = a.ease(t);

    camera.position.lerpVectors(a.fromPos, a.toPos, k);
    camera.quaternion.copy(a.fromQuat).slerp(a.toQuat, k);
    if (a.fromFov !== a.toFov) {
      camera.fov = a.fromFov + (a.toFov - a.fromFov) * k;
      camera.updateProjectionMatrix();
    }
    a.onUpdate && a.onUpdate(k);

    if (t >= 1) {
      const cb = a.onComplete, res = a.resolveDone;
      active = null;
      cb && cb();
      res && res();
    }
  };

  fly.isPlaying = () => !!active;
  return fly;
}
