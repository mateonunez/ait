"use client";

import { Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";

export function FeatureItem({
  icon: Icon,
  label,
  value,
  unit,
}: { icon: LucideIcon; label: string; value?: number; unit: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value ? (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {value} {unit}
          </Badge>
        ) : (
          <Circle className="h-2 w-2 text-muted-foreground/20 fill-current" />
        )}
      </div>
    </div>
  );
}
