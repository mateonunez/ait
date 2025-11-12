import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Cpu } from "lucide-react";
import { cn } from "@/styles/utils";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import type { ModelMetadata } from "@ait/core";
import { listModels } from "@/utils/api";

interface ModelSelectorProps {
  selectedModelId?: string;
  onModelSelect: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({ selectedModelId, onModelSelect, className }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const modelList = await listModels();
      setModels(modelList);
    } catch (error) {
      console.error("[ModelSelector] Failed to load models:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  const handleSelect = (modelId: string) => {
    onModelSelect(modelId);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border border-border", className)}>
        <Cpu className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading models...</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between gap-2 px-3 py-2 rounded-lg",
            "border border-border bg-background hover:bg-muted",
            "transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            className,
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{selectedModel?.name || "Select model"}</span>
            {selectedModel && (
              <Badge variant="secondary" className="text-xs">
                {selectedModel.provider}
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Select AI Model</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {models.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">No models available</div>
        ) : (
          models.map((model) => (
            <DropdownMenuItem key={model.id} onClick={() => handleSelect(model.id)} className="cursor-pointer">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{model.name}</span>
                    {model.id === selectedModel?.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {model.provider}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(model.contextWindow / 1000).toFixed(0)}K context
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
