export const FIELD_CATEGORIES = [
  {
    label: "Borrower Identity",
    fields: [
      "Name", "Name (Arabic)", "Nationality", "Gender", "Date of Birth",
      "Emirates ID", "Passport Number", "Language", "Marital Status", "Visa Status",
      "Visa Expiry Date", "Occupation", "Salary Date", "Employer Type",
      "Salary Amount", "Declared Income", "Credit Limit", "Lender", "Submit Date",
      "Country", "Whatsapp Opt In"
    ]
  },
  {
    label: "Risk & Collections",
    fields: [
      "DPD (raw)", "DPD Bucket", "Days Past Due On Submit", "Earliest DPD",
      "Risk Segment", "Tier", "Customer Liveness Status", "Deal Stage",
      "Account Status", "Bucket", "Loan Type", "Broken Promise Count",
      "Broken Promise Type", "Disputed", "Merchant Name", "Min Submitted Date"
    ]
  },
  {
    label: "Financial",
    fields: [
      "Total Amount", "Outstanding Amount", "Outstanding Balance", "Overdue Amount",
      "Unpaid Due Amount", "Principal Balance", "Collected Amount", "Withdrawn Amount",
      "EMI", "Minimum Due Amount", "Interest", "Items", "Amount Paid",
      "Last Payment Amount", "Last Payment Date", "Last Payment Failed",
      "Last Due Payment", "Paid Installments Number", "Remaining Installments",
      "Currency", "Due Date", "Total Borrower Accounts"
    ]
  },
  {
    label: "PTP & Activity",
    fields: [
      "PTP Date (Human)", "PTP Amount (Human)", "PTP Date (AI)", "PTP Amount (AI)",
      "PTP Amount", "Total Human Calls", "Total AI Calls", "Non-Payment Reason",
      "Callback Date", "Deal Owner", "Currently On Payment Plan",
      "Currently On Scheduled Payment", "Payment Plan Enabled",
      "Scheduled Payment Enabled"
    ]
  },
  {
    label: "Communications",
    fields: [
      "Email Delivered", "Email Last Sent Date", "Email Open", "SMS Delivered",
      "AI Call Summary", "AI Comm Status", "AI PTP", "AI RPC", "AI Calls Answered",
      "AI Calls Attempt", "AI Number Of Attempted Calls", "Last AI Call Date",
      "NRPC Meter", "Total Cost Per User"
    ]
  },
  {
    label: "Dispute & Legal",
    fields: [
      "Dispute Type", "Dispute Created Date", "Last Dispute Date",
      "Dispute Pending", "Dispute Resolved", "Criminal Case Action Status"
    ]
  },
  {
    label: "Reachability",
    fields: [
      "Phone Numbers (count)", "Email Addresses (count)", "Has Valid Phone",
      "Has Valid Email", "Phone DNC Flag", "Email DNC Flag",
      "Reference Contact Name", "Reference Contact Phone"
    ]
  },
  {
    label: "Sub-account",
    fields: [
      "Payment Amount", "Payment Created At", "Payment Paid Before Submission",
      "Sub-account Balance Amount", "Sub-account Total Amount", "Sub-account Due Date"
    ]
  }
] as const;

// ---------------------------------------------------------------------------
// Operator mapping by field type. These labels are user-facing and match the
// language Khalil's build uses, so that any teammate moving between the two
// prototypes sees the same wording.
// ---------------------------------------------------------------------------
export const OPERATORS = {
  text: [
    "Equals",
    "Not Equals",
    "Contains",
    "In",
    "Not In",
  ],
  number: [
    "Equals",
    "Not Equals",
    "Greater Than",
    "Less Than",
    "Greater Than or Equal",
    "Less Than or Equal",
    "Between",
  ],
  date: [
    "Equals",
    "Not Equals",
    "Before",
    "After",
    "Between",
  ],
  boolean: ["Equals"],
  enum: ["Equals", "In", "Not In"],
} as const;

export const DPD_BUCKETS = ["1-30", "31-60", "61-90", "91-180", "180+"] as const;

export const CHANNELS: { value: string; label: string; color: string }[] = [
  { value: "email", label: "Email", color: "var(--chart-1)" },
  { value: "sms", label: "SMS", color: "var(--chart-4)" },
  { value: "whatsapp", label: "WhatsApp", color: "var(--chart-2)" },
  { value: "voice", label: "AI Voice", color: "var(--chart-3)" },
];
