export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type ColorValue = string | number

export interface MapProjectionConfig {
  center: Vec2
  scale: number
}

export interface MapBorderConfig {
  visible: boolean
  color: ColorValue
  opacity: number
  width: number
  elevation: number
}

export interface MapTransitionConfig {
  duration: number
  ease: string
  initialScale: number
  cameraDuration: number
  cameraEase: string
  flyDistanceScale: number
  flyHeight: number
}

export interface MapLayerConfig {
  id: string
  name: string
  geojson: string
  visible: boolean
  color: ColorValue
  sideColor: ColorValue
  opacity: number
  sideOpacity: number
  depth: number
  scale: number | Vec3
  position: Vec3
  projection: MapProjectionConfig
  border: MapBorderConfig
  transition: MapTransitionConfig
  renderOrder: number
}

export interface DistrictNameStyleConfig {
  background: string
  borderColor: string
  borderRadius: string
  fontWeight: number
  letterSpacing: string
  padding: string
  textShadow: string
}

export interface DistrictNameTransitionConfig {
  duration: number
  ease: string
  stagger: number
  translateY: number
}

export interface DistrictNameLayerConfig {
  visible: boolean
  nameField: string
  positionField: 'center' | 'centroid'
  fontSize: number
  color: ColorValue
  offset: Vec3
  scale: number
  zIndex: number
  className: string
  style: DistrictNameStyleConfig
  transition: DistrictNameTransitionConfig
}

export interface MapCameraConfig {
  position: Vec3
  lookAt: Vec3
}

export interface Mini3dMapConfig {
  id: string
  name: string
  background: ColorValue
  camera: MapCameraConfig
  map: MapLayerConfig
  districtName: DistrictNameLayerConfig
}

export interface MapLayerDiff {
  geojsonChanged: boolean
  geometryChanged: boolean
  visibleChanged: boolean
  transformChanged: boolean
  styleChanged: boolean
  borderChanged: boolean
}

export interface DistrictNameLayerDiff {
  geojsonChanged: boolean
  dataChanged: boolean
  visibleChanged: boolean
  positionChanged: boolean
  styleChanged: boolean
  zIndexChanged: boolean
}

export interface Mini3dMapConfigDiff {
  map: MapLayerDiff
  districtName: DistrictNameLayerDiff
}

export interface GeoJsonFeature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: string
    coordinates: unknown
  }
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}
