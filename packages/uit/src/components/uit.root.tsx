import type { ReactNode } from "react";
import { AItProvider } from "@/contexts/uit.context";

interface AItRootProps {
  children: ReactNode;
}

export default function AItRoot({ children }: Readonly<AItRootProps>) {
  return <AItProvider>{children}</AItProvider>;
}
