export const linear = (time: number): number => time

export const cubicInOut = (time: number): number => {
  if (time < 0.5) {
    return 4 * time * time * time
  }

  return 1 - Math.pow(-2 * time + 2, 3) / 2
}

export const CameraEasing = {
  linear,
  cubicInOut
} as const
