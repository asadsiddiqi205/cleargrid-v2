# Calculated Fields — Engineering Spec

**Feature:** Calculated Fields (Tableau-style formula builder for Segments)
**Priority:** High
**Prototype reference:** https://cleargrid-extracted.vercel.app/segments/create → click the calculator icon in the filter builder
**Prototype source:** `src/components/segments/calculation-editor-dialog.tsx`, `src/data/calculation-functions.ts`, `src/lib/calculated-fields.ts`

---

## Summary

Allow ops users to create custom calculated fields using a formula editor. These fields can then be used as filter dimensions in the Segment builder, enabling queries like "borrowers whose Utilization Rate > 80%" or "borrowers where Days Since Last Payment > 45" — without engineering having to add each derived field to the schema.

---

## User Flow

1. User is on **Segments → Create** page building filters.
2. User clicks the **calculator icon** (or "Add calculated field" button) in the filter builder.
3. **Create Calculated Field** dialog opens (split-panel, 1100px wide).
4. User fills in:
   - **Name** (required) — e.g., "Utilization Rate"
   - **Description** (optional) — e.g., "Outstanding balance as % of credit limit"
   - **Formula** (required) — e.g., `[Outstanding Amount] / [Credit Limit] * 100`
5. User can:
   - Type `[` to get autocomplete suggestions for available fields.
   - Browse/search the **Functions** panel on the right and click to insert.
   - Click a **preset example** to prefill all three fields.
6. Formula validates in real-time (balanced brackets, parentheses, quotes).
7. User clicks **Save calculation**.
8. The new calculated field appears as a usable filter dimension in the segment builder.

---

## UI Specification

