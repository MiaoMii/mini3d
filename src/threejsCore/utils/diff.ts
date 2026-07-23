export interface PropertyChange<TValue = unknown> {
  previous: TValue | undefined
  current: TValue | undefined
}

export type ObjectDiff<TObject extends object> = Partial<{
  [TKey in Extract<keyof TObject, string>]: PropertyChange<TObject[TKey]>
}>

/**
 * 计算两个配置对象之间发生变化的字段。
 */
export function diff<TObject extends object>(
  previous: TObject,
  current: TObject
): ObjectDiff<TObject> {
  const changes: ObjectDiff<TObject> = {}
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]) as Set<
    Extract<keyof TObject, string>
  >

  keys.forEach((key) => {
    const previousValue = previous[key]
    const currentValue = current[key]

    if (valuesAreEqual(previousValue, currentValue)) return

    changes[key] = {
      previous: previousValue,
      current: currentValue
    }
  })

  return changes
}

/**
 * 递归比较两个配置值是否相等。
 */
function valuesAreEqual(previous: unknown, current: unknown): boolean {
  if (Object.is(previous, current)) return true

  if (Array.isArray(previous) && Array.isArray(current)) {
    return (
      previous.length === current.length &&
      previous.every((value, index) => valuesAreEqual(value, current[index]))
    )
  }

  if (isPlainObject(previous) && isPlainObject(current)) {
    const previousKeys = Object.keys(previous)
    const currentKeys = Object.keys(current)

    return (
      previousKeys.length === currentKeys.length &&
      previousKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(current, key) &&
          valuesAreEqual(previous[key], current[key])
      )
    )
  }

  return false
}

/**
 * 判断值是否为可递归比较的普通对象。
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
