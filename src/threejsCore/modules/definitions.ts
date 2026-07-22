import type { SceneModuleDefinition } from './types'
import { findSceneCoreDefinition, sceneCoreDefinitions } from './coreSettings'

interface SceneModuleDefinitionFile {
  moduleDefinition?: unknown
}

const definitionFiles = import.meta.glob<SceneModuleDefinitionFile>('./*/index.ts', {
  eager: true
})

export const sceneModuleDefinitions = Object.values(definitionFiles)
  .map((definitionFile) => definitionFile.moduleDefinition)
  .filter(isSceneModuleDefinition)

export function findSceneModuleDefinition(type: string) {
  return sceneModuleDefinitions.find((definition) => definition.type === type)
}

export const sceneEditorDefinitions = [...sceneCoreDefinitions, ...sceneModuleDefinitions]

export function findSceneEditorDefinition(type: string) {
  return findSceneCoreDefinition(type) ?? findSceneModuleDefinition(type)
}

function isSceneModuleDefinition(definition: unknown): definition is SceneModuleDefinition {
  if (!definition || typeof definition !== 'object') return false

  const candidate = definition as Record<string, unknown>

  return (
    typeof candidate.type === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.styleSchema === 'object' &&
    typeof candidate.create === 'function'
  )
}
