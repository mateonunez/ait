import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/theme-provider";
import AItRoot from "./components/uit.root.tsx";
import ChatRoot from "./components/chat.root.tsx";
import { StatsProvider } from "./contexts/stats.context";
import { ErrorBoundary } from "./components/error-boundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
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
  </StrictMode>,
);
