export interface Lender {
  id: string;
  name: string;
  shortName: string;
  type: "bank" | "bnpl" | "personal-loan" | "fintech" | "b2b";
  country: "UAE" | "KSA" | "BH" | "KW";
  status: "active" | "onboarding" | "inactive";
  borrowerCount: number;
  totalDebtAed: number;
  recoveryRate: number;
  primaryColor?: string;
  isPrimary?: boolean;
  /** Per-lender feature flags. Undefined = defaults for consumer collections. */
  flags?: LenderFlags;
}

export interface LenderFlags {
  /**
   * When true, this lender's borrowers are multi-contact accounts (business
   * customers). Journey Builder, Composer and campaign flows expose
   * ContactSelector, per-contact preview, per-contact frequency caps, and
   * sequential rotation instead of the single-contact default.
   */
  tamara_b2b_contacts?: boolean;
}

export function lenderFlag<K extends keyof LenderFlags>(
  lender: Lender | undefined,
  flag: K,
): NonNullable<LenderFlags[K]> | false {
  return (lender?.flags?.[flag] ?? false) as NonNullable<LenderFlags[K]> | false;
}

export const ALL_LENDERS = "all";

export const lenders: Lender[] = [
  {
    id: "lnd-tamara",
    name: "Tamara",
    shortName: "Tamara",
    type: "bnpl",
    country: "UAE",
    status: "active",
    borrowerCount: 63320,
    totalDebtAed: 69_280_000,
    recoveryRate: 29.97,
    primaryColor: "#FF6B6B",
    isPrimary: true,
  },
  {
    id: "lnd-cashnow",
    name: "CashNow",
    shortName: "CashNow",
    type: "personal-loan",
    country: "UAE",
    status: "active",
    borrowerCount: 18420,
    totalDebtAed: 24_650_000,
    recoveryRate: 22.4,
    primaryColor: "#22C55E",
  },
  {
    id: "lnd-mashreq",
    name: "Mashreq Bank",
    shortName: "Mashreq",
    type: "bank",
    country: "UAE",
    status: "active",
    borrowerCount: 9870,
    totalDebtAed: 142_500_000,
    recoveryRate: 34.1,
    primaryColor: "#E11D48",
  },
  {
    id: "lnd-enbd",
    name: "Emirates NBD",
    shortName: "Emirates NBD",
    type: "bank",
    country: "UAE",
    status: "onboarding",
    borrowerCount: 0,
    totalDebtAed: 0,
    recoveryRate: 0,
    primaryColor: "#0EA5E9",
  },
  {
    id: "lnd-fab",
    name: "First Abu Dhabi Bank",
    shortName: "FAB",
    type: "bank",
    country: "UAE",
    status: "onboarding",
    borrowerCount: 0,
    totalDebtAed: 0,
    recoveryRate: 0,
    primaryColor: "#1E3A8A",
  },
  {
    id: "lnd-tamam",
    name: "Tamam",
    shortName: "Tamam",
    type: "fintech",
    country: "KSA",
    status: "active",
    borrowerCount: 12150,
    totalDebtAed: 18_900_000,
    recoveryRate: 26.8,
    primaryColor: "#F59E0B",
  },
  {
    id: "lnd-alrajhi",
    name: "Al Rajhi Bank",
    shortName: "Al Rajhi",
    type: "bank",
    country: "KSA",
    status: "active",
    borrowerCount: 7430,
    totalDebtAed: 98_200_000,
    recoveryRate: 31.5,
    primaryColor: "#0F766E",
  },
  {
    id: "lnd-soum",
    name: "Soum",
    shortName: "Soum",
    type: "fintech",
    country: "KSA",
    status: "active",
    borrowerCount: 4820,
    totalDebtAed: 6_310_000,
    recoveryRate: 19.2,
    primaryColor: "#A855F7",
  },
  {
    id: "lnd-flapkap",
    name: "FlapKap",
    shortName: "FlapKap",
    type: "fintech",
    country: "UAE",
    status: "active",
    borrowerCount: 2310,
    totalDebtAed: 4_780_000,
    recoveryRate: 24.6,
    primaryColor: "#14B8A6",
  },
  {
    id: "lnd-tamara-b2b",
    name: "Tamara B2B",
    shortName: "Tamara B2B",
    type: "b2b",
    country: "UAE",
    status: "active",
    borrowerCount: 14020,
    totalDebtAed: 38_400_000,
    recoveryRate: 21.3,
    primaryColor: "#F97316",
    flags: { tamara_b2b_contacts: true },
  },
  {
    id: "lnd-carasti",
    name: "Carasti",
    shortName: "Carasti",
    type: "fintech",
    country: "UAE",
    status: "onboarding",
    borrowerCount: 0,
    totalDebtAed: 0,
    recoveryRate: 0,
    primaryColor: "#EC4899",
  },
];

export function getLenderById(id: string): Lender | undefined {
  return lenders.find((l) => l.id === id);
}
