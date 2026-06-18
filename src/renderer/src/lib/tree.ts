import type { ScanNode } from '@shared/types'

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
