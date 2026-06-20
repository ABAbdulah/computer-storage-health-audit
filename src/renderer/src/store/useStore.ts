import { create } from 'zustand'
import type {
  DriveInfo,
  QuickWins,
  ScanNode,
  ScanProgress,
  ScanResult,
  ScanStatus,
  Category,
  DockerInfo,
  DockerActionType,
  CleanResult
} from '@shared/types'
import { findNode } from '@/lib/tree'

export type ViewMode = 'treemap' | 'list'
export type Theme = 'light' | 'dark'

const THEME_KEY = 'spacescope-theme'

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light' // light is the default per spec
}

let initialized = false

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_KEY, theme)
}

interface State {
  // Theme
  theme: Theme
  toggleTheme: () => void

  // Drives
  drives: DriveInfo[]
  activeDrive: string | null
  loadDrives: () => Promise<void>
  setActiveDrive: (path: string) => void

  // Scan
  status: ScanStatus
  progress: ScanProgress | null
  result: ScanResult | null
  error: string | null
  startScan: (drivePath: string) => Promise<void>
  cancelScan: () => Promise<void>

  // Navigation / drill-down
  currentPath: string | null
  navigateTo: (path: string) => void
  drillInto: (node: ScanNode) => void

  // View
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  search: string
  setSearch: (s: string) => void
  categoryFilter: Category | null
  setCategoryFilter: (c: Category | null) => void

  // Right panel
  rightPanelOpen: boolean
  toggleRightPanel: () => void
  quickWins: QuickWins | null
  quickWinsLoading: boolean
  loadQuickWins: (drivePath: string) => Promise<void>

  // Docker
  dockerInfo: DockerInfo | null
  dockerLoading: boolean
  dockerBusyId: string | null
  loadDockerInfo: () => Promise<void>
  runDockerAction: (action: DockerActionType, id?: string) => Promise<{ ok: boolean; error?: string }>

  // Safe Clean
  cleaning: boolean
  runClean: (paths: string[]) => Promise<CleanResult>
  cleanQuickWin: (id: string, path?: string) => Promise<CleanResult>

  // Actions
  openInExplorer: (path: string) => Promise<void>
  init: () => void

  // Derived helper
  currentNode: () => ScanNode | null
}

export const useStore = create<State>((set, get) => ({
  theme: 'light',
  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    set({ theme: next })
  },

  drives: [],
  activeDrive: null,
  loadDrives: async () => {
    const drives = await window.spacescope.getDrives()
    set({ drives })
    if (!get().activeDrive && drives.length) {
      set({ activeDrive: drives[0].path })
    }
  },
  setActiveDrive: (path) => set({ activeDrive: path }),

  status: 'idle',
  progress: null,
  result: null,
  error: null,
  startScan: async (drivePath) => {
    set({ status: 'scanning', progress: null, error: null })
    set({ activeDrive: drivePath })
    await window.spacescope.startScan(drivePath)
  },
  cancelScan: async () => {
    await window.spacescope.cancelScan()
    set({ status: 'idle', progress: null })
  },

  currentPath: null,
  navigateTo: (path) => set({ currentPath: path }),
  drillInto: (node) => {
    if (node.isDir && node.children && node.children.length) {
      set({ currentPath: node.path })
    }
  },

  viewMode: 'treemap',
  setViewMode: (m) => set({ viewMode: m }),
  search: '',
  setSearch: (s) => set({ search: s }),
  categoryFilter: null,
  setCategoryFilter: (c) => set({ categoryFilter: get().categoryFilter === c ? null : c }),

  rightPanelOpen: true,
  toggleRightPanel: () => set({ rightPanelOpen: !get().rightPanelOpen }),
  quickWins: null,
  quickWinsLoading: false,
  loadQuickWins: async (drivePath) => {
    set({ quickWinsLoading: true })
    try {
      const qw = await window.spacescope.getQuickWins(drivePath)
      set({ quickWins: qw })
    } finally {
      set({ quickWinsLoading: false })
    }
  },

  dockerInfo: null,
  dockerLoading: false,
  dockerBusyId: null,
  loadDockerInfo: async () => {
    set({ dockerLoading: true })
    try {
      const info = await window.spacescope.getDockerInfo()
      set({ dockerInfo: info })
    } finally {
      set({ dockerLoading: false })
    }
  },
  runDockerAction: async (action, id) => {
    set({ dockerBusyId: id ?? action })
    try {
      const res = await window.spacescope.dockerAction(action, id)
      await get().loadDockerInfo()
      return res
    } finally {
      set({ dockerBusyId: null })
    }
  },

  cleaning: false,
  runClean: async (paths) => {
    set({ cleaning: true })
    try {
      const res = await window.spacescope.cleanPaths(paths)
      // Refresh reclaimable figures after a clean.
      const drive = get().activeDrive
      if (drive) void get().loadQuickWins(drive)
      return res
    } finally {
      set({ cleaning: false })
    }
  },

  cleanQuickWin: async (id, path) => {
    const res = await window.spacescope.cleanQuickWin(id, path)
    const drive = get().activeDrive
    if (drive) void get().loadQuickWins(drive)
    return res
  },

  openInExplorer: async (path) => {
    await window.spacescope.openInExplorer(path)
  },

  init: () => {
    if (initialized) return
    initialized = true
    const theme = initialTheme()
    applyTheme(theme)
    set({ theme })

    void get().loadDrives()
    void get().loadDockerInfo()

    // On window focus: re-check Docker (it may have just started), and refresh
    // the Quick Wins sizes — so reclaimable numbers (temp, recycle bin, caches…)
    // self-update after the user cleans something in Explorer and comes back.
    // Throttled so the size walks don't run on every little focus change.
    const onFocus = (): void => {
      if (!get().dockerInfo?.available) void get().loadDockerInfo()
      const s = get()
      const qwAge = s.quickWins ? Date.now() - s.quickWins.computedAt : Infinity
      if (s.activeDrive && s.status !== 'scanning' && qwAge > 12000) {
        void get().loadQuickWins(s.activeDrive)
      }
    }
    window.addEventListener('focus', onFocus)
    let tries = 0
    const retry = setInterval(() => {
      if (get().dockerInfo?.available || tries++ >= 5) {
        clearInterval(retry)
        return
      }
      void get().loadDockerInfo()
    }, 4000)

    // Restore last scan from cache so reopening shows results instantly.
    void window.spacescope.getCachedScan().then((cached) => {
      if (cached && get().status === 'idle') {
        set({ result: cached, status: 'done', currentPath: cached.root.path, activeDrive: cached.drivePath })
        void get().loadQuickWins(cached.drivePath)
      }
    })

    // Live scan event subscriptions.
    window.spacescope.onScanProgress((p) => set({ progress: p }))
    window.spacescope.onScanComplete((r) => {
      set({ result: r, status: 'done', currentPath: r.root.path, progress: null })
      void get().loadQuickWins(r.drivePath)
    })
    window.spacescope.onScanError((message) => {
      if (message === 'cancelled') {
        set({ status: 'idle', progress: null })
      } else {
        set({ status: 'error', error: message, progress: null })
      }
    })
  },

  currentNode: () => {
    const { result, currentPath } = get()
    if (!result) return null
    if (!currentPath) return result.root
    return findNode(result.root, currentPath) ?? result.root
  }
}))
