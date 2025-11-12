import "./App.css";
import { Route, Switch } from "wouter";
import HomePage from "./pages/home-page";
import GitHubPage from "./pages/integrations/github-page";
import SpotifyPage from "./pages/integrations/spotify-page";
import XPage from "./pages/integrations/x-page";
import LinearPage from "./pages/integrations/linear-page";
import { AIChatDialog } from "./components/ai-chat-dialog";
import { useChatDialog } from "./contexts/chat.context";

export default function App() {
  const { isOpen, closeChat } = useChatDialog();

  return (
    <>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/integrations/github" component={GitHubPage} />
        <Route path="/integrations/spotify" component={SpotifyPage} />
        <Route path="/integrations/x" component={XPage} />
        <Route path="/integrations/linear" component={LinearPage} />
        <Route>
          <div className="min-h-dvh flex items-center justify-center">
            <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
          </div>
        </Route>
      </Switch>

      {/* Global AI Chat Dialog */}
      <AIChatDialog open={isOpen} onOpenChange={(open) => !open && closeChat()} />
    </>
  );
}
