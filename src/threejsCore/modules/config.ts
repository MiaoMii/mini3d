export interface ModuleDefaultConfig<
  TEnterAnimation extends AnimationConfig = AnimationConfig,
  TLeaveAnimation extends AnimationConfig = AnimationConfig
> {
  id?: string
  dataSourceId?: string
  name?: string
  visible?: boolean
  renderOrder?: number
  transitionDuration?: number
  transitionEase?: string
  enterAnimation?: TEnterAnimation
  leaveAnimation?: TLeaveAnimation
}

export interface AnimationConfig {
  enabled?: boolean
  duration?: number
  ease?: string
}
