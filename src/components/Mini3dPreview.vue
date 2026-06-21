<template>
  <section class="mini3d-preview">
    <div class="mini3d-preview__meta">
      <div>
        <span class="mini3d-preview__label">当前地图</span>
        <strong>{{ activeName }}</strong>
      </div>
      <span v-if="loading" class="mini3d-preview__state">加载中</span>
      <span
        v-else-if="errorMessage"
        class="mini3d-preview__state mini3d-preview__state--error"
      >
        {{ errorMessage }}
      </span>
      <span v-else class="mini3d-preview__state">{{ activeId }}</span>
    </div>
    <div class="mini3d-preview__viewport">
      <canvas ref="canvasRef" class="mini3d-preview__canvas" />
    </div>
  </section>
</template>

<script setup lang="ts">
import gsap from "gsap";
import {
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type WatchStopHandle,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { AmbientLight, Color, DirectionalLight, Vector3 } from "three";
import { Mini3d } from "@/mini3d";
import {
  defaultMapConfigId,
  getMapConfig,
  loadMapGeoJson,
  mapConfigIds,
} from "@/config/map";
import { diffMini3dMapConfig } from "@/map/diff";
import { DistrictNameLayer } from "@/map/layers/DistrictNameLayer";
import { MapLayer, type MapViewBounds } from "@/map/layers/MapLayer";
import type { Mini3dMapConfig } from "@/types/map";
import type { Mini3dLike } from "@/map/utils";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const route = useRoute();
const router = useRouter();
const activeName = ref("...");
const activeId = ref(defaultMapConfigId);
const loading = ref(false);
const errorMessage = ref("");

let app: InstanceType<typeof Mini3d> | null = null;
let mapLayer: MapLayer | null = null;
let districtNameLayer: DistrictNameLayer | null = null;
let currentConfig: Mini3dMapConfig | null = null;
let currentGeoJsonText = "";
let requestSeq = 0;
let pendingCameraTransitionResolve: (() => void) | null = null;
let stopRouteWatch: WatchStopHandle | null = null;

onMounted(() => {
  if (!canvasRef.value) return;

  app = new Mini3d(canvasRef.value);
  app.scene.background = new Color("#08131f");
  setupSceneLight();

  const mini3dApp = app as unknown as Mini3dLike;
  mapLayer = new MapLayer(mini3dApp);
  districtNameLayer = new DistrictNameLayer(mini3dApp);

  window.addEventListener("keydown", handleKeydown);
  stopRouteWatch = watch(
    () => route.params.id,
    (id) => {
      void applyRouteConfig(String(id || defaultMapConfigId));
    },
    { immediate: true },
  );
});

onBeforeUnmount(() => {
  requestSeq += 1;
  stopRouteWatch?.();
  window.removeEventListener("keydown", handleKeydown);
  stopSceneAnimations();
  districtNameLayer?.destory();
  mapLayer?.destory();
  app?.destroy();
  districtNameLayer = null;
  mapLayer = null;
  app = null;
});

function setupSceneLight() {
  if (!app) return;

  app.scene.add(new AmbientLight(0xffffff, 3.8));

  const light = new DirectionalLight(0xffffff, 4.2);
  light.position.set(-8, 16, 12);
  app.scene.add(light);
}

async function applyRouteConfig(id: string) {
  debugger;
  if (!app || !mapLayer || !districtNameLayer) return;

  const seq = ++requestSeq;
  loading.value = true;
  errorMessage.value = "";

  try {
    const nextConfig = await getMapConfig(id);
    const diff = currentConfig
      ? diffMini3dMapConfig(currentConfig, nextConfig)
      : null;
    let nextGeoJsonText = currentGeoJsonText;

    if (!currentConfig || diff?.map.geojsonChanged) {
      nextGeoJsonText = await loadMapGeoJson(nextConfig.map.geojson);
    }

    if (seq !== requestSeq) return;

    const useCameraTransition = Boolean(currentConfig);
    const cameraDepart = useCameraTransition
      ? playCameraDepartTransition(nextConfig, mapLayer.getViewBounds())
      : Promise.resolve();

    if (!currentConfig || !diff) {
      mapLayer.create(nextConfig.map, nextGeoJsonText);
      districtNameLayer.create(
        nextConfig.districtName,
        nextGeoJsonText,
        nextConfig.map.projection,
      );
    } else {
      const mapReady = mapLayer.update(
        nextConfig.map,
        diff.map,
        nextGeoJsonText,
      );
      districtNameLayer.update(
        nextConfig.districtName,
        diff.districtName,
        nextGeoJsonText,
        nextConfig.map.projection,
      );
      await Promise.all([cameraDepart, mapReady]);
    }

    if (seq !== requestSeq) return;

    applySceneConfig(nextConfig, mapLayer.getViewBounds(), useCameraTransition);

    currentConfig = nextConfig;
    currentGeoJsonText = nextGeoJsonText;
    activeName.value = nextConfig.name;
    activeId.value = nextConfig.id;
  } catch (error) {
    if (seq !== requestSeq) return;
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    if (seq === requestSeq) {
      loading.value = false;
    }
  }
}

function playCameraDepartTransition(
  config: Mini3dMapConfig,
  bounds: MapViewBounds | null,
) {
  if (!app) return Promise.resolve();

  const camera = app.camera.instance;
  if (!camera) return Promise.resolve();

  const controls = app.camera.controls;
  const currentTarget =
    controls?.target.clone() ?? bounds?.center.clone() ?? new Vector3();
  const departPosition = getCameraFlyPosition(
    config,
    camera.position,
    currentTarget,
    bounds,
  );
  const duration = config.map.transition.cameraDuration * 0.42;
  const ease = "power2.inOut";

  stopSceneAnimations();

  return new Promise<void>((resolve) => {
    pendingCameraTransitionResolve = resolve;
    gsap.to(camera.position, {
      x: departPosition.x,
      y: departPosition.y,
      z: departPosition.z,
      duration,
      ease,
      onUpdate: () => {
        if (controls) {
          controls.update();
        } else {
          camera.lookAt(currentTarget);
        }
      },
      onComplete: () => {
        if (pendingCameraTransitionResolve === resolve) {
          pendingCameraTransitionResolve = null;
        }
        resolve();
      },
    });
  });
}

function applySceneConfig(
  config: Mini3dMapConfig,
  bounds: MapViewBounds | null,
  useCameraTransition: boolean,
) {
  if (!app) return;

  const camera = app.camera.instance;
  if (!camera) return;

  const target = bounds?.center.clone() ?? new Vector3(...config.camera.lookAt);
  const cameraPosition = getCameraPosition(config, target, bounds);
  const controls = app.camera.controls;
  const duration = useCameraTransition
    ? config.map.transition.cameraDuration * 0.58
    : config.map.transition.duration;
  const ease = useCameraTransition
    ? config.map.transition.cameraEase
    : config.map.transition.ease;
  const background = new Color(config.background);

  stopSceneAnimations();

  if (app.scene.background instanceof Color) {
    gsap.to(app.scene.background, {
      r: background.r,
      g: background.g,
      b: background.b,
      duration,
      ease,
    });
  } else {
    app.scene.background = background;
  }

  gsap.to(camera.position, {
    x: cameraPosition.x,
    y: cameraPosition.y,
    z: cameraPosition.z,
    duration,
    ease,
    onUpdate: () => {
      if (controls) {
        controls.update();
      } else {
        camera.lookAt(target);
      }
    },
  });

  if (controls) {
    gsap.to(controls.target, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration,
      ease,
      onUpdate: () => {
        controls.update();
      },
    });
  } else {
    camera.lookAt(target);
  }

  camera.updateProjectionMatrix();
}

