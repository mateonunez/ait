import { createContext, useContext, useState, type ReactNode } from "react";

interface ChatContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        toggleChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatDialog() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatDialog must be used within a ChatProvider");
  }
  return context;
}
