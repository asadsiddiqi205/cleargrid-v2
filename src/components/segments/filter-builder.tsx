"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FIELD_CATEGORIES, OPERATORS } from "@/lib/constants"
import { Trash2, Plus, Calculator, Pencil, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { CalculationEditorDialog } from "@/components/segments/calculation-editor-dialog"
import {
  FieldPill,
  CategoryPill,
  type FieldPillType,
} from "@/components/segments/field-pill"
import {
  loadCalculatedFields,
  removeCalculatedField,
  type CalculatedField,
} from "@/lib/calculated-fields"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterCondition {
  id: string
  field: string
  fieldCategory: string
  operator: string
  value: string
  /** Second value for the `Between` operator. */
  value2?: string
}

export interface FilterGroup {
  id: string
  joinLogic: "AND" | "OR"
  filters: FilterCondition[]
}

// ---------------------------------------------------------------------------
// Friendly display labels for technical field names.
// The underlying value (field key) is unchanged — only what the user sees.
// ---------------------------------------------------------------------------

const FIELD_FRIENDLY_LABELS: Record<string, string> = {
  // Risk & Collections
  "DPD (raw)":                    "Days past due (exact number)",
  "DPD Bucket":                   "Days past due (DPD bucket)",
  "Days Past Due On Submit":      "Days past due at submission",
  "Earliest DPD":                 "Earliest days past due",
  "Risk Segment":                 "Risk level",
  "Account Status":               "Account status",
  "Deal Stage":                   "Collection stage",
  // Financial
  "Outstanding Balance":          "Outstanding balance",
  "Outstanding Amount":           "Outstanding amount",
  "Total Amount":                 "Total amount",
  "Overdue Amount":               "Overdue amount",
  "Unpaid Due Amount":            "Unpaid due amount",
  "Principal Balance":            "Principal balance",
  "Collected Amount":             "Amount collected",
  "Withdrawn Amount":             "Amount withdrawn",
  "EMI":                          "Monthly payment (EMI)",
  "Minimum Due Amount":           "Minimum due amount",
  "Last Payment Amount":          "Last payment amount",
  "Last Payment Failed":          "Last payment failed?",
  "Paid Installments Number":     "Number of paid instalments",
  "Remaining Installments":       "Remaining instalments",
  "Total Borrower Accounts":      "Total accounts for borrower",
  // PTP & Activity
  "PTP Date (Human)":             "Promise-to-pay date (agent)",
  "PTP Amount (Human)":           "Promise-to-pay amount (agent)",
  "PTP Date (AI)":                "Promise-to-pay date (AI call)",
  "PTP Amount (AI)":              "Promise-to-pay amount (AI call)",
  "PTP Amount":                   "Promise-to-pay amount",
  "Total Human Calls":            "Total agent calls",
  "Total AI Calls":               "Total AI calls",
  "AI PTP":                       "AI: detected promise to pay",
  "AI RPC":                       "AI: right-party contact",
  "Non-Payment Reason":           "Reason for non-payment",
  "Currently On Payment Plan":    "On a payment plan?",
  "Currently On Scheduled Payment": "Has a scheduled payment?",
  "Payment Plan Enabled":         "Payment plan enabled?",
  "Scheduled Payment Enabled":    "Scheduled payment enabled?",
  // Communications
  "Email Delivered":              "Email delivered?",
  "Email Last Sent Date":         "Last email sent",
  "Email Open":                   "Email opened?",
  "SMS Delivered":                "SMS delivered?",
  "AI Call Summary":              "AI call transcript summary",
  "AI Comm Status":               "AI communication status",
  "AI Calls Answered":            "AI calls answered",
  "AI Calls Attempt":             "AI call attempts",
  "AI Number Of Attempted Calls": "AI total call attempts",
  "Last AI Call Date":            "Last AI call date",
  "NRPC Meter":                   "Failed contact attempts",
  "Total Cost Per User":          "Total cost per borrower",
  // Reachability
  "Phone Numbers (count)":        "Number of phone numbers on file",
  "Email Addresses (count)":      "Number of emails on file",
  "Has Valid Phone":              "Has a valid phone number?",
  "Has Valid Email":              "Has a valid email address?",
  "Phone DNC Flag":               "Phone on Do Not Contact list?",
  "Email DNC Flag":               "Email on Do Not Contact list?",
  // Dispute & Legal
  "Dispute Pending":              "Dispute currently open?",
  "Dispute Resolved":             "Dispute resolved?",
  "Criminal Case Action Status":  "Criminal case status",
  // Borrower Identity
  "Loan Type":                    "Product type",
  "Whatsapp Opt In":              "WhatsApp opt-in?",
  "Visa Expiry Date":             "Visa expiry date",
  "Submit Date":                  "Submitted to collections",
  // Sub-account
  "Payment Paid Before Submission": "Paid before submission to collections",
  "Sub-account Balance Amount":   "Sub-account balance",
  "Sub-account Total Amount":     "Sub-account total amount",
  "Sub-account Due Date":         "Sub-account due date",
}

// ---------------------------------------------------------------------------
// Field‑type helpers
// ---------------------------------------------------------------------------

const ENUM_VALUES: Record<string, string[]> = {
  "Employer Type": ["Government", "Private", "Self-Employed", "Unemployed"],
  "Visa Status": ["Active", "Expired", "Cancelled"],
  "Loan Type": ["Personal Loan", "Credit Card", "Auto Loan", "Mortgage", "BNPL"],
  "DPD Bucket": ["1-30", "31-60", "61-90", "91-180", "180+"],
  "Risk Segment": ["High", "Medium", "Low"],
  Gender: ["Male", "Female"],
  "Marital Status": ["Single", "Married", "Divorced", "Widowed"],
  "Account Status": ["IN_COLLECTION", "WITHDRAWN", "SETTLED", "ACTIVE"],
  Currency: ["AED", "SAR", "USD"],
  Language: ["English", "Arabic", "Urdu", "Hindi", "Tagalog"],
  "Non-Payment Reason": [
    "Job Loss",
    "Salary Delay",
    "Medical Emergency",
    "Disputes Amount",
    "Ignoring",
  ],
  Nationality: [
    "UAE",
    "India",
    "Pakistan",
    "Philippines",
    "Egypt",
    "Bangladesh",
    "Other",
  ],
  Country: ["UAE", "KSA", "Kuwait", "Bahrain", "Qatar", "Oman"],
  Tier: ["Tier 1", "Tier 2", "Tier 3"],
  "Customer Liveness Status": ["Active", "Dormant", "Churned"],
  "Deal Stage": ["New", "In Progress", "Escalated", "Settled", "Written Off"],
  Bucket: ["Current", "1-30", "31-60", "61-90", "91-180", "180+"],
  "Broken Promise Type": ["Full", "Partial", "None"],
  "Dispute Type": [
    "Amount Dispute",
    "Identity Dispute",
    "Service Dispute",
    "Fraud",
  ],
  "Criminal Case Action Status": [
    "Filed",
    "In Progress",
    "Resolved",
    "Dismissed",
  ],
  "Comms Pipeline": ["Active", "Paused", "Completed"],
}

type FieldType = "number" | "text" | "date" | "enum" | "boolean"

export function getFieldType(
  field: string,
  calculatedFields: CalculatedField[] = []
): FieldType {
  if (!field) return "text"

  // Calculated fields default to number — that's what every prototype example
  // produces (utilization, days, rates).
  if (calculatedFields.some((cf) => cf.name === field)) return "number"

  // Explicit enum fields
  const enumFields = new Set([
    "Employer Type",
    "Visa Status",
    "Marital Status",
    "Gender",
    "Nationality",
    "Country",
    "Language",
    "Loan Type",
    "DPD Bucket",
    "Risk Segment",
    "Account Status",
    "Deal Stage",
    "Dispute Type",
    "Criminal Case Action Status",
    "Currency",
    "Comms Pipeline",
    "Non-Payment Reason",
    "Tier",
    "Customer Liveness Status",
    "Bucket",
    "Broken Promise Type",
  ])
  if (enumFields.has(field)) return "enum"

  // Explicit boolean fields
  const booleanFields = new Set([
    "Has Valid Phone",
    "Has Valid Email",
    "Phone DNC Flag",
    "Email DNC Flag",
    "Email Delivered",
    "Email Open",
    "SMS Delivered",
    "AI PTP",
    "AI RPC",
    "Last Payment Failed",
    "Disputed",
    "Dispute Pending",
    "Dispute Resolved",
    "Payment Paid Before Submission",
    "Whatsapp Opt In",
    "Currently On Payment Plan",
    "Currently On Scheduled Payment",
    "Payment Plan Enabled",
    "Scheduled Payment Enabled",
  ])
  if (booleanFields.has(field)) return "boolean"

  // Pattern‑based detection
  if (/Date|Expiry/i.test(field)) return "date"
  if (
    /Amount|DPD|Count|Balance|Limit|Rate|Score|EMI|Salary|Interest|Meter|Cost|Calls|NRPC|Items|Installments|Accounts|Number/i.test(
      field
    )
  )
    return "number"

  return "text"
}

function pillTypeFor(
  field: string,
  calculatedFields: CalculatedField[]
): FieldPillType {
  if (!field) return "text"
  if (calculatedFields.some((cf) => cf.name === field)) return "calculated"
  return getFieldType(field, calculatedFields)
}

function getOperators(fieldType: FieldType): readonly string[] {
  return OPERATORS[fieldType] ?? OPERATORS.text
}

// ---------------------------------------------------------------------------
// Category lookup
// ---------------------------------------------------------------------------

const CALCULATED_CATEGORY_LABEL = "Calculated"

function categoryForField(
  field: string,
  calculatedFields: CalculatedField[] = []
): string {
  if (calculatedFields.some((cf) => cf.name === field)) {
    return CALCULATED_CATEGORY_LABEL
  }
  for (const cat of FIELD_CATEGORIES) {
    if ((cat.fields as readonly string[]).includes(field)) return cat.label
  }
  return ""
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _id = 0
function uid(prefix: string) {
  _id += 1
  return `${prefix}-${_id}`
}

function createFilter(): FilterCondition {
  return {
    id: uid("f"),
    field: "",
    fieldCategory: "",
    operator: "",
    value: "",
    value2: "",
  }
}

function createGroup(): FilterGroup {
  return { id: uid("g"), joinLogic: "AND", filters: [createFilter()] }
}

// ---------------------------------------------------------------------------
// Value Input — adapts based on field type. Supports the "Between" operator
// by rendering two inputs separated by an "and" label.
// ---------------------------------------------------------------------------

function ValueInput({
  field,
  operator,
  value,
  value2,
  onChange,
  onChange2,
  calculatedFields = [],
}: {
  field: string
  operator: string
  value: string
  value2: string
  onChange: (v: string) => void
  onChange2: (v: string) => void
  calculatedFields?: CalculatedField[]
}) {
  const fieldType = getFieldType(field, calculatedFields)
  const isBetween = operator === "Between"
  const isMulti = operator === "In" || operator === "Not In"

  if (fieldType === "enum") {
    if (isMulti) {
      // For enum + In/Not In we fall back to comma-separated entry so the user
      // can paste a quick list. Enum single-value uses the dropdown.
      return (
        <Input
          placeholder="Comma-separated values"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[220px]"
        />
      )
    }
    const options = ENUM_VALUES[field] ?? []
    return (
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v ?? "")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select value" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (fieldType === "boolean") {
    return (
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v ?? "")}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (fieldType === "date") {
    if (isBetween) {
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-[160px]"
          />
          <span className="text-[11px] text-muted-foreground">and</span>
          <Input
            type="date"
            value={value2}
            onChange={(e) => onChange2(e.target.value)}
            className="w-[160px]"
          />
        </div>
      )
    }
    return (
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[180px]"
      />
    )
  }

  if (fieldType === "number") {
    if (isBetween) {
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            placeholder="Min"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-[110px]"
          />
          <span className="text-[11px] text-muted-foreground">and</span>
          <Input
            type="number"
            placeholder="Max"
            value={value2}
            onChange={(e) => onChange2(e.target.value)}
            className="w-[110px]"
          />
        </div>
      )
    }
    return (
      <Input
        type="number"
        placeholder="Value"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[180px]"
      />
    )
  }

  // text
  if (isMulti) {
    return (
      <Input
        placeholder="Comma-separated values"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[220px]"
      />
    )
  }
  return (
    <Input
      placeholder="Enter value"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-[180px]"
    />
  )
}

