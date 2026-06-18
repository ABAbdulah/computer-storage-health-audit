import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type {
  DockerActionType,
  DockerContainer,
  DockerDfEntry,
  DockerImage,
  DockerInfo
} from '@shared/types'

const execAsync = promisify(exec)

async function run(cmd: string, timeout = 8000): Promise<string> {
  const { stdout } = await execAsync(cmd, { windowsHide: true, timeout, maxBuffer: 1024 * 1024 * 8 })
  return stdout.trim()
}

/** Parse newline-delimited JSON (docker `--format "{{json .}}"`). */
function parseNdjson(out: string): Record<string, string>[] {
  if (!out) return []
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as Record<string, string>
      } catch {
        return null
      }
    })
    .filter((x): x is Record<string, string> => x !== null)
}

export async function getDockerInfo(): Promise<DockerInfo> {
  let version: string
  try {
    version = await run('docker version --format "{{.Server.Version}}"', 4000)
  } catch (e) {
    return {
      available: false,
      error:
        e instanceof Error && /not recognized|ENOENT|command not found/i.test(e.message)
          ? 'Docker CLI not found'
          : 'Docker is installed but not running',
      containers: [],
      images: [],
      df: []
    }
  }

  const [containersOut, imagesOut, dfOut] = await Promise.all([
    run('docker ps -a --no-trunc --size --format "{{json .}}"').catch(() => ''),
    run('docker images --format "{{json .}}"').catch(() => ''),
    run('docker system df --format "{{json .}}"').catch(() => '')
  ])

  const containers: DockerContainer[] = parseNdjson(containersOut).map((c) => ({
    id: (c.ID || '').slice(0, 12),
    name: c.Names || '',
    image: c.Image || '',
    state: (c.State || '').toLowerCase(),
    status: c.Status || '',
    size: c.Size || ''
  }))

  const images: DockerImage[] = parseNdjson(imagesOut).map((i) => ({
    id: (i.ID || '').slice(0, 12),
    repository: i.Repository || '<none>',
    tag: i.Tag || '',
    size: i.Size || ''
  }))

  const df: DockerDfEntry[] = parseNdjson(dfOut).map((d) => ({
    type: d.Type || '',
    total: d.TotalCount || d.Total || '',
    active: d.Active || '',
    size: d.Size || '',
    reclaimable: d.Reclaimable || ''
  }))

  return { available: true, version, containers, images, df }
}

export async function dockerAction(
  action: DockerActionType,
  id?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (action) {
      case 'start':
        await run(`docker start ${id}`)
        break
      case 'stop':
        await run(`docker stop ${id}`, 30000)
        break
      case 'rm':
        // Force-remove handles running containers too.
        await run(`docker rm -f ${id}`, 30000)
        break
      case 'rmi':
        await run(`docker rmi ${id}`, 30000)
        break
      case 'prune':
        await run('docker system prune -f', 60000)
        break
      default:
        return { ok: false, error: 'Unknown action' }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // exec includes the full command; trim to the docker error if present.
    const m = msg.split('\n').find((l) => /error|cannot|conflict|denied/i.test(l))
    return { ok: false, error: m?.trim() || msg.slice(0, 200) }
  }
}
