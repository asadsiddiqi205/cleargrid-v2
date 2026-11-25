/**
 * Warmy health thresholds — one place for every placeholder number used
 * to turn Warmy data into a Command status. PM owns the real values.
 *
 * TODO (thresholds set by PM): review every value in this file before
 * launch. The placeholders below were chosen so the mock seed renders a
 * realistic spread (one At-risk, one Blocked, two Watch, the rest
 * Healthy) — not because they match any real Warmy guidance.
 */

export const WARMY_THRESHOLDS = {
  /** health_score.total below this → At risk. */
  healthAtRisk: 55,
  /** health_score.total below this → Watch. */
  healthWatch: 75,
  /** gpm.spam_rate above this (0-1 decimal) → Watch. */
  gmailSpamRateWatch: 0.003,
  /** gpm.spam_rate above this → At risk. */
  gmailSpamRateAtRisk: 0.01,
  /** How old a Warmy sync may be before the drawer tags it "Stale"
   *  (milliseconds). */
  staleSyncMs: 2 * 60 * 60 * 1000,
  /** Last-sync badge thresholds for the connection button label. */
  freshSyncMs: 10 * 60 * 1000,
  /** Default ops cap applied to unmatched domains (per day, per
   *  provider). `null` = no cap, treated as unlimited. */
  opsDailyCapFallback: null as number | null,
  /** Dev-only: how fast the "sent today" counter should climb during the
   *  simulated day so one domain visibly runs out of Gmail volume. */
  simulatedGmailBurnoutHour: 11,
} as const
