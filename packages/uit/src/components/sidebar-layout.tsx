"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

interface SidebarLayoutProps {
  children: ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/connections": "Connections",
  "/stats": "Stats",
  "/integrations/github": "GitHub",
  "/integrations/spotify": "Spotify",
  "/integrations/x": "X (Twitter)",
  "/integrations/linear": "Linear",
  "/integrations/notion": "Notion",
  "/integrations/slack": "Slack",
  "/integrations/google": "Google",
};

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [location] = useLocation();
  const pageTitle = PAGE_TITLES[location] || "AIt";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1 hover:bg-accent" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">{pageTitle}</span>
        </header>
        <div className="flex-1 overflow-auto min-h-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
