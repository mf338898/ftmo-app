"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type DisplayMode = "absolute" | "percentage";

interface DisplayModeContextType {
  mode: DisplayMode;
  toggleMode: () => void;
  baseCapital: number;
}

const DisplayModeContext = createContext<DisplayModeContextType | undefined>(
  undefined,
);

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DisplayMode>("percentage"); // Mode pourcentage par défaut
  const baseCapital = 160000; // Capital de base FTMO

  const toggleMode = () => {
    setMode((prev) => (prev === "absolute" ? "percentage" : "absolute"));
  };

  return (
    <DisplayModeContext.Provider value={{ mode, toggleMode, baseCapital }}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode() {
  const context = useContext(DisplayModeContext);
  if (!context) {
    throw new Error("useDisplayMode must be used within DisplayModeProvider");
  }
  return context;
}

// Fonction utilitaire pour formater les valeurs selon le mode
export function formatValue(
  value: number | undefined,
  mode: DisplayMode,
  baseCapital: number,
  currencyCode: string = "EUR",
  showSign: boolean = false, // Par défaut, pas de signe pour les valeurs absolues (solde, équité)
): string {
  if (value === undefined || value === null) return "0.00";

  if (mode === "percentage") {
    const percentage = (value / baseCapital) * 100;
    // Afficher le signe seulement si demandé (pour les variations/gains/pertes)
    if (showSign) {
      return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
    }
    // Pas de signe pour les valeurs absolues (solde, équité)
    return `${percentage.toFixed(2)}%`;
  }

  // Mode absolu
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

