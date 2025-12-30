import { AItProvider } from "@/contexts/uit.context";
import type { ReactNode } from "react";

interface AItRootProps {
  children: ReactNode;
}

export default function AItRoot({ children }: Readonly<AItRootProps>) {
  return <AItProvider>{children}</AItProvider>;
}
