"use client"

/**
 * React hook wrapping `lenderFlag()` — re-renders whenever the sidebar's
 * demo-mode toggle broadcasts `cg-demo-flags-changed`, so open editors
 * flip between consumer and Tamara B2B without a page reload.
 */

import * as React from "react"
import {
  getLenderById,
  lenderFlag,
  type LenderFlags,
} from "@/data/lenders"

export function useLenderFlag<K extends keyof LenderFlags>(
  lenderId: string | undefined,
  flag: K,
): NonNullable<LenderFlags[K]> | false {
  const [tick, setTick] = React.useState(0)
  React.useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener("cg-demo-flags-changed", bump)
    window.addEventListener("storage", bump)
    return () => {
      window.removeEventListener("cg-demo-flags-changed", bump)
      window.removeEventListener("storage", bump)
    }
  }, [])
  void tick
  const lender = lenderId ? getLenderById(lenderId) : undefined
  return lenderFlag(lender, flag)
}
