type Item = {
  id: string;
  title: string;
  description: string;
  color: string;
  size: "xs" | "sm" | "md" | "lg" | "full";
  disabled: boolean;
  route?: string;
};

export const AIT_SERVICES: Item[] = [
  {
    id: "github",
    title: "GitHub",
    description: "Recent activity and repositories",
    color: "#1A1E22",
    size: "lg",
    disabled: false,
    route: "/integrations/github",
  },
  {
    id: "spotify",
    title: "Spotify",
    description: "Now playing",
    color: "#1DB954",
    size: "lg",
    disabled: false,
    route: "/integrations/spotify",
  },
  {
    id: "x-twitter",
    title: "X (Twitter)",
    description: "Latest tweets",
    color: "#14171A",
    size: "md",
    disabled: false,
    route: "/integrations/x",
  },
  {
    id: "linear",
    title: "Linear",
    description: "Assigned issues",
    color: "#5e6ad2",
    size: "md",
    disabled: false,
    route: "/integrations/linear",
  },
  {
    id: "discord",
    title: "Discord",
    description: "Server activity",
    color: "#5865F2",
    size: "sm",
    disabled: true,
  },
  {
    id: "youtube",
    title: "YouTube",
    description: "Latest videos and analytics",
    color: "#FF0000",
    size: "full",
    disabled: true,
  },
  {
    id: "notion",
    title: "Notion",
    description: "Recent documents and updates",
    color: "#000000",
    size: "full",
    disabled: false,
    route: "/integrations/notion",
  },
  {
    id: "slack",
    title: "Slack",
    description: "Channel updates",
    color: "#4A154B",
    size: "sm",
    disabled: true,
  },
  {
    id: "vercel",
    title: "Vercel",
    description: "Deployment status",
    color: "#000000",
    size: "xs",
    disabled: true,
  },
  {
    id: "figma",
    title: "Figma",
    description: "Recent files",
    color: "#1E1E1E",
    size: "xs",
    disabled: true,
  },
  {
    id: "aws",
    title: "AWS",
    description: "Service status and metrics",
    color: "#FF9900",
    size: "full",
    disabled: true,
  },
  {
    id: "stripe",
    title: "Stripe",
    description: "Payment analytics",
    color: "#635BFF",
    size: "xs",
    disabled: true,
  },
] as const;
