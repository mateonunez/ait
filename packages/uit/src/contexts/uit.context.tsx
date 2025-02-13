import { createContext, useContext, useState, type ReactNode } from "react";

interface AItContextType {
  isOpen: boolean;
  expandedItem: string | null;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
  expandItem: (itemId: string) => void;
  collapseItem: () => void;
}

const AItContext = createContext<AItContextType | undefined>(undefined);

export function AItProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => {
    setIsOpen(false);
    setExpandedItem(null);
  };
  const toggleDialog = () => setIsOpen((prev) => !prev);
  const expandItem = (itemId: string) => setExpandedItem(itemId);
  const collapseItem = () => setExpandedItem(null);

  return (
    <AItContext.Provider
      value={{
        isOpen,
        expandedItem,
        openDialog,
        closeDialog,
        toggleDialog,
        expandItem,
        collapseItem,
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
