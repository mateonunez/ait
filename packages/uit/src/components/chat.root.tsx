import { ChatProvider } from "@/contexts/chat.context";
import type { ReactNode } from "react";

interface ChatRootProps {
  children: ReactNode;
}

export default function ChatRoot({ children }: Readonly<ChatRootProps>) {
  return <ChatProvider>{children}</ChatProvider>;
}
