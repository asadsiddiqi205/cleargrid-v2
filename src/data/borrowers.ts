export interface Borrower {
  id: string
  name: string
  emiratesId: string
  /** The borrower's primary / first phone — kept for existing call-sites. */
  phone: string
  /**
   * Full set of phone numbers on file. Unordered, no labels. UIs that let
   * authors pick which to use treat this as an opaque list.
   */
  phones?: string[]
  /** Full set of emails on file. Same semantics as `phones`. */
  emails?: string[]
  outstanding: number
  dpdBucket: string
  product: string
  riskScore: "Low" | "Medium" | "High"
  status: "Active" | "Closed" | "Legal" | "Settled"
}

/**
 * Lazy accessor so existing seed data (which only has `phone`) still works —
 * callers see at least one phone, plus a deterministic set of synthetic
 * secondaries drawn from the borrower id so previews stay stable.
 */
export function getBorrowerPhones(b: Borrower): string[] {
  if (b.phones && b.phones.length > 0) return b.phones
  const extraCount = (b.id.charCodeAt(b.id.length - 1) % 3) + 1
  const base = b.phone.replace(/\D/g, "")
  const secondaries: string[] = []
  for (let i = 1; i < extraCount; i++) {
    const nudged = (BigInt(base) + BigInt(i * 71_111)).toString().slice(-9)
    secondaries.push(`+971 ${nudged.slice(0, 2)} ${nudged.slice(2, 5)} ${nudged.slice(5)}`)
  }
  return [b.phone, ...secondaries]
}

export function getBorrowerEmails(b: Borrower): string[] {
  if (b.emails && b.emails.length > 0) return b.emails
  const first = b.name.split(" ")[0]?.toLowerCase() ?? "borrower"
  const last = b.name.split(" ").slice(1).join(".").toLowerCase() || "x"
  const extraCount = (b.id.charCodeAt(b.id.length - 1) % 2) + 1
  const list = [`${first}.${last}@gmail.com`]
  if (extraCount > 1) list.push(`${first}.${last}@outlook.com`)
  return list
}

export const borrowers: Borrower[] = [
  {
    id: "bor-001",
    name: "Ahmed Al Maktoum",
    emiratesId: "784-1990-1234567-1",
    phone: "+971 55 123 4567",
    outstanding: 245000,
    dpdBucket: "61-90",
    product: "Personal Loan",
    riskScore: "High",
    status: "Active",
  },
  {
    id: "bor-002",
    name: "Fatima Al Hashimi",
    emiratesId: "784-1985-2345678-2",
    phone: "+971 50 234 5678",
    outstanding: 18500,
    dpdBucket: "1-30",
    product: "Credit Card",
    riskScore: "Low",
    status: "Active",
  },
  {
    id: "bor-003",
    name: "James Patterson",
    emiratesId: "784-1988-3456789-3",
    phone: "+971 56 345 6789",
    outstanding: 89000,
    dpdBucket: "31-60",
    product: "Auto Loan",
    riskScore: "Medium",
    status: "Active",
  },
  {
    id: "bor-004",
    name: "Khalid Bin Rashid",
    emiratesId: "784-1992-4567890-4",
    phone: "+971 52 456 7890",
    outstanding: 412000,
    dpdBucket: "180+",
    product: "Mortgage",
    riskScore: "High",
    status: "Legal",
  },
  {
    id: "bor-005",
    name: "Priya Sharma",
    emiratesId: "784-1991-5678901-5",
    phone: "+971 58 567 8901",
    outstanding: 32000,
    dpdBucket: "1-30",
    product: "Personal Loan",
    riskScore: "Low",
    status: "Active",
  },
  {
    id: "bor-006",
    name: "Sara Al Mansoori",
    emiratesId: "784-1987-6789012-6",
    phone: "+971 54 678 9012",
    outstanding: 156000,
    dpdBucket: "91-180",
    product: "Personal Loan",
    riskScore: "High",
    status: "Active",
  },
  {
    id: "bor-007",
    name: "Wei Chen",
    emiratesId: "784-1993-7890123-7",
    phone: "+971 50 789 0123",
    outstanding: 5200,
    dpdBucket: "1-30",
    product: "Credit Card",
    riskScore: "Low",
    status: "Active",
  },
  {
    id: "bor-008",
    name: "Omar Al Dhaheri",
    emiratesId: "784-1989-8901234-8",
    phone: "+971 55 890 1234",
    outstanding: 78000,
    dpdBucket: "61-90",
    product: "Auto Loan",
    riskScore: "Medium",
    status: "Active",
  },
  {
    id: "bor-009",
    name: "Maria Santos",
    emiratesId: "784-1994-9012345-9",
    phone: "+971 56 901 2345",
    outstanding: 14800,
    dpdBucket: "31-60",
    product: "Credit Card",
    riskScore: "Medium",
    status: "Active",
  },
  {
    id: "bor-010",
    name: "Thomas Mueller",
    emiratesId: "784-1986-0123456-0",
    phone: "+971 52 012 3456",
    outstanding: 495000,
    dpdBucket: "180+",
    product: "Mortgage",
    riskScore: "High",
    status: "Legal",
  },
  {
    id: "bor-011",
    name: "Noura Al Falasi",
    emiratesId: "784-1995-1122334-1",
    phone: "+971 58 112 2334",
    outstanding: 27500,
    dpdBucket: "1-30",
    product: "Personal Loan",
    riskScore: "Low",
    status: "Active",
  },
  {
    id: "bor-012",
    name: "Rajesh Patel",
    emiratesId: "784-1990-2233445-2",
    phone: "+971 54 223 3445",
    outstanding: 67000,
    dpdBucket: "91-180",
    product: "Auto Loan",
    riskScore: "High",
    status: "Active",
  },
  {
    id: "bor-013",
    name: "Aisha Bin Zayed",
    emiratesId: "784-1988-3344556-3",
    phone: "+971 50 334 4556",
    outstanding: 8900,
    dpdBucket: "31-60",
    product: "Credit Card",
    riskScore: "Low",
    status: "Active",
  },
  {
    id: "bor-014",
    name: "David Kim",
    emiratesId: "784-1992-4455667-4",
    phone: "+971 55 445 5667",
    outstanding: 125000,
    dpdBucket: "61-90",
    product: "Personal Loan",
    riskScore: "Medium",
    status: "Active",
  },
  {
    id: "bor-015",
    name: "Mariam Al Suwaidi",
    emiratesId: "784-1996-5566778-5",
    phone: "+971 56 556 6778",
    outstanding: 42000,
    dpdBucket: "31-60",
    product: "Auto Loan",
    riskScore: "Medium",
    status: "Settled",
  },
]