function getCameraPosition(
  config: Mini3dMapConfig,
  target: Vector3,
  bounds: MapViewBounds | null,
) {
  const configuredLookAt = new Vector3(...config.camera.lookAt);
  const configuredPosition = new Vector3(...config.camera.position);
  const direction = configuredPosition.sub(configuredLookAt);
  const configuredDistance = Math.max(direction.length(), 1);
  const maxMapSize = bounds ? Math.max(bounds.size.x, bounds.size.z) : 0;
  const fitDistance = maxMapSize * 1.18;
  const distance = Math.max(configuredDistance, fitDistance);

  return target.clone().add(direction.normalize().multiplyScalar(distance));
}

function getCameraFlyPosition(
  config: Mini3dMapConfig,
  currentPosition: Vector3,
  currentTarget: Vector3,
  bounds: MapViewBounds | null,
) {
  const direction = currentPosition.clone().sub(currentTarget);

  if (direction.length() < 1) {
    direction.copy(
      new Vector3(...config.camera.position).sub(
        new Vector3(...config.camera.lookAt),
      ),
    );
  }

  const currentDistance = Math.max(
    currentPosition.distanceTo(currentTarget),
    1,
  );
  const maxMapSize = bounds ? Math.max(bounds.size.x, bounds.size.z) : 0;
  const fitDistance = maxMapSize * 1.18;
  const flyDistance =
    Math.max(currentDistance, fitDistance) *
    config.map.transition.flyDistanceScale;

  return currentTarget
    .clone()
    .add(direction.normalize().multiplyScalar(flyDistance))
    .add(new Vector3(0, config.map.transition.flyHeight, 0));
}

