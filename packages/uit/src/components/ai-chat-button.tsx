import { useChatDialog } from "@/contexts/chat.context";
import { Sparkles } from "lucide-react";
import { SidebarMenuButton } from "./ui/sidebar";

export function AIChatButton() {
  const { openChat } = useChatDialog();

  return (
    <SidebarMenuButton onClick={openChat} tooltip="Chat with AIt">
      <Sparkles className="h-[1.2rem] w-[1.2rem]" />
      <span>&gt; AIt</span>
    </SidebarMenuButton>
  );
}
