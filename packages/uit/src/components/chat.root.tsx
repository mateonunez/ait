import type { ReactNode } from "react";
import { ChatProvider } from "@/contexts/chat.context";

interface ChatRootProps {
  children: ReactNode;
}

export default function ChatRoot({ children }: Readonly<ChatRootProps>) {
  return <ChatProvider>{children}</ChatProvider>;
}
