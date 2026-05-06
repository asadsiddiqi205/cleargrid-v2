---
description: Review a screen against the non-technical-user UX rule
argument-hint: [screen path or feature name]
---

# /ux-check

Review the given screen against ClearGrid's CRITICAL UX RULE: **every screen must be glanceable and usable by a non-technical collections agent (no jargon, no training).**

## Target
$ARGUMENTS

If no argument is given, ask which screen or feature to review.

## What to do

1. **Locate the screen.** Resolve the argument to a route (`src/app/(app)/<route>/page.tsx`) and its feature components (`src/components/<feature>/`). Read the files.

2. **Walk through it as a non-technical user.** Imagine a collections agent opening this screen for the first time. Check:

   - **First glance (3 seconds):** Is the primary action obvious? Does the user understand what this screen is for without reading docs?
   - **Language:** Any developer jargon? ("payload", "config", "webhook", "API key" in user-facing copy). Any acronyms without explanation (DPD, PTP, DNC)?
   - **Actions:** Is the primary CTA clearly the brightest/largest button? Are destructive actions guarded?
   - **Dense areas:** Any tables with 6+ columns and no explanation? Any raw IDs shown to users?
   - **Progressive disclosure:** Are advanced/power-user options collapsed by default?
   - **Explanatory subtext:** Does each section have a one-line plain-English description of what it does?
   - **Multi-step flows:** Could this be one screen instead of a wizard?
   - **Error states:** If something fails, does the user know what to do next?
   - **Empty states:** If there's no data yet, is there a clear next step (not just "No results")?

3. **Check for known anti-patterns in this repo:**
   - Hex color literals instead of CSS tokens (`#0ec99e` instead of `var(--chart-2)`)
   - Dark-only hardcodes (`rgba(255,255,255,...)`, `#12161e`) that break light mode
   - `useState("")` feeding a `<Select value={...}>` without `|| undefined` (breaks base-ui Select)
   - Screens without `<PageShell>` wrapping (unless intentionally custom)

4. **Output format:** Return a terse report:

   ```
   ## UX check: <screen name>

   **Verdict:** [pass / needs work / blocking]

   **Issues found** (most important first):
   - <file:line> — <problem> → <suggested fix>
   - ...

   **What's already good:**
   - <specific things done right>

   **Suggested follow-ups:** (optional, only if meaningful)
   - <broader improvements worth considering>
   ```

   Be specific — cite file paths and line numbers. Don't list problems that don't actually exist. Don't pad the report.

5. **Do NOT make changes automatically.** This is a review command. If the user wants fixes applied, they'll ask.
