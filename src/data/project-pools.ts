/**
 * ClearVoice Project Pools — mock data layer for the Trigger AI Call node's
 * Pool tab.
 *
 * A Project Pool owns a share of pooled-AI gateway capacity, a set of
 * gateways and a priority-ordered list of projects. A ClearVoice project
 * can sit in only one pool at a time; a project in no pool is never
 * dialed.
 *
 * Everything in this file is deterministic mock data — it exists so the
 * frontend can render realistic Pool state without a backend. Each data
 * contract below is a TODO for the backend wiring that will replace it.
 *
 * ──────────────────────────────────────────────────────────────────────
 * TODO (data contracts assumed by the Pool tab)
 * ──────────────────────────────────────────────────────────────────────
 * [A] getPoolForProject(projectId) → Pool | null
 *       Returns the pool a ClearVoice project is currently in, or null
 *       if the project sits in no pool (and therefore is never dialed).
 *       Wired today from the in-memory PROJECT_TO_POOL map below.
 *
 * [B] listPools() → Pool[]
 *       Returns every Project Pool the lender can see, including Active
 *       and Paused pools. The unassigned-state picker uses this to let
 *       authors assign the project to one.
 *
 * [C] assignProjectToPool(projectId, poolId, priority)
 *       Adds a project to a pool at the given priority (High / Normal /
 *       Low). Applies to every journey and campaign that uses that
 *       project. TODO (backend): confirm whether this is applied on
 *       journey Save or Publish.
 *
 * [D] canManagePools(userId) → boolean
 *       Role check. Today there is no user/role model in the codebase;
 *       we stub this with a module-level constant that can be flipped
 *       in dev. TODO (backend): wire to the real role + permission
 *       service.
 *
 * [E] poolTodayState(poolId) → "capacity_bound" | "draining" | "has_spare"
 *       Live per-pool state derived from capacity usage. Here it is
 *       seeded off the pool id so renders are deterministic.
 *
 * [F] poolProjectQueuedCount(poolId, projectId) → number
 *       Per-project queued-call count inside a pool. Seeded off the
 *       (pool, project, priority) tuple here.
 *
 * [G] poolEditUrl(poolId) → string
 *       URL for the Project Pools edit page in a new tab. Stubbed to
 *       /project-pools/<id>.
 */

export type PoolStatus = "active" | "paused"
export type PoolTodayState = "capacity_bound" | "draining" | "has_spare"
export type PoolProjectPriority = "high" | "normal" | "low"

export interface PoolGateway {
  /** Stable id for the gateway inside this pool. */
  id: string
  /** Display name — e.g. "Kuwait Random's Gateway". */
  name: string
  /** Max concurrent calls this gateway supports. */
  concurrency: number
  /** Whether Pooled AI is turned on for this gateway. When every gateway
   *  has it off, the pool has no pooled-AI capacity at all. */
  pooledAiEnabled: boolean
}

export interface PoolProjectRow {
  projectId: string
  priority: PoolProjectPriority
}

export interface Pool {
  id: string
  name: string
  status: PoolStatus
  /** Share of total pooled-AI capacity this pool owns, in percent. */
  sharePct: number
  /** Effective share applied today after redistribution (same 0-100
   *  scale). Can differ from `sharePct` when another pool is paused. */
  effectiveSharePct: number
  gateways: PoolGateway[]
  projects: PoolProjectRow[]
}

/* ─────────── Mock pools ─────────── */

export const POOLS: Pool[] = [
  {
    id: "pool-tabby",
    name: "Tabby",
    status: "active",
    sharePct: 35,
    effectiveSharePct: 35,
    gateways: [
      { id: "gw-kuwait-rand", name: "Kuwait Random's Gateway", concurrency: 20, pooledAiEnabled: true },
      { id: "gw-uae-gsm-1", name: "UAE GSM gateway 1", concurrency: 12, pooledAiEnabled: true },
      { id: "gw-uae-sip-1", name: "UAE SIP · Asterisk 01", concurrency: 30, pooledAiEnabled: true },
    ],
    projects: [
      { projectId: "proj_001", priority: "high" },
      { projectId: "proj_003", priority: "normal" },
    ],
  },
  {
    id: "pool-mashreq",
    name: "Mashreq",
    status: "active",
    sharePct: 25,
    effectiveSharePct: 29,
    gateways: [
      { id: "gw-uae-gsm-2", name: "UAE GSM gateway 2", concurrency: 18, pooledAiEnabled: true },
      { id: "gw-uae-sip-2", name: "UAE SIP · FreeSWITCH 02", concurrency: 24, pooledAiEnabled: true },
    ],
    projects: [
      { projectId: "proj_002", priority: "normal" },
      { projectId: "proj_004", priority: "low" },
    ],
  },
  {
    id: "pool-fab",
    name: "FAB",
    status: "active",
    sharePct: 20,
    effectiveSharePct: 20,
    gateways: [
      { id: "gw-uae-isdn-7", name: "UAE ISDN 7", concurrency: 8, pooledAiEnabled: true },
    ],
    projects: [
      { projectId: "proj_006", priority: "high" },
    ],
  },
  {
    id: "pool-cashnow",
    name: "CashNow",
    status: "paused",
    sharePct: 10,
    effectiveSharePct: 0,
    gateways: [
      { id: "gw-ksa-gsm-1", name: "KSA GSM gateway 1", concurrency: 16, pooledAiEnabled: true },
    ],
    projects: [],
  },
  {
    id: "pool-shared-fallback",
    name: "Shared · Fallback",
    status: "active",
    sharePct: 10,
    effectiveSharePct: 16,
    // Every gateway off: the "no pooled-AI capacity" edge case.
    gateways: [
      { id: "gw-shared-sip-1", name: "Shared SIP · Twilio 01", concurrency: 40, pooledAiEnabled: false },
      { id: "gw-shared-sip-2", name: "Shared SIP · Twilio 02", concurrency: 40, pooledAiEnabled: false },
    ],
    projects: [],
  },
]

