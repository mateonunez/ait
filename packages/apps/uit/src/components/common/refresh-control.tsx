import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/styles/utils";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

export interface RefreshEntity {
  id: string;
  label: string;
}

interface RefreshControlProps {
  onRefresh: (selectedIds?: string[]) => void;
  availableEntities?: RefreshEntity[];
  activeEntityId?: string; // The current tab/context entity ID
  isRefreshing?: boolean;
  className?: string;
}

export function RefreshControl({
  onRefresh,
  availableEntities = [],
  activeEntityId,
  isRefreshing,
  className,
}: RefreshControlProps) {
  if (!availableEntities || availableEntities.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRefresh()}
        disabled={isRefreshing}
        className={cn("gap-1.5 sm:gap-2 px-2 sm:px-3", className)}
      >
        <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isRefreshing && "animate-spin")} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    );
  }

  // Track if user has interacted with dropdown (made explicit selection)
  const [hasExplicitSelection, setHasExplicitSelection] = useState(false);
  // Start with empty selection - user must explicitly choose
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleRefreshClick = () => {
    if (hasExplicitSelection && selectedIds.length > 0) {
      // User made explicit selection via dropdown - use their selection
      onRefresh(selectedIds);
    } else if (activeEntityId) {
      // No explicit selection - default to current tab/context entity only
      onRefresh([activeEntityId]);
    } else {
      // No active entity and no selection - refresh all
      onRefresh();
    }
  };

  const toggleEntity = (id: string, checked: boolean) => {
    setHasExplicitSelection(true);
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
    }
  };

  const isAllSelected = selectedIds.length === availableEntities.length && availableEntities.length > 0;

  // Determine what the button label should show
  const getButtonLabel = () => {
    if (hasExplicitSelection) {
      if (selectedIds.length === 0) {
        return "Refresh";
      }
      if (selectedIds.length === availableEntities.length) {
        return "Refresh All";
      }
      return `Refresh (${selectedIds.length})`;
    }
    if (activeEntityId) {
      const activeEntity = availableEntities.find((e) => e.id === activeEntityId);
      return activeEntity ? `Refresh ${activeEntity.label}` : "Refresh";
    }
    return "Refresh";
  };

  // Disable button only if user made explicit selection but selected nothing
  const isButtonDisabled = isRefreshing || (hasExplicitSelection && selectedIds.length === 0);

  return (
    <div className={cn("flex items-center rounded-md shadow-sm", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefreshClick}
        disabled={isButtonDisabled}
        className={cn(
          "rounded-r-none border-r-0 gap-1.5 sm:gap-2 px-2 sm:px-3 focus-visible:z-10",
          isRefreshing && "opacity-70 cursor-wait",
        )}
      >
        <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isRefreshing && "animate-spin")} />
        <span className="hidden sm:inline">{getButtonLabel()}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className={cn("rounded-l-none px-1.5 sm:px-2 focus-visible:z-10", isRefreshing && "opacity-70 cursor-wait")}
          >
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sr-only">Open refresh options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Refresh Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableEntities.map((entity) => (
            <DropdownMenuCheckboxItem
              key={entity.id}
              checked={selectedIds.includes(entity.id)}
              onCheckedChange={(checked) => toggleEntity(entity.id, checked)}
            >
              {entity.label}
              {entity.id === activeEntityId && " (current)"}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={isAllSelected}
            onCheckedChange={(checked) => {
              setHasExplicitSelection(true);
              if (checked) {
                setSelectedIds(availableEntities.map((e) => e.id));
              } else {
                setSelectedIds([]);
              }
            }}
          >
            Select All
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
