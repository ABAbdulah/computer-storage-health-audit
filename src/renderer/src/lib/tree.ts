import type { Category, ScanNode } from '@shared/types'

/** Find a node by its absolute path within the tree (DFS, prefix-pruned). */
export function findNode(root: ScanNode, targetPath: string): ScanNode | null {
  if (root.path === targetPath) return root
  if (!root.children) return null
  const lc = targetPath.toLowerCase()
  for (const child of root.children) {
    const cp = child.path.toLowerCase()
    if (lc === cp) return child
    // Only descend when the target lives under this child.
    if (lc.startsWith(cp.endsWith('/') || cp.endsWith('\\') ? cp : cp + sep(cp))) {
      const found = findNode(child, targetPath)
      if (found) return found
    }
  }
  // Fallback: exhaustive search (handles synthetic/bucket nodes).
  for (const child of root.children) {
    const found = findNode(child, targetPath)
    if (found) return found
  }
  return null
}

function sep(p: string): string {
  return p.includes('\\') ? '\\' : '/'
}

/** Build the breadcrumb chain of nodes from root down to targetPath. */
export function pathChain(root: ScanNode, targetPath: string): ScanNode[] {
  const chain: ScanNode[] = []
  let current: ScanNode | null = root
  while (current) {
    chain.push(current)
    if (current.path === targetPath) break
    if (!current.children) break
    const lc = targetPath.toLowerCase()
    const next: ScanNode | undefined = current.children.find((c) => {
      const cp = c.path.toLowerCase()
      return lc === cp || lc.startsWith(cp + sep(cp))
    })
    if (!next || next.path === current.path) break
    current = next
  }
  return chain
}

/** Flatten a subtree into a list of leaf-ish rows for the list view. */
export function flattenChildren(node: ScanNode): ScanNode[] {
  return node.children ? [...node.children] : []
}

/**
 * Collect the "top-most" nodes of a category anywhere in the tree — i.e. the
 * largest items that belong to `cat` without double-counting nested ones. A node
 * qualifies when its category is `cat` and its parent's category is not `cat`
 * (so e.g. the ext4.vhdx file, or a node_modules folder, is returned once — not
 * also all its children). Sorted largest first.
 */
export function collectByCategory(root: ScanNode, cat: Category): ScanNode[] {
  const out: ScanNode[] = []
  const walk = (node: ScanNode, parentIsSame: boolean): void => {
    const isMatch = node.category === cat
    if (isMatch && !parentIsSame && node.size > 0) {
      out.push(node)
      // Still descend so we can show a drill option, but children won't be
      // re-collected as separate top-level results (parentIsSame = true).
    }
    if (node.children) {
      for (const child of node.children) walk(child, isMatch)
    }
  }
  walk(root, false)
  out.sort((a, b) => b.size - a.size)
  return out
}
