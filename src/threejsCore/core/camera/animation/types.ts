import type { Vector3 } from 'three'
import type { Vector3Value } from '../config'

export type CameraEasingFunction = (time: number) => number

export interface CameraOrientation {
  target?: Vector3Value
  direction?: Vector3Value
  up?: Vector3Value
  heading?: number
  pitch?: number
  roll?: number
  range?: number
}

export interface CameraPose {
  position: Vector3
  target: Vector3
  up: Vector3
}

export interface SetViewOptions {
  destination?: Vector3Value
  target?: Vector3Value
  orientation?: CameraOrientation
}

export interface FlyToOptions extends Omit<SetViewOptions, 'destination'> {
  destination: Vector3Value
  duration?: number
  maximumHeight?: number
  easingFunction?: CameraEasingFunction
  complete?: () => void
  cancel?: () => void
}

export interface HeadingPitchRange {
  heading?: number
  pitch?: number
  range?: number
}

export interface BoundingSphereValue {
  center: Vector3Value
  radius: number
}

export interface FlyToBoundingSphereOptions
  extends Omit<FlyToOptions, 'destination' | 'target' | 'orientation'> {
  offset?: HeadingPitchRange
}

export interface CameraFlightOptions {
  duration: number
  maximumHeight?: number
  easingFunction: CameraEasingFunction
  complete?: () => void
  cancel?: () => void
}
