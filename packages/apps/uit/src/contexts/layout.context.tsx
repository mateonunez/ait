"use client";

import { type ReactNode, createContext, useContext, useState } from "react";

interface LayoutContextType {
  headerActions: ReactNode | null;
  setHeaderActions: (actions: ReactNode | null) => void;
  headerTitle: string | null;
  setHeaderTitle: (title: string | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);

  return (
    <LayoutContext.Provider
      value={{
        headerActions,
        setHeaderActions,
        headerTitle,
        setHeaderTitle,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
