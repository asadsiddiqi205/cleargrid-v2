"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CALC_FUNCTIONS,
  FUNCTION_CATEGORIES,
  EXAMPLE_CALCULATIONS,
  type CalcFunction,
  type FunctionCategory,
} from "@/data/calculation-functions"
import {
  getAllAvailableFieldNames,
  newCalculatedFieldId,
  upsertCalculatedField,
  validateFormula,
  type CalculatedField,
} from "@/lib/calculated-fields"
import {
  Calculator,
  Check,
  AlertTriangle,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CalculationEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful save with the freshly stored field. */
  onSaved?: (field: CalculatedField) => void
  /** When provided, the dialog opens in edit mode for this field. */
  initialField?: CalculatedField | null
}

export function CalculationEditorDialog({
  open,
  onOpenChange,
  onSaved,
  initialField = null,
}: CalculationEditorDialogProps) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [formula, setFormula] = React.useState("")

  // Function reference panel state
  const [categoryFilter, setCategoryFilter] = React.useState<
    "All" | FunctionCategory
  >("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedFunction, setSelectedFunction] =
    React.useState<CalcFunction | null>(CALC_FUNCTIONS[0] ?? null)

  // Field autocomplete state
  const [showFieldSuggestions, setShowFieldSuggestions] = React.useState(false)
  const [fieldQuery, setFieldQuery] = React.useState("")
  const [bracketStart, setBracketStart] = React.useState<number | null>(null)
  const [highlightedFieldIdx, setHighlightedFieldIdx] = React.useState(0)
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0 })

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const allFields = React.useMemo(() => getAllAvailableFieldNames(), [])

  // Reset form when the dialog opens.
  React.useEffect(() => {
    if (open) {
      if (initialField) {
        setName(initialField.name)
        setDescription(initialField.description)
        setFormula(initialField.formula)
      } else {
        setName("")
        setDescription("")
        setFormula("")
      }
      setShowFieldSuggestions(false)
      setBracketStart(null)
      setFieldQuery("")
      setSearchQuery("")
      setCategoryFilter("All")
    }
  }, [open, initialField])

  // -------------------------- VALIDATION --------------------------
  const validation = React.useMemo(() => validateFormula(formula), [formula])

  // -------------------------- FUNCTION FILTERING --------------------------
  const filteredFunctions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return CALC_FUNCTIONS.filter((f) => {
      if (categoryFilter !== "All" && f.category !== categoryFilter) return false
      if (!q) return true
      return (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.syntax.toLowerCase().includes(q)
      )
    })
  }, [categoryFilter, searchQuery])

  // Group filtered functions by category for display.
  const groupedFunctions = React.useMemo(() => {
    const groups: Record<string, CalcFunction[]> = {}
    for (const f of filteredFunctions) {
      if (!groups[f.category]) groups[f.category] = []
      groups[f.category].push(f)
    }
    return groups
  }, [filteredFunctions])

  // -------------------------- FIELD SUGGESTIONS --------------------------
  const filteredFields = React.useMemo(() => {
    const q = fieldQuery.trim().toLowerCase()
    if (!q) return allFields.slice(0, 50)
    return allFields
      .filter((f) => f.toLowerCase().includes(q))
      .slice(0, 50)
  }, [allFields, fieldQuery])

  React.useEffect(() => {
    setHighlightedFieldIdx(0)
  }, [filteredFields.length, fieldQuery])

  // -------------------------- AUTOCOMPLETE LOGIC --------------------------
  const computeDropdownPosition = React.useCallback(
    (textarea: HTMLTextAreaElement) => {
      const cursorPos = textarea.selectionStart
      const textBefore = textarea.value.substring(0, cursorPos)
      const lines = textBefore.split("\n")
      const currentLine = lines.length - 1
      const lastLine = lines[currentLine] ?? ""

      const lineHeight = 20
      const charWidth = 7.6
      // textarea has p-3 (12px) padding all around.
      const top = currentLine * lineHeight + lineHeight + 12
      const left = Math.min(lastLine.length * charWidth + 12, 360)
      return { top, left }
    },
    []
  )

  const checkForBracket = React.useCallback(
    (text: string, cursorPos: number, textarea: HTMLTextAreaElement) => {
      const before = text.substring(0, cursorPos)
      const lastOpen = before.lastIndexOf("[")
      const lastClose = before.lastIndexOf("]")

      if (lastOpen > lastClose) {
        const search = before.substring(lastOpen + 1)
        // Bail out if the user typed a separator that obviously can't be in
        // a field name.
        if (/[\n\r,()]/.test(search)) {
          setShowFieldSuggestions(false)
          return
        }
        setFieldQuery(search)
        setBracketStart(lastOpen)
        setShowFieldSuggestions(true)
        setDropdownPos(computeDropdownPosition(textarea))
      } else {
        setShowFieldSuggestions(false)
        setBracketStart(null)
        setFieldQuery("")
      }
    },
    [computeDropdownPosition]
  )

  const handleFormulaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const next = e.target.value
    setFormula(next)
    checkForBracket(next, e.target.selectionStart, e.target)
  }

  const handleFormulaClick = () => {
    const ta = textareaRef.current
    if (!ta) return
    // Wait one tick so selectionStart reflects the new cursor.
    window.setTimeout(() => {
      checkForBracket(ta.value, ta.selectionStart, ta)
    }, 0)
  }

  const insertFieldAtCursor = React.useCallback(
    (fieldName: string) => {
      const ta = textareaRef.current
      if (!ta || bracketStart === null) return
      const before = formula.substring(0, bracketStart)
      const after = formula.substring(ta.selectionStart)
      const next = `${before}[${fieldName}]${after}`
      setFormula(next)
      setShowFieldSuggestions(false)
      setBracketStart(null)
      setFieldQuery("")
      const newCursor = before.length + fieldName.length + 2
      window.setTimeout(() => {
        ta.focus()
        ta.setSelectionRange(newCursor, newCursor)
      }, 0)
    },
    [formula, bracketStart]
  )

  const insertFunctionAtCursor = React.useCallback(
    (fn: CalcFunction) => {
      const ta = textareaRef.current
      if (!ta) {
        // No textarea ref yet — just append.
        setFormula((prev) => prev + fn.template)
        return
      }
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next =
        formula.substring(0, start) + fn.template + formula.substring(end)
      setFormula(next)
      const cursor = start + fn.cursorOffset
      window.setTimeout(() => {
        ta.focus()
        ta.setSelectionRange(cursor, cursor)
      }, 0)
    },
    [formula]
  )

  const handleFormulaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (!showFieldSuggestions) return
    if (filteredFields.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedFieldIdx((prev) =>
        prev < filteredFields.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedFieldIdx((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      const target = filteredFields[highlightedFieldIdx]
      if (target) insertFieldAtCursor(target)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowFieldSuggestions(false)
    }
  }

  // -------------------------- EXAMPLE LOAD --------------------------
  const loadExample = (example: (typeof EXAMPLE_CALCULATIONS)[number]) => {
    setName(example.name)
    setDescription(example.description)
    setFormula(example.formula)
    setShowFieldSuggestions(false)
    window.setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // -------------------------- SAVE --------------------------
  const canSave =
    name.trim().length > 0 && validation.state === "valid"

  const handleSave = () => {
    if (!canSave) return
    const field: CalculatedField = {
      id: initialField?.id ?? newCalculatedFieldId(),
      name: name.trim(),
      description: description.trim(),
      formula: formula.trim(),
      createdAt: initialField?.createdAt ?? new Date().toISOString(),
      validResult: validation.state === "valid",
    }
    upsertCalculatedField(field)
    onSaved?.(field)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => onOpenChange(val)}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[1100px] sm:!max-w-[1100px] w-[calc(100vw-2rem)] gap-0 p-0"
      >
        <DialogHeader className="flex flex-row items-start justify-between border-b border-border p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Calculator className="size-4" />
            </div>
            <div>
              <DialogTitle>Create Calculated Field</DialogTitle>
              <DialogDescription className="mt-1">
                Build a custom formula using existing fields and functions
                (Tableau-style).
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </DialogHeader>

        <div className="flex h-[640px] min-h-0">
          {/* ---------- LEFT — editor area (~60%) ---------- */}
          <div className="flex w-[60%] flex-col gap-3 border-r border-border p-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Calculated field name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g., Utilization Rate"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Description (optional)
              </label>
              <Textarea
                placeholder="Briefly describe what this calculation measures"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[44px] max-h-[80px]"
              />
            </div>

            {/* Examples */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  Start from an example
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_CALCULATIONS.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => loadExample(ex)}
                    className="group rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    title={ex.formula}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Formula editor */}
            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Formula <span className="text-red-400">*</span>
              </label>
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-[#0d1117]">
                <textarea
                  ref={textareaRef}
                  value={formula}
                  onChange={handleFormulaChange}
                  onClick={handleFormulaClick}
                  onKeyUp={handleFormulaClick}
                  onKeyDown={handleFormulaKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="Enter formula here. Use [FieldName] to reference fields, or click functions on the right."
                  className={cn(
                    "absolute inset-0 h-full w-full resize-none bg-transparent p-3",
                    "font-mono text-[13px] leading-[20px] text-foreground",
                    "outline-none placeholder:text-muted-foreground/60",
                    "selection:bg-primary/30"
                  )}
                  style={{
                    fontFamily:
                      "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  }}
                />
                {showFieldSuggestions && filteredFields.length > 0 && (
                  <div
                    className="absolute z-50 max-h-[220px] w-[280px] overflow-hidden rounded-md border border-border bg-popover shadow-xl"
                    style={{
                      top: `${dropdownPos.top}px`,
                      left: `${dropdownPos.left}px`,
                    }}
                  >
                    <div className="border-b border-border bg-muted/40 px-2 py-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Fields {fieldQuery && `· "${fieldQuery}"`}
                      </span>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto">
                      {filteredFields.map((field, idx) => (
                        <button
                          key={field}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            insertFieldAtCursor(field)
                          }}
                          onMouseEnter={() => setHighlightedFieldIdx(idx)}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors",
                            idx === highlightedFieldIdx
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <span className="truncate">{field}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Validation row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  {validation.state === "valid" && (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-500">
                        {validation.message}
                      </span>
                    </>
                  )}
                  {validation.state === "invalid" && (
                    <>
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      <span className="text-xs text-amber-500">
                        {validation.message}
                      </span>
                    </>
                  )}
                  {validation.state === "empty" && (
                    <span className="text-xs text-muted-foreground">
                      {validation.message}
                    </span>
                  )}
                </div>
                {validation.resultFormat && (
                  <span className="text-[11px] text-muted-foreground">
                    {validation.resultFormat}
                  </span>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                Save calculation
              </Button>
            </div>
          </div>

          {/* ---------- RIGHT — function reference (~40%) ---------- */}
          <div className="flex w-[40%] min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Functions</h3>
              <span className="text-[11px] text-muted-foreground">
                {filteredFunctions.length} of {CALC_FUNCTIONS.length}
              </span>
            </div>

            <div className="space-y-2 border-b border-border p-3">
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  const next = (v ?? "All") as "All" | FunctionCategory
                  setCategoryFilter(next)
                }}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories</SelectItem>
                  {FUNCTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search functions..."
                  className="pl-7"
                />
              </div>
            </div>

            {/* Function list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {Object.entries(groupedFunctions).length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No functions match your search.
                </div>
              )}
              {Object.entries(groupedFunctions).map(([cat, fns]) => (
                <div key={cat}>
                  <div className="sticky top-0 z-10 border-b border-border bg-muted/40 px-3 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat}
                    </span>
                  </div>
                  {fns.map((fn) => (
                    <button
                      key={fn.name}
                      type="button"
                      onClick={() => {
                        setSelectedFunction(fn)
                        insertFunctionAtCursor(fn)
                      }}
                      onMouseEnter={() => setSelectedFunction(fn)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 border-b border-border/40 px-3 py-2 text-left transition-colors",
                        selectedFunction?.name === fn.name
                          ? "bg-primary/10"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {fn.name}
                      </span>
                      <span className="line-clamp-1 text-[11px] text-muted-foreground">
                        {fn.description}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Function detail card */}
            {selectedFunction && (
              <div className="border-t border-border bg-muted/20 p-3">
                <div className="font-mono text-[12px] text-foreground">
                  {selectedFunction.syntax}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {selectedFunction.description}
                </p>
                {selectedFunction.examples.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Examples
                    </span>
                    {selectedFunction.examples.map((ex) => (
                      <div
                        key={ex}
                        className="rounded border border-border/60 bg-[#0d1117] px-2 py-1 font-mono text-[11px] text-foreground"
                      >
                        {ex}
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => insertFunctionAtCursor(selectedFunction)}
                >
                  Insert function
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