/**
 * Project → pool membership. Empty values (undefined) mean the project
 * sits in no pool — its calls are not dialed.
 *
 * TODO (contract [A]): backed by a real `pool_project_memberships` table.
 */
const PROJECT_TO_POOL: Record<string, string | undefined> = {
  proj_001: "pool-tabby",
  proj_002: "pool-mashreq",
  proj_003: "pool-tabby",
  // proj_004 and proj_005 sit in no pool today — triggers the unassigned
  // state and the "won't be dialed" error on the Pool tab.
  proj_004: "pool-mashreq",
  proj_005: undefined,
  proj_006: "pool-fab",
}

/** TODO (contract [D]): flip this to false to exercise the read-only
 *  unassigned state (role check denies pool management). */
const CAN_MANAGE_POOLS = true

/* ─────────── Accessors ─────────── */

export function listPools(): Pool[] {
  return POOLS
}

export function getPoolById(poolId: string | undefined): Pool | undefined {
  if (!poolId) return undefined
  return POOLS.find((p) => p.id === poolId)
}

export function getPoolForProject(projectId: string | undefined): Pool | null {
  if (!projectId) return null
  const poolId = PROJECT_TO_POOL[projectId]
  if (!poolId) return null
  return POOLS.find((p) => p.id === poolId) ?? null
}

export function getProjectPriority(
  pool: Pool,
  projectId: string,
): PoolProjectPriority | null {
  const row = pool.projects.find((p) => p.projectId === projectId)
  return row?.priority ?? null
}

export function canManagePools(_userId?: string): boolean {
  return CAN_MANAGE_POOLS
}

export function poolEditUrl(poolId: string): string {
  return `/project-pools/${poolId}`
}

/* ─────────── Derived state (seeded) ─────────── */

function hash(src: string): number {
  // FNV-1a — tiny, deterministic, same shape as other mock layers.
  let h = 0x811c9dc5
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}

export function poolTodayState(poolId: string): PoolTodayState {
  const h = hash(`state:${poolId}`)
  const r = h % 100
  // Tabby is intentionally capacity-bound so the warning banner renders
  // out of the box on common seeds.
  if (poolId === "pool-tabby") return "capacity_bound"
  if (poolId === "pool-mashreq") return "capacity_bound"
  if (r < 40) return "capacity_bound"
  if (r < 70) return "draining"
  return "has_spare"
}

export function poolCallsQueued(poolId: string): number {
  const h = hash(`queued:${poolId}`)
  const base = h % 1200
  return base + 50
}

export function poolProjectQueuedCount(
  poolId: string,
  projectId: string,
  priority: PoolProjectPriority,
): number {
  const h = hash(`projq:${poolId}:${projectId}:${priority}`)
  const base = h % 300
  if (priority === "high") return base + 60
  if (priority === "normal") return Math.floor(base / 2) + 20
  return Math.floor(base / 4) + 5
}

export function poolPooledConcurrency(pool: Pool): number {
  return pool.gateways
    .filter((g) => g.pooledAiEnabled)
    .reduce((sum, g) => sum + g.concurrency, 0)
}

export function poolHasPooledAiCapacity(pool: Pool): boolean {
  return pool.gateways.some((g) => g.pooledAiEnabled)
}

/* ─────────── Labels ─────────── */

export const POOL_STATE_LABEL: Record<PoolTodayState, string> = {
  capacity_bound: "Capacity-bound",
  draining: "Draining",
  has_spare: "Has spare",
}

export const POOL_PRIORITY_LABEL: Record<PoolProjectPriority, string> = {
  high: "High",
  normal: "Normal",
  low: "Low",
}

/* ─────────── Mutations (prototype only) ─────────── */

/**
 * In-memory assignment — swaps the project's entry in PROJECT_TO_POOL.
 * The Pool tab calls this when the journey is saved (TODO: confirm with
 * backend whether it should apply on Save or on Publish).
 *
 * TODO (contract [C]): wire to the real assign-project-to-pool API.
 */
export function assignProjectToPool(
  projectId: string,
  poolId: string,
  priority: PoolProjectPriority,
): Pool | null {
  const pool = getPoolById(poolId)
  if (!pool) return null
  PROJECT_TO_POOL[projectId] = poolId
  const existing = pool.projects.find((p) => p.projectId === projectId)
  if (existing) {
    existing.priority = priority
  } else {
    pool.projects.push({ projectId, priority })
  }
  return pool
}
