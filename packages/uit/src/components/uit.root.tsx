import type { ReactNode } from "react";
import { AItProvider } from "@/contexts/uit.context";
import AItDialog from "./uit.dialog";

interface AItRootProps {
  children: ReactNode;
}

export default function AItRoot({ children }: Readonly<AItRootProps>) {
  return (
    <AItProvider>
      {children}
      <AItDialog />
    </AItProvider>
  );
}
