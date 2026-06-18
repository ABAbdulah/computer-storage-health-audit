import type { SpaceScopeApi } from '@shared/types'

declare global {
  interface Window {
    spacescope: SpaceScopeApi
  }
}

export {}
