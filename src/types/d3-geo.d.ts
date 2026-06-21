declare module 'd3-geo' {
  interface GeoProjection {
    (coordinates: [number, number]): [number, number]
    center(center: [number, number]): GeoProjection
    scale(scale: number): GeoProjection
    translate(translate: [number, number]): GeoProjection
  }

  export function geoMercator(): GeoProjection
}
