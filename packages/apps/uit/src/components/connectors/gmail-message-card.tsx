import type { GmailMessageEntity } from "@ait/core";
import { Mail } from "lucide-react";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardDescription,
  ConnectorCardFooter,
  ConnectorCardHeader,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface GmailMessageCardProps {
  item: GmailMessageEntity;
  className?: string;
  onClick?: () => void;
}

export function GmailMessageCard({ item, className, onClick }: GmailMessageCardProps) {
  const date = new Date(item.internalDate ? Number.parseInt(item.internalDate) : item.createdAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <ConnectorCardBase service="google" onClick={onClick} className={className}>
      <ConnectorCardContent>
        <ConnectorCardHeader>
          <div className="p-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <ConnectorCardTitle service="google">{item.subject || "(No Subject)"}</ConnectorCardTitle>
            <div className="text-xs text-muted-foreground mt-1 truncate">From: {item.from}</div>
          </div>
        </ConnectorCardHeader>

        <ConnectorCardDescription>{item.snippet}</ConnectorCardDescription>

        <ConnectorCardFooter>
          <div className="flex-1" />
          <ConnectorCardTimestamp>{formattedDate}</ConnectorCardTimestamp>
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
