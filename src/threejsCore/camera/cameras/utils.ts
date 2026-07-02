import { Vector3 } from "three";
import type { Vector3Value } from "../config";

export function toVector3(value?: Vector3Value, fallback = new Vector3()): Vector3 {
  if (!value) {
    return fallback.clone();
  }

  if (value instanceof Vector3) {
    return value.clone();
  }

  if (Array.isArray(value)) {
    return new Vector3(value[0], value[1], value[2]);
  }

  return new Vector3(value.x, value.y, value.z);
}
