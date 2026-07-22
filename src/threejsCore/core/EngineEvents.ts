import { EventBus } from './EventBus'
import type { EngineEventMap } from './types'

/** Shared entry for modules and integrations that cannot access the engine instance. */
export const engineEvents = new EventBus<EngineEventMap>()
