import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "./index.css";
import App from "./App.tsx";
import ChatRoot from "./components/chat.root.tsx";
import { ErrorBoundary } from "./components/error-boundary";
import { ThemeProvider } from "./components/theme-provider";
import AItRoot from "./components/uit.root.tsx";
import { StatsProvider } from "./contexts/stats.context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <AItRoot>
        <ThemeProvider defaultTheme="system" storageKey="uit-theme">
          <StatsProvider>
            <ErrorBoundary>
              <ChatRoot>
                <App />
              </ChatRoot>
            </ErrorBoundary>
          </StatsProvider>
        </ThemeProvider>
      </AItRoot>
    </Router>
  </StrictMode>,
);
