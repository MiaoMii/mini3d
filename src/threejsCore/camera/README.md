# Camera Module

`CameraModule` is the camera layer for `threejsCore`.

It owns:

- perspective and orthographic camera creation
- active camera switching
- `OrbitControls`
- GSAP camera movement animation
- resize projection updates

## Usage

```ts
import { Engine } from "@/threejsCore";
import { createCameraModule } from "@/threejsCore/camera";

const camera = createCameraModule({
  mode: "perspective",
  perspective: {
    position: [10, 10, 10],
    target: [0, 0, 0],
  },
  orthographic: {
    frustumSize: 30,
  },
});

const engine = new Engine({
  canvas,
  modules: [camera],
  autoStart: true,
});
```

## Runtime API

```ts
camera.setMode("orthographic");
camera.setTarget([0, 0, 0]);
camera.setPosition([8, 12, 8]);
camera.moveTo({
  to: {
    position: new Vector3(12, 14, 12),
    target: new Vector3(),
  },
  duration: 1.2,
  easing: "sineInOut",
});
```

`easing` is mapped to GSAP internally:

- `linear` -> `none`
- `sineInOut` -> `sine.inOut`
- `quadInOut` -> `power2.inOut`
- `cubicInOut` -> `power3.inOut`

The module is also registered in `EngineContext` by `serviceKey`, which defaults to `"camera"`.

```ts
const camera = context.get<CameraModule>("camera");
camera.setMode("orthographic");
```
