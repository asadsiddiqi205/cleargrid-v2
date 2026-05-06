"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { lenders, ALL_LENDERS, type Lender } from "@/data/lenders";

interface LenderContextValue {
  selectedLenderId: string;
  selectedLender: Lender | null;
  setSelectedLender: (id: string) => void;
}

const LenderContext = createContext<LenderContextValue | null>(null);

const STORAGE_KEY = "cleargrid-selected-lender";

export function LenderProvider({ children }: { children: ReactNode }) {
  const [selectedLenderId, setSelectedLenderIdState] = useState<string>(ALL_LENDERS);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Validate it's either ALL_LENDERS or an existing lender id
      if (saved === ALL_LENDERS || lenders.some((l) => l.id === saved)) {
        setSelectedLenderIdState(saved);
      }
    }
  }, []);

  const setSelectedLender = (id: string) => {
    setSelectedLenderIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const selectedLender =
    selectedLenderId === ALL_LENDERS
      ? null
      : lenders.find((l) => l.id === selectedLenderId) ?? null;

  return (
    <LenderContext.Provider
      value={{ selectedLenderId, selectedLender, setSelectedLender }}
    >
      {children}
    </LenderContext.Provider>
  );
}

export function useLender() {
  const ctx = useContext(LenderContext);
  if (!ctx) throw new Error("useLender must be used inside LenderProvider");
  return ctx;
}
