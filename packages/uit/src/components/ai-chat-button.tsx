import { useChatDialog } from "@/contexts/chat.context";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";

export function AIChatButton() {
  const { openChat } = useChatDialog();

  return (
    <Button variant="outline" size="icon" onClick={openChat} className="relative group" title="Chat with AIt">
      <Sparkles className="h-[1.2rem] w-[1.2rem] transition-all group-hover:scale-110 group-hover:rotate-12" />
      <span className="absolute inset-0 rounded-md bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Button>
  );
}
