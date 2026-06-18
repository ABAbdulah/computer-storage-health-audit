import type { Category } from './types'

/**
 * Smart categorization rules. Given an absolute path (and whether it's a
 * directory plus an optional file extension), return the best-fit category.
 *
 * Pure string logic only — safe to use from a worker thread.
 */

const MEDIA_EXT = new Set([
  '.mp4',
  '.mkv',
  '.mov',
  '.avi',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
  '.mpg',
  '.mpeg',
  '.iso',
  '.img',
  '.vob',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.webp',
  '.heic',
  '.raw',
  '.cr2',
  '.nef',
  '.mp3',
  '.flac',
  '.wav',
  '.aac',
  '.ogg',
  '.m4a',
  '.psd',
  '.ai'
])

const DEV_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'target',
  '.gradle',
  '.cargo',
  '.m2',
  'vendor',
  '.pytest_cache',
  '.mypy_cache',
  'bower_components',
  '.tox',
  'coverage',
  '.parcel-cache',
  '.turbo'
])

const TEMP_DIR_NAMES = new Set([
  'temp',
  'tmp',
  'cache',
  'caches',
  'logs',
  'crashdumps',
  'gpucache',
  'code cache',
  'service worker'
])

function lower(s: string): string {
  return s.toLowerCase()
}

/** Normalize a Windows or POSIX path into lowercase, forward-slash form. */
export function normalize(p: string): string {
  return lower(p).replace(/\\/g, '/')
}

export interface CategorizeInput {
  path: string
  name: string
  isDir: boolean
  ext?: string
  /** Optional: the category inherited from the parent directory. */
  parentCategory?: Category
}

export function categorize(input: CategorizeInput): Category {
  const np = normalize(input.path)
  const name = lower(input.name)

  // --- Docker (highest priority — the VHDX is the classic hidden hog) ---
  if (
    name === 'ext4.vhdx' ||
    name === 'docker_data.vhdx' ||
    np.includes('/programdata/docker') ||
    np.includes('/docker/wsl') ||
    np.includes('/dockerdesktop') ||
    np.includes('/docker desktop') ||
    np.includes('/wsl/') ||
    np.includes('/canonicalgroup') ||
    np.includes('/.docker/')
  ) {
    return 'docker'
  }

  // --- Windows System ---
  if (
    /\/windows\//.test(np) ||
    /\/windows$/.test(np) ||
    np.includes('/winsxs') ||
    np.includes('/system32') ||
    np.includes('/syswow64') ||
    np.includes('/$recycle.bin') ||
    np.includes('/system volume information') ||
    np.includes('/programdata/microsoft/windows') ||
    name === 'pagefile.sys' ||
    name === 'hiberfil.sys' ||
    name === 'swapfile.sys'
  ) {
    return 'system'
  }

  // --- Temp / Cache ---
  if (
    np.includes('/appdata/local/temp') ||
    np.includes('/windows/temp') ||
    np.includes('/softwaredistribution') ||
    np.includes('/google/chrome/user data/default/cache') ||
    np.includes('/microsoft/edge/user data/default/cache') ||
    np.includes('/mozilla/firefox') && np.includes('cache') ||
    TEMP_DIR_NAMES.has(name)
  ) {
    return 'temp'
  }

  // --- Dev ---
  if (DEV_DIR_NAMES.has(name)) {
    return 'dev'
  }

  // --- Apps ---
  if (
    np.includes('/program files (x86)') ||
    np.includes('/program files') ||
    np.includes('/appdata/local/programs') ||
    np.includes('/appdata/roaming') && (name.endsWith('.exe') || input.isDir)
  ) {
    return 'apps'
  }

  // --- User data (Downloads, Documents, Desktop, Pictures, etc.) ---
  if (
    /\/users\/[^/]+\/(downloads|documents|desktop|pictures|videos|music|onedrive)/.test(
      np
    )
  ) {
    // Media folders that are dominated by media files get reclassified at the
    // aggregation step; default user dirs stay "user".
    return 'user'
  }

  // --- Media (by extension) ---
  if (!input.isDir && input.ext && MEDIA_EXT.has(input.ext)) {
    return 'media'
  }

  // Inherit from parent when nothing else matched (keeps subtrees coherent).
  if (input.parentCategory && input.parentCategory !== 'other') {
    return input.parentCategory
  }

  return 'other'
}

/** Fraction of a directory's bytes that must be media to flip it to "media". */
export const MEDIA_DOMINANCE_THRESHOLD = 0.6
