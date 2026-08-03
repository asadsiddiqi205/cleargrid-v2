"use client"

/**
 * Part 1.6 — recurring-journey deviation alerts.
 *
 * For every active journey with a recurring/continuous trigger, we compute a
 * 7-day rolling average of daily entrant count. If a day deviates by more
 * than the configured threshold below average, an alert fires:
 *   - In-app: red banner on the journey detail + bell notification
 *   - Slack: stubbed for the prototype (console.log)
 *
 * The rolling average + comparison logic here is deterministic (seeded off
 * the journey id) so demos can screenshot a firing alert.
 */

export interface JourneyAlertSettings {
  /** Alerts on/off for this journey. */
  enabled: boolean
  /** % below the 7-day average that triggers an alert. Default 50. */
  thresholdPct: number
  /** Slack channel or user handle to notify. Empty = no Slack. */
  slackChannel: string
}

export const DEFAULT_ALERT_SETTINGS: JourneyAlertSettings = {
  enabled: true,
  thresholdPct: 50,
  slackChannel: "#journeys-alerts",
}

export interface DeviationAlert {
  journeyId: string
  /** ISO date of the day the deviation was detected. */
  detectedAt: string
  expectedEntrants: number
  actualEntrants: number
  deviationPct: number
  /** True if this alert has been acknowledged in-app. */
  acknowledged: boolean
}

/**
 * Deterministic mock: whether a journey has an alert firing right now.
 * Seeded off the journey id so the demo state is stable.
 */
export function getActiveAlert(journeyId: string, settings: JourneyAlertSettings): DeviationAlert | null {
  if (!settings.enabled) return null
  const seed = hashString(journeyId)
  // ~30% of journeys have an alert firing.
  if (seed % 10 > 2) return null

  const expected = 800 + (seed % 400)
  const drop = 0.55 + ((seed >> 3) % 30) / 100 // 55%–85% drop
  const actual = Math.round(expected * (1 - drop))
  const dev = Math.round(drop * 100)

  if (dev < settings.thresholdPct) return null

  return {
    journeyId,
    detectedAt: new Date().toISOString(),
    expectedEntrants: expected,
    actualEntrants: actual,
    deviationPct: dev,
    acknowledged: false,
  }
}

/**
 * Simulated Slack post — logs to console in the prototype. Replace with a
 * real webhook in production.
 */
export function postAlertToSlack(
  alert: DeviationAlert,
  channel: string,
  journeyName: string,
): void {
  // eslint-disable-next-line no-console
  console.info("[journey-alert] would post to Slack", {
    channel,
    journey: journeyName,
    expected: alert.expectedEntrants,
    actual: alert.actualEntrants,
    deviation: `${alert.deviationPct}%`,
    detectedAt: alert.detectedAt,
    investigateUrl: `/journeys/${alert.journeyId}?tab=analytics`,
  })
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