function stopSceneAnimations() {
  if (!app) return;

  pendingCameraTransitionResolve?.();
  pendingCameraTransitionResolve = null;

  const targets: unknown[] = [];
  const camera = app.camera.instance;

  if (camera) {
    targets.push(camera.position);
  }

  if (app.camera.controls?.target) {
    targets.push(app.camera.controls.target);
  }

  if (app.scene.background instanceof Color) {
    targets.push(app.scene.background);
  }

  if (targets.length > 0) {
    gsap.killTweensOf(targets);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

  event.preventDefault();

  const routeId = String(
    route.params.id || currentConfig?.id || defaultMapConfigId,
  );
  const currentIndex = Math.max(mapConfigIds.indexOf(routeId), 0);
  const offset = event.key === "ArrowDown" ? 1 : -1;
  const nextIndex =
    (currentIndex + offset + mapConfigIds.length) % mapConfigIds.length;
  const nextId = mapConfigIds[nextIndex];

  if (nextId && nextId !== routeId) {
    void router.push(`/map/${nextId}`);
  }
}
</script>

<style scoped>
.mini3d-preview {
  display: grid;
  width: min(1040px, calc(100vw - 48px));
  gap: 12px;
}

.mini3d-preview__meta {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  min-height: 44px;
}

.mini3d-preview__label {
  display: block;
  color: #5b7069;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.mini3d-preview__meta strong {
  display: block;
  margin-top: 2px;
  color: #15211d;
  font-size: 24px;
  line-height: 1.1;
  letter-spacing: 0;
}

.mini3d-preview__state {
  max-width: 42%;
  overflow: hidden;
  color: #3e5f56;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini3d-preview__state--error {
  color: #b13c3c;
}

.mini3d-preview__viewport {
  position: relative;
  height: min(620px, calc(100vh - 220px));
  min-height: 380px;
  overflow: hidden;
  border: 1px solid rgba(92, 106, 125, 0.26);
  border-radius: 8px;
  background: #07131d;
}

.mini3d-preview__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

:deep(.district-name-label) {
  position: absolute;
  color: #fff;
  font-family: Inter, "Segoe UI", sans-serif;
  line-height: 1;
  pointer-events: none;
  white-space: nowrap;
  will-change: transform;
}

:deep(.district-name-label__text) {
  display: inline-block;
}

@media (max-width: 640px) {
  .mini3d-preview {
    width: min(100%, calc(100vw - 32px));
  }

  .mini3d-preview__meta {
    align-items: start;
    flex-direction: column;
  }

  .mini3d-preview__state {
    max-width: 100%;
  }
}
</style>
