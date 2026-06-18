import type { Category } from '@shared/types'
import { CATEGORY_LABELS } from '@shared/types'
import {
  Cpu,
  Boxes,
  User,
  Container,
  Code2,
  Clapperboard,
  Trash2,
  Shapes,
  type LucideIcon
} from 'lucide-react'

export { CATEGORY_LABELS }

/** CSS variable name (without the var()) backing each category color. */
export const CATEGORY_VAR: Record<Category, string> = {
  system: '--cat-system',
  apps: '--cat-apps',
  user: '--cat-user',
  docker: '--cat-docker',
  dev: '--cat-dev',
  media: '--cat-media',
  temp: '--cat-temp',
  other: '--cat-other'
}

/** Resolve a category color to an rgb() string with optional alpha. */
export function catColor(cat: Category, alpha = 1): string {
  return `rgb(var(${CATEGORY_VAR[cat]}) / ${alpha})`
}

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  system: Cpu,
  apps: Boxes,
  user: User,
  docker: Container,
  dev: Code2,
  media: Clapperboard,
  temp: Trash2,
  other: Shapes
}

export const CATEGORY_DESCRIPTION: Record<Category, string> = {
  system: 'Windows, WinSxS, System32',
  apps: 'Program Files & installed apps',
  user: 'Documents, Downloads, Desktop',
  docker: 'Docker & WSL virtual disks',
  dev: 'node_modules, .git, build output',
  media: 'Video, images, audio, ISOs',
  temp: 'Temp folders & browser caches',
  other: 'Everything else'
}