### Dialog Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Calculator icon]  Create Calculated Field              [X]    │
│  Build a custom formula using existing fields and functions      │
├───────────────────────────────────┬──────────────────────────────┤
│  LEFT PANEL (60%)                │  RIGHT PANEL (40%)           │
│                                  │                              │
│  Calculated field name *         │  Functions          47 of 47 │
│  ┌───────────────────────┐       │  ┌────────────────────────┐  │
│  │ e.g., Utilization Rate│       │  │ [Category dropdown]    │  │
│  └───────────────────────┘       │  └────────────────────────┘  │
│                                  │  ┌────────────────────────┐  │
│  Description (optional)          │  │ Search functions...    │  │
│  ┌───────────────────────┐       │  └────────────────────────┘  │
│  │                       │       │                              │
│  └───────────────────────┘       │  NUMBER                      │
│                                  │  ├─ SUM                      │
│  ✨ Start from an example        │  ├─ AVG                      │
│  [Utilization Rate]              │  ├─ MIN                      │
│  [Days Since Last Payment]       │  ├─ MAX                      │
│  [PTP Kept Rate]                 │  ├─ COUNT ...                │
│  [Recovery Rate]                 │  │                            │
│  [AI Contact Rate]               │  STRING                      │
│  [Days to Visa Expiry]           │  ├─ CONTAINS                 │
│                                  │  ├─ STARTSWITH ...            │
│  Formula *                       │                              │
│  ┌───────────────────────┐       │  ┌────────────────────────┐  │
│  │ [dark code editor]    │       │  │ Selected function      │  │
│  │                       │       │  │ SUM(expression)        │  │
│  │                       │       │  │ Returns the sum of ... │  │
│  │                       │       │  │ Examples:              │  │
│  │                       │       │  │ SUM([Outstanding Amt]) │  │
│  └───────────────────────┘       │  │ [Insert function]      │  │
│  ✓ The calculation is valid.     │  └────────────────────────┘  │
│  Result format: Number (AED)     │                              │
│                                  │                              │
│            [Cancel] [Save calculation]                           │
├───────────────────────────────────┴──────────────────────────────┤
```

### Formula Editor Behavior

| Feature | Behavior |
|---------|----------|
| **Field autocomplete** | Typing `[` opens a dropdown of all available fields. Arrow keys to navigate, Enter/Tab to select, Escape to dismiss. Dropdown position tracks cursor. |
| **Function insertion** | Clicking a function in the right panel inserts its template at the cursor (e.g., `SUM()`) and positions the cursor inside the parentheses. |
| **Validation** | Real-time. Checks: balanced `[]`, balanced `()`, unclosed `""`. Shows ✓ green when valid, ⚠ amber when invalid, gray hint when empty. |
| **Result format** | Auto-inferred from formula content. Displays "Number", "Number (AED)", "Number (percentage)", "Date", "String", or "Boolean". |
| **Dark background** | Formula textarea uses `#0d1117` background with monospace font (JetBrains Mono / Fira Code fallback). |

---

## Data Model

### CalculatedField

```typescript
interface CalculatedField {
  id: string            // "calc-{timestamp}-{random}" in prototype; UUID in prod
  name: string          // User-visible label, used as filter dimension name
  description: string   // Optional human description
  formula: string       // The raw formula string, e.g. "[Outstanding Amount] / [Credit Limit] * 100"
  createdAt: string     // ISO 8601 timestamp
  validResult: boolean  // Whether the formula passed validation at save time
}
```

**Prototype storage:** localStorage (`cleargrid_calculated_fields` key).
**Production storage:** API endpoint — `POST /api/calculated-fields`, `GET /api/calculated-fields`, `PUT /api/calculated-fields/:id`, `DELETE /api/calculated-fields/:id`. Fields should be scoped to the tenant/lender.

### Backend Considerations

- Formulas reference fields by display name in brackets: `[Outstanding Amount]`. The backend needs a **field name → column/expression mapping** to translate these into SQL or query-engine expressions.
- The formula language is Tableau-style. For production, consider using an expression parser (e.g., a simple recursive-descent parser or an existing library) rather than regex-based validation.
- Calculated fields should be **lazily evaluated** at query time (virtual columns), not materialized, so they always reflect current data.
- Access control: calculated fields created by one user should be visible to all users in the same tenant.

---

## Function Library

47 functions across 5 categories. Each function needs a backend implementation.

### Number (12 functions)

| Function | Syntax | Description |
|----------|--------|-------------|
| `SUM` | `SUM(expression)` | Sum of all values. Nulls ignored. |
| `AVG` | `AVG(expression)` | Average of all values. |
| `MIN` | `MIN(expression)` | Minimum value. |
| `MAX` | `MAX(expression)` | Maximum value. |
| `COUNT` | `COUNT(expression)` | Number of items. |
| `COUNTD` | `COUNTD(expression)` | Number of distinct items. |
| `ROUND` | `ROUND(number, places)` | Round to N decimal places. |
| `FLOOR` | `FLOOR(number)` | Round down to integer. |
| `CEILING` | `CEILING(number)` | Round up to integer. |
| `ABS` | `ABS(number)` | Absolute value. |
| `POWER` | `POWER(number, exponent)` | Raise to power. |
| `SQRT` | `SQRT(number)` | Square root. |

### String (12 functions)

| Function | Syntax | Description |
|----------|--------|-------------|
| `CONTAINS` | `CONTAINS(string, substring)` | True if substring found. |
| `STARTSWITH` | `STARTSWITH(string, substring)` | True if starts with substring. |
| `ENDSWITH` | `ENDSWITH(string, substring)` | True if ends with substring. |
| `UPPER` | `UPPER(string)` | Convert to uppercase. |
| `LOWER` | `LOWER(string)` | Convert to lowercase. |
| `TRIM` | `TRIM(string)` | Remove leading/trailing whitespace. |
| `LEN` | `LEN(string)` | Character count. |
| `LEFT` | `LEFT(string, num)` | Leftmost N characters. |
| `RIGHT` | `RIGHT(string, num)` | Rightmost N characters. |
| `MID` | `MID(string, start, length)` | Substring from position. |
| `REPLACE` | `REPLACE(string, find, replace)` | Replace all occurrences. |
| `SPLIT` | `SPLIT(string, delimiter, index)` | Split and return Nth token. |

### Date (10 functions)

| Function | Syntax | Description |
|----------|--------|-------------|
| `TODAY` | `TODAY()` | Current date. |
| `NOW` | `NOW()` | Current date and time. |
| `DATEADD` | `DATEADD(part, interval, date)` | Add interval to date. Parts: `'day'`, `'month'`, `'year'`. |
| `DATEDIFF` | `DATEDIFF(part, date1, date2)` | Difference between dates as integer. |
| `YEAR` | `YEAR(date)` | Four-digit year. |
| `MONTH` | `MONTH(date)` | Month (1-12). |
| `DAY` | `DAY(date)` | Day of month (1-31). |
| `WEEK` | `WEEK(date)` | ISO week number (1-53). |
| `DATEPARSE` | `DATEPARSE(format, string)` | Parse string to date. |
| `DATETRUNC` | `DATETRUNC(part, date)` | Truncate to precision. |

### Conditional (6 functions)

| Function | Syntax | Description |
|----------|--------|-------------|
| `IF` | `IF(test, then, else)` | Basic conditional. |
| `IF (chained)` | `IF(t1, r1, t2, r2, else)` | Multi-condition IF. |
| `CASE` | `CASE(expr, v1, r1, ..., default)` | Switch/case matching. |
| `IIF` | `IIF(test, then, else)` | Inline IF. |
| `IFNULL` | `IFNULL(expr, replacement)` | Null coalescing. |
| `ISNULL` | `ISNULL(expression)` | Null check (returns boolean). |

### Aggregation / Window (7 functions)

| Function | Syntax | Description |
|----------|--------|-------------|
| `WINDOW_SUM` | `WINDOW_SUM(expression)` | Sum within current window. |
| `WINDOW_AVG` | `WINDOW_AVG(expression)` | Average within current window. |
| `RUNNING_SUM` | `RUNNING_SUM(expression)` | Running total. |
| `INDEX` | `INDEX()` | Current row index (1-based). |
| `RANK` | `RANK(expression)` | Standard competition rank. |
| `FIRST` | `FIRST()` | Offset from first row in partition. |
| `LAST` | `LAST()` | Offset from last row in partition. |

---

## Available Fields for Autocomplete

The `[` autocomplete draws from all fields in the system. Currently 130+ fields across 8 categories:

| Category | Example Fields |
|----------|---------------|
| **Borrower Identity** | Name, Emirates ID, Nationality, Gender, DOB, Salary Amount, Employer Type, etc. |
| **Risk & Collections** | DPD, DPD Bucket, Risk Segment, Tier, Deal Stage, Broken Promise Count, etc. |
| **Financial** | Total Amount, Outstanding Amount, Overdue Amount, EMI, Credit Limit, Interest, etc. |
| **PTP & Activity** | PTP Date, PTP Amount, Total Human Calls, Total AI Calls, Callback Date, etc. |
| **Communications** | Email Delivered, Email Open, SMS Delivered, AI Call Summary, NRPC Meter, etc. |
| **Dispute & Legal** | Dispute Type, Dispute Created Date, Criminal Case Action Status, etc. |
| **Reachability** | Phone Numbers (count), Email Addresses (count), Has Valid Phone/Email, DNC Flags, etc. |
| **Sub-account** | Payment Amount, Sub-account Balance, Sub-account Due Date, etc. |

The backend should expose an API endpoint (`GET /api/fields`) that returns the current field catalog so the autocomplete stays in sync with the data model.

---

## Preset Examples

6 one-click examples that prefill name, description, and formula:

| Name | Formula |
|------|---------|
| Utilization Rate | `[Outstanding Amount] / [Credit Limit] * 100` |
| Days Since Last Payment | `DATEDIFF('day', [Last Payment Date], TODAY())` |
| PTP Kept Rate | `([Total PTP] - [Broken Promise Count]) / [Total PTP] * 100` |
| Recovery Rate | `[Amount Paid] / [Total Amount] * 100` |
| AI Contact Rate | `[AI Calls Answered] / [AI Calls Attempt] * 100` |
| Days to Visa Expiry | `DATEDIFF('day', TODAY(), [Visa Expiry Date])` |

---

## Validation Rules

### Frontend (real-time, as user types)

| Check | Error Message |
|-------|---------------|
| Empty formula | "Type [ to insert a field, or click a function on the right." |
| Unbalanced `[` / `]` | "Unbalanced field brackets — every [ needs a matching ]." |
| Unbalanced `(` / `)` | "Unbalanced parentheses — every ( needs a matching )." |
| Odd number of `"` | "Unclosed string literal — check your double quotes." |
| Valid | "The calculation is valid." + inferred result format |

### Backend (on save, stricter)

- Parse the formula into an AST.
- Verify every `[Field Name]` references a real field in the catalog.
- Verify every function call uses a recognized function name.
- Type-check arguments (e.g., `DATEDIFF` expects date arguments, `SUM` expects numeric).
- Reject division by zero constants.
- Return a typed result format (Number, String, Date, Boolean) for use in the segment filter UI.

---

## API Endpoints (Production)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/calculated-fields` | List all calculated fields for the tenant |
| `POST` | `/api/calculated-fields` | Create a new calculated field |
| `PUT` | `/api/calculated-fields/:id` | Update an existing calculated field |
| `DELETE` | `/api/calculated-fields/:id` | Delete a calculated field |
| `POST` | `/api/calculated-fields/validate` | Validate a formula without saving (returns parsed result format + any errors) |
| `GET` | `/api/fields` | Return the full field catalog for autocomplete |

### Request body (POST/PUT)

```json
{
  "name": "Utilization Rate",
  "description": "Outstanding balance as % of credit limit",
  "formula": "[Outstanding Amount] / [Credit Limit] * 100"
}
```

### Response (POST/PUT)

```json
{
  "id": "calc-abc123",
  "name": "Utilization Rate",
  "description": "Outstanding balance as % of credit limit",
  "formula": "[Outstanding Amount] / [Credit Limit] * 100",
  "resultType": "number",
  "resultFormat": "percentage",
  "createdAt": "2026-05-10T12:00:00Z",
  "createdBy": "user-123",
  "valid": true
}
```

---

## Acceptance Criteria

- [ ] Dialog opens from the segment builder's calculator icon.
- [ ] Name field is required; formula field is required. Save is disabled until both are filled and formula is valid.
- [ ] Typing `[` in the formula editor opens a dropdown of all available fields. Arrow keys navigate, Enter/Tab selects, Escape dismisses.
- [ ] Clicking a function in the right panel inserts its template at the cursor position with the cursor placed inside the parentheses.
- [ ] Clicking a preset example prefills name, description, and formula.
- [ ] Validation runs in real-time and shows green checkmark (valid), amber warning (invalid), or gray hint (empty).
- [ ] Result format is auto-inferred and displayed (e.g., "Result format: Number (AED)").
- [ ] Saved calculated fields appear as usable filter dimensions in the segment builder.
- [ ] Calculated fields persist across sessions (localStorage in prototype, API in production).
- [ ] All 47 functions are listed, searchable, and filterable by category.
- [ ] Function detail card shows syntax, description, examples, and an "Insert function" button.
- [ ] The formula editor uses monospace font on a dark background.
- [ ] Edit mode: reopening a saved field pre-populates all fields.
- [ ] Delete: users can remove calculated fields they created.

---

## Out of Scope (for this ticket)

- Formula execution engine (backend parser + evaluator).
- Sharing/permissions for calculated fields across teams.
- Version history for formula edits.
- Nested calculated fields (referencing one calc field inside another).
- Performance optimization for complex formulas on large datasets.

These should be separate tickets once the UI and API contract are stable.
