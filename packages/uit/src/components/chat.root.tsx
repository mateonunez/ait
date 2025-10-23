import type { ReactNode } from "react";
import { ChatProvider } from "@/contexts/chat.context";
import { ChatDialog } from "./chat/chat-dialog";

interface ChatRootProps {
  children: ReactNode;
}

export default function ChatRoot({ children }: Readonly<ChatRootProps>) {
  return (
    <ChatProvider>
      {children}
      <ChatDialog />
    </ChatProvider>
  );
}
