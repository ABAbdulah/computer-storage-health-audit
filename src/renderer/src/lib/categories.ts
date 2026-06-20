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

/**
 * How safe each category is to delete. Drives the colored badge so users can
 * tell at a glance what's reclaimable vs what they should leave alone.
 *   safe    — regenerates / pure cache, delete freely
 *   caution — your own data or needs the right tool, review first
 *   keep    — don't delete directly (uninstall / use Windows tools)
 */
export type SafetyLevel = 'safe' | 'caution' | 'keep'

export const CATEGORY_SAFETY: Record<Category, { level: SafetyLevel; label: string; hint: string }> = {
  temp: { level: 'safe', label: 'Safe to clear', hint: 'Caches & temp files — Windows and apps recreate them as needed.' },
  dev: { level: 'safe', label: 'Safe to delete', hint: 'node_modules, build output & caches rebuild on the next install/build.' },
  media: { level: 'caution', label: 'Your files — review', hint: 'Personal photos, video & audio. Back up or move to the cloud before deleting.' },
  user: { level: 'caution', label: 'Your files — review', hint: 'Documents, Downloads & Desktop. Check each item before removing.' },
  docker: { level: 'caution', label: 'Use proper tools', hint: 'Don’t delete the .vhdx directly — prune images or purge data via Docker Desktop.' },
  other: { level: 'caution', label: 'Review individually', hint: 'Mixed contents — open each item and decide case by case.' },
  apps: { level: 'keep', label: 'Uninstall instead', hint: 'Remove programs via Settings → Apps, not by deleting their folders.' },
  system: { level: 'keep', label: 'Don’t delete', hint: 'Windows system files. Use Disk Cleanup / Storage Sense instead.' }
}

/** Tailwind classes for each safety level's badge. */
export const SAFETY_STYLE: Record<SafetyLevel, string> = {
  safe: 'bg-positive/15 text-positive',
  caution: 'bg-warning/15 text-warning',
  keep: 'bg-danger/15 text-danger'
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
