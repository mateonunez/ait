import "./App.css";
import { Route, Switch } from "wouter";
import { SidebarLayout } from "./components/sidebar-layout";
import { IntegrationsProvider } from "./contexts/integrations.context";
import { LayoutProvider } from "./contexts/layout.context";
import ChatPage from "./pages/chat-page";
import ConnectionsPage from "./pages/connections-page";
import HomePage from "./pages/home-page";
import GitHubPage from "./pages/integrations/github-page";
import GooglePage from "./pages/integrations/google-page";
import LinearPage from "./pages/integrations/linear-page";
import NotionPage from "./pages/integrations/notion-page";
import SlackPage from "./pages/integrations/slack-page";
import SpotifyPage from "./pages/integrations/spotify-page";
import XPage from "./pages/integrations/x-page";
import StatsPage from "./pages/stats-page";

export default function App() {
  return (
    <IntegrationsProvider>
      <LayoutProvider>
        <SidebarLayout>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/chat" component={ChatPage} />
            <Route path="/chat/:conversationId" component={ChatPage} />
            <Route path="/connections" component={ConnectionsPage} />
            <Route path="/integrations/github" component={GitHubPage} />
            <Route path="/integrations/spotify" component={SpotifyPage} />
            <Route path="/integrations/x" component={XPage} />
            <Route path="/integrations/linear" component={LinearPage} />
            <Route path="/integrations/notion" component={NotionPage} />
            <Route path="/integrations/slack" component={SlackPage} />
            <Route path="/integrations/google" component={GooglePage} />
            <Route path="/stats" component={StatsPage} />
            <Route>
              <div className="min-h-dvh flex items-center justify-center">
                <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
              </div>
            </Route>
          </Switch>
        </SidebarLayout>
      </LayoutProvider>
    </IntegrationsProvider>
  );
}
