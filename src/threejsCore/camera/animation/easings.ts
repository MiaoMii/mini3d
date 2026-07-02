export type EasingName = "linear" | "sineInOut" | "quadInOut" | "cubicInOut";
export type EasingFunction = (t: number) => number;
export type GsapEase = string | EasingFunction;

export const easings: Record<EasingName, GsapEase> = {
  linear: "none",
  sineInOut: "sine.inOut",
  quadInOut: "power2.inOut",
  cubicInOut: "power3.inOut",
};

export function resolveEasing(easing: EasingName | EasingFunction = "sineInOut"): GsapEase {
  return typeof easing === "function" ? easing : easings[easing];
}
