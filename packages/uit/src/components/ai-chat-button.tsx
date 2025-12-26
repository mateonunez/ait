import { Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { SidebarMenuButton } from "./ui/sidebar";

export function AIChatButton() {
  const [, setLocation] = useLocation();

  return (
    <SidebarMenuButton onClick={() => setLocation("/chat")} tooltip="Chat with AIt">
      <Sparkles className="h-[1.2rem] w-[1.2rem]" />
      <span>AIt</span>
    </SidebarMenuButton>
  );
}
