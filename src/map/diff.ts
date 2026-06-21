import type { Mini3dMapConfig, Mini3dMapConfigDiff } from '@/types/map'

function sameConfigValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function diffMini3dMapConfig(
  prev: Mini3dMapConfig,
  next: Mini3dMapConfig,
): Mini3dMapConfigDiff {
  const geojsonChanged = prev.map.geojson !== next.map.geojson
  const projectionChanged = !sameConfigValue(prev.map.projection, next.map.projection)
  const depthChanged = prev.map.depth !== next.map.depth

  return {
    map: {
      geojsonChanged,
      geometryChanged: geojsonChanged || projectionChanged || depthChanged,
      visibleChanged: prev.map.visible !== next.map.visible,
      transformChanged:
        !sameConfigValue(prev.map.position, next.map.position) ||
        !sameConfigValue(prev.map.scale, next.map.scale),
      styleChanged:
        prev.map.color !== next.map.color ||
        prev.map.sideColor !== next.map.sideColor ||
        prev.map.opacity !== next.map.opacity ||
        prev.map.sideOpacity !== next.map.sideOpacity ||
        prev.map.renderOrder !== next.map.renderOrder,
      borderChanged: !sameConfigValue(prev.map.border, next.map.border),
    },
    districtName: {
      geojsonChanged,
      dataChanged:
        geojsonChanged ||
        prev.districtName.nameField !== next.districtName.nameField ||
        prev.districtName.positionField !== next.districtName.positionField ||
        projectionChanged,
      visibleChanged: prev.districtName.visible !== next.districtName.visible,
      positionChanged: !sameConfigValue(prev.districtName.offset, next.districtName.offset),
      styleChanged:
        prev.districtName.fontSize !== next.districtName.fontSize ||
        prev.districtName.color !== next.districtName.color ||
        prev.districtName.scale !== next.districtName.scale ||
        prev.districtName.className !== next.districtName.className ||
        !sameConfigValue(prev.districtName.style, next.districtName.style),
      zIndexChanged: prev.districtName.zIndex !== next.districtName.zIndex,
    },
  }
}