// ---------------------------------------------------------------------------
// Filter Row
// ---------------------------------------------------------------------------

function FilterRow({
  filter,
  onUpdate,
  onRemove,
  canRemove,
  calculatedFields,
}: {
  filter: FilterCondition
  onUpdate: (patch: Partial<FilterCondition>) => void
  onRemove: () => void
  canRemove: boolean
  calculatedFields: CalculatedField[]
}) {
  const fieldType = getFieldType(filter.field, calculatedFields)
  const ops = getOperators(fieldType)
  const category = filter.field
    ? categoryForField(filter.field, calculatedFields)
    : ""
  const pillType = pillTypeFor(filter.field, calculatedFields)
  const isCalculated = category === CALCULATED_CATEGORY_LABEL

  // When field changes, reset operator & value and infer category.
  const handleFieldChange = (newField: string | null) => {
    const f = newField ?? ""
    const nextCat = categoryForField(f, calculatedFields)
    const nextType = getFieldType(f, calculatedFields)
    const firstOp = OPERATORS[nextType]?.[0] ?? "Equals"
    onUpdate({
      field: f,
      fieldCategory: nextCat,
      operator: firstOp,
      value: "",
      value2: "",
    })
  }

  return (
    <div className="group/row flex items-start gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Field selector */}
      <Select
        value={filter.field || undefined}
        onValueChange={handleFieldChange}
      >
        <SelectTrigger className="w-[260px]">
          <SelectValue placeholder="Select a field">
            {filter.field ? (
              <span className="flex items-center gap-1.5 min-w-0">
                {isCalculated && (
                  <Calculator className="size-3 text-primary shrink-0" />
                )}
                <span className="truncate">{filter.field}</span>
                <FieldPill type={pillType} />
              </span>
            ) : (
              "Select a field"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {calculatedFields.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-1.5">
                <Calculator className="size-3" />
                Calculated fields
              </SelectLabel>
              {calculatedFields.map((cf) => (
                <SelectItem key={cf.id} value={cf.name}>
                  <span className="flex items-center gap-1.5">
                    <Calculator className="size-3 text-primary" />
                    {cf.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {FIELD_CATEGORIES.map((cat) => (
            <SelectGroup key={cat.label}>
              <SelectLabel>{cat.label}</SelectLabel>
              {cat.fields.map((field) => (
                <SelectItem key={field} value={field}>
                  {FIELD_FRIENDLY_LABELS[field] ?? field}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={filter.operator || undefined}
        onValueChange={(v) =>
          onUpdate({ operator: v ?? "", value: "", value2: "" })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {ops.map((op) => (
            <SelectItem key={op} value={op}>
              {op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input(s) */}
      <ValueInput
        field={filter.field}
        operator={filter.operator}
        value={filter.value}
        value2={filter.value2 ?? ""}
        onChange={(v) => onUpdate({ value: v })}
        onChange2={(v) => onUpdate({ value2: v })}
        calculatedFields={calculatedFields}
      />

      {/* Category tag — subtle, only when a field is picked */}
      {filter.field && category && (
        <div className="flex items-center pt-1">
          <CategoryPill category={category} />
        </div>
      )}

      {/* Spacer pushes the remove button to the right edge */}
      <div className="flex-1" />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className={cn(
          "mt-0.5 inline-flex items-center justify-center size-8 rounded-md transition-colors",
          canRemove
            ? "text-muted-foreground hover:text-red-400 hover:bg-red-400/10 cursor-pointer"
            : "text-muted-foreground/40 cursor-not-allowed"
        )}
        title="Remove filter"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Join Logic Badge (between rows / between groups)
// ---------------------------------------------------------------------------

function JoinBadge({
  value,
  onChange,
  variant = "inline",
}: {
  value: "AND" | "OR"
  onChange?: (v: "AND" | "OR") => void
  variant?: "inline" | "group"
}) {
  if (variant === "group") {
    return (
      <div className="flex items-center justify-center py-3">
        <div className="flex-1 h-px bg-border" />
        <Select
          value={value}
          onValueChange={(v) => onChange?.((v as "AND" | "OR") ?? "AND")}
        >
          <SelectTrigger
            size="sm"
            className="mx-3 min-w-[80px] border-primary/40 bg-primary/10 font-semibold text-primary"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }

  // Between filter rows — small inline label
  return (
    <div className="flex items-center gap-2 py-1.5 pl-1">
      <div className="h-px w-4 bg-border" />
      <span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {value}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calculated field chip — shown above the filter list
// ---------------------------------------------------------------------------

function CalculatedFieldChip({
  field,
  onEdit,
  onDelete,
}: {
  field: CalculatedField
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="group inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 transition-colors hover:bg-primary/15"
      title={`Formula: ${field.formula}`}
    >
      <Calculator className="size-3.5 text-primary" />
      <span className="text-sm font-medium text-primary">{field.name}</span>
      <button
        type="button"
        onClick={onEdit}
        className="text-primary/60 hover:text-primary transition-opacity opacity-0 group-hover:opacity-100"
        title="Edit calculation"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive transition-opacity opacity-0 group-hover:opacity-100"
        title="Delete calculation"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main FilterBuilder Component
// ---------------------------------------------------------------------------

export interface FilterBuilderProps {
  onChange?: (totalFilterCount: number) => void
}

export function FilterBuilder({ onChange }: FilterBuilderProps) {
  const [groups, setGroups] = React.useState<FilterGroup[]>([createGroup()])
  const [groupJoinLogic, setGroupJoinLogic] = React.useState<"AND" | "OR">(
    "OR"
  )
  const [calculatedFields, setCalculatedFields] = React.useState<
    CalculatedField[]
  >([])
  const [calcDialogOpen, setCalcDialogOpen] = React.useState(false)
  const [editingCalcField, setEditingCalcField] =
    React.useState<CalculatedField | null>(null)

  // Hydrate calculated fields from localStorage on mount.
  React.useEffect(() => {
    setCalculatedFields(loadCalculatedFields())
  }, [])

  // Count non-empty filters and notify parent
  React.useEffect(() => {
    const count = groups.reduce(
      (sum, g) => sum + g.filters.filter((f) => f.field).length,
      0
    )
    onChange?.(count)
  }, [groups, onChange])

  // -- Group operations --

  const addGroup = () => {
    setGroups((prev) => [...prev, createGroup()])
  }

  const removeGroup = (groupId: string) => {
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== groupId)
      return next.length === 0 ? [createGroup()] : next
    })
  }

  const updateGroupJoin = (groupId: string, logic: "AND" | "OR") => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, joinLogic: logic } : g))
    )
  }

  // -- Filter operations --

  const addFilter = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, filters: [...g.filters, createFilter()] }
          : g
      )
    )
  }

  const removeFilter = (groupId: string, filterId: string) => {
    setGroups((prev) => {
      return prev.map((g) => {
        if (g.id !== groupId) return g
        const remaining = g.filters.filter((f) => f.id !== filterId)
        if (remaining.length === 0) {
          return { ...g, filters: [createFilter()] }
        }
        return { ...g, filters: remaining }
      })
    })
  }

  const patchFilter = (
    groupId: string,
    filterId: string,
    patch: Partial<FilterCondition>
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              filters: g.filters.map((f) =>
                f.id === filterId ? { ...f, ...patch } : f
              ),
            }
          : g
      )
    )
  }

  const openNewCalcDialog = () => {
    setEditingCalcField(null)
    setCalcDialogOpen(true)
  }

  const openEditCalcDialog = (field: CalculatedField) => {
    setEditingCalcField(field)
    setCalcDialogOpen(true)
  }

  const deleteCalcField = (id: string) => {
    const remaining = removeCalculatedField(id)
    setCalculatedFields(remaining)
    // Remove any filter rows that referenced the deleted field.
    const gone = calculatedFields.find((f) => f.id === id)?.name
    if (gone) {
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          filters: g.filters.map((f) =>
            f.field === gone
              ? { ...f, field: "", fieldCategory: "", operator: "", value: "" }
              : f
          ),
        }))
      )
    }
  }

  const totalFilters = groups.reduce(
    (sum, g) => sum + g.filters.filter((f) => f.field).length,
    0
  )

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Filters
            </h3>
            <span className="text-red-400">*</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openNewCalcDialog}
              className="gap-1.5"
            >
              <Calculator className="size-3.5" />
              Create calculation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addGroup}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Add filter group
            </Button>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          Pick which borrowers belong in this audience. Use{" "}
          <span className="font-semibold text-foreground">AND</span> when
          borrowers must match every condition. Use{" "}
          <span className="font-semibold text-foreground">OR</span> when
          matching any one is enough. Add a second group if you need more
          advanced logic.
        </p>
      </div>

      {/* Saved calculated fields strip */}
      {calculatedFields.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 animate-in fade-in duration-200">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Saved calculated fields
            </p>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {calculatedFields.length} saved
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {calculatedFields.map((cf) => (
              <CalculatedFieldChip
                key={cf.id}
                field={cf}
                onEdit={() => openEditCalcDialog(cf)}
                onDelete={() => deleteCalcField(cf.id)}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Click the pencil to edit a formula. These fields are available in
            every filter dropdown below.
          </p>
        </div>
      )}

      {/* Empty state */}
      {totalFilters === 0 &&
        groups.length === 1 &&
        groups[0].filters.length === 1 &&
        !groups[0].filters[0].field && (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center animate-in fade-in duration-200">
            <Filter className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">
              No filters added yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a field below to start shaping your audience.
            </p>
          </div>
        )}

      {/* Groups */}
      <div className="space-y-0">
        {groups.map((group, gi) => (
          <React.Fragment key={group.id}>
            {/* Between-group connector */}
            {gi > 0 && (
              <JoinBadge
                value={groupJoinLogic}
                onChange={setGroupJoinLogic}
                variant="group"
              />
            )}

            {/* Group card */}
            <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3 transition-colors hover:border-border/80 animate-in fade-in duration-200">
              {/* Group header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    Group {gi + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">Match</span>
                  <Select
                    value={group.joinLogic}
                    onValueChange={(v) =>
                      updateGroupJoin(group.id, (v as "AND" | "OR") ?? "AND")
                    }
                  >
                    <SelectTrigger size="sm" className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">ALL (AND)</SelectItem>
                      <SelectItem value="OR">ANY (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    of these
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addFilter(group.id)}
                    className="gap-1 text-xs"
                  >
                    <Plus className="size-3" />
                    Add condition
                  </Button>
                  {groups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGroup(group.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
                    >
                      Remove group
                    </button>
                  )}
                </div>
              </div>

              {/* Filter rows */}
              <div className="space-y-0">
                {group.filters.map((filter, fi) => (
                  <React.Fragment key={filter.id}>
                    {fi > 0 && (
                      <JoinBadge value={group.joinLogic} variant="inline" />
                    )}
                    <FilterRow
                      filter={filter}
                      onUpdate={(patch) =>
                        patchFilter(group.id, filter.id, patch)
                      }
                      onRemove={() => removeFilter(group.id, filter.id)}
                      canRemove={
                        group.filters.length > 1 || groups.length > 1
                      }
                      calculatedFields={calculatedFields}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Calculated fields editor dialog */}
      <CalculationEditorDialog
        open={calcDialogOpen}
        onOpenChange={(val) => {
          setCalcDialogOpen(val)
          if (!val) setEditingCalcField(null)
        }}
        initialField={editingCalcField}
        onSaved={() => {
          setCalculatedFields(loadCalculatedFields())
        }}
      />
    </div>
  )
}
