/**
 * 返回未经缓动处理的线性进度。
 */
export const linear = (time: number): number => time

/**
 * 计算缓入缓出的三次插值进度。
 */
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
