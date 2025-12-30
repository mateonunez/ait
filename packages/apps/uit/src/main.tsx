import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/error-boundary.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";
import AItRoot from "./components/uit.root.tsx";
import { StatsProvider } from "./contexts/stats.context.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <AItRoot>
        <ThemeProvider defaultTheme="system" storageKey="uit-theme">
          <StatsProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </StatsProvider>
        </ThemeProvider>
      </AItRoot>
    </Router>
  </StrictMode>,
);
