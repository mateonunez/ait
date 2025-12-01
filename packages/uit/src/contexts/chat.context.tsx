import { clearSession, generateUserId, getSessionId } from "@/utils/user-tracking";
import { getLogger } from "@ait/core";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

const logger = getLogger();

interface ChatContextType {
  isOpen: boolean;
  isFullscreen: boolean;
  userId: string;
  sessionId: string;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  toggleFullscreen: () => void;
  refreshSession: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");

  // Initialize user and session tracking on mount
  useEffect(() => {
    const uid = generateUserId();
    const sid = getSessionId();
    setUserId(uid);
    setSessionId(sid);

    logger.info("[AIt] User tracking initialized", { userId: uid, sessionId: sid });
  }, []);

  const openChat = () => setIsOpen(true);
  const closeChat = () => {
    setIsOpen(false);
    setIsFullscreen(false);
  };
  const toggleChat = () => setIsOpen((prev) => !prev);
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const refreshSession = () => {
    clearSession();
    const newSessionId = getSessionId();
    setSessionId(newSessionId);
    logger.info("[AIt] Session refreshed", { newSessionId });
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        isFullscreen,
        userId,
        sessionId,
        openChat,
        closeChat,
        toggleChat,
        toggleFullscreen,
        refreshSession,
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
