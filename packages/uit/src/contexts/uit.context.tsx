import { createContext, useContext, useState, type ReactNode } from "react";

interface AItContextType {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
}

const AItContext = createContext<AItContextType | undefined>(undefined);

export function AItProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);
  const toggleDialog = () => setIsOpen((prev) => !prev);

  return (
    <AItContext.Provider
      value={{
        isOpen,
        openDialog,
        closeDialog,
        toggleDialog,
      }}
    >
      {children}
    </AItContext.Provider>
  );
}

export function useUIt() {
  const context = useContext(AItContext);
  if (context === undefined) {
    throw new Error("useAIt must be used within an AItProvider");
  }
  return context;
}
