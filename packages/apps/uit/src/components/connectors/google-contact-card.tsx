import { formatRelativeTime } from "@ait/core";
import { getEntityDate } from "@ait/core";
import type { GoogleContactEntity } from "@ait/core";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, User } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardDescription,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardHeader,
  ConnectorCardTitle,
} from "./connector-card-base";

interface ContactCardProps {
  contact: GoogleContactEntity;
  onClick?: () => void;
  className?: string;
}

export function GoogleContactCard({ contact, onClick, className }: ContactCardProps) {
  const date = getEntityDate(contact);

  return (
    <ConnectorCardBase service="google" onClick={onClick} className={className}>
      <ConnectorCardContent>
        {/* Header with User Icon */}
        <ConnectorCardHeader>
          <motion.div
            className="shrink-0 pt-0.5 text-blue-600 dark:text-blue-500"
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <User className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.div>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="google" className="line-clamp-2">
              {contact.displayName || "Unknown Contact"}
            </ConnectorCardTitle>
            {date && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Last synced {formatRelativeTime(date.toISOString())}
              </p>
            )}
          </div>
        </ConnectorCardHeader>

        {/* Info Section */}
        <div className="flex gap-4 items-start">
          {contact.photoUrl && (
            <motion.div
              className="shrink-0"
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <img
                src={contact.photoUrl}
                alt={contact.displayName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-border/50 ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all shadow-sm"
              />
            </motion.div>
          )}

          <div className="flex-1 space-y-2 min-w-0">
            {contact.organization && (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-500/70" />
                <span className="truncate font-medium">
                  {contact.organization}
                  {contact.jobTitle && <span className="text-muted-foreground font-normal"> • {contact.jobTitle}</span>}
                </span>
              </div>
            )}

            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Mail className="h-3.5 w-3.5 shrink-0 text-blue-500/70" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}

            {contact.phoneNumber && (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Phone className="h-3.5 w-3.5 shrink-0 text-blue-500/70" />
                <span>{contact.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        {contact.biography && (
          <ConnectorCardDescription className="line-clamp-2 mt-3 text-xs italic opacity-80">
            "{contact.biography}"
          </ConnectorCardDescription>
        )}

        {/* Footer */}
        <ConnectorCardFooter className="mt-4 pt-3 border-t border-border/50">
          <ConnectorCardFooterBadges>
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider font-bold bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20"
            >
              Contact
            </Badge>
          </ConnectorCardFooterBadges>
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
