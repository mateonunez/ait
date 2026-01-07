"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  FileText,
  Github,
  Home,
  Link2,
  MessageSquare,
  Music,
  Table,
  Twitter,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "wouter";

// Navigation structure - colors are for light mode accent, icons use currentColor for dark mode compatibility
const INTEGRATIONS = [
  { title: "GitHub", url: "/integrations/github", icon: Github, slug: "github" },
  { title: "Spotify", url: "/integrations/spotify", icon: Music, color: "#1DB954", slug: "spotify" },
  { title: "X (Twitter)", url: "/integrations/x", icon: Twitter, slug: "x" },
  { title: "Linear", url: "/integrations/linear", icon: Zap, color: "#5E6AD2", slug: "linear" },
  { title: "Notion", url: "/integrations/notion", icon: FileText, slug: "notion" },
  { title: "Slack", url: "/integrations/slack", icon: MessageSquare, color: "#E01E5A", slug: "slack" },
  { title: "Google", url: "/integrations/google", icon: Calendar, color: "#4285F4", slug: "google" },
];

const SETTINGS = [
  { title: "Connections", url: "/connections", icon: Link2 },
  { title: "Stats", url: "/stats", icon: BarChart3 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isVendorGranted } = useConnectionStatus();

  const isActive = (url: string) => location === url;

  const grantedIntegrations = INTEGRATIONS.filter((item) => isVendorGranted(item.slug as any));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="AIt">
              <Link href="/">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shrink-0">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">AIt</span>
                  {/* add here an AI integration to place randomically messages */}
                  <span className="text-xs text-muted-foreground">Yo! </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")}>
                  <Link href="/">
                    <Home />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/chat") || location.startsWith("/chat/")}>
                  <Link href="/chat">
                    <MessageSquare />
                    <span>Chait</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarMenu>
            <Collapsible defaultOpen asChild className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Integrations">
                    <Table />
                    <span>Integrations</span>
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {grantedIntegrations.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" style={item.color ? { color: item.color } : undefined} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SETTINGS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
