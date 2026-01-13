import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ConnectorProvider, connectionsService } from "@/services/connections.service";
import { useEffect, useState } from "react";

interface ConnectorConfigModalProps {
  provider: ConnectorProvider | null;
  isOpen: boolean;
  onClose: (configId?: string) => void;
}

export function ConnectorConfigModal({ provider, isOpen, onClose }: ConnectorConfigModalProps) {
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && provider) {
      setName("");
      setError(null);

      // Apply schema defaults to the initial config
      const schema = provider.configSchema as { properties?: Record<string, { default?: unknown }> };
      const defaults: Record<string, unknown> = {};
      if (schema?.properties) {
        for (const [key, fieldSchema] of Object.entries(schema.properties)) {
          if (fieldSchema.default !== undefined) {
            defaults[key] = fieldSchema.default;
          }
        }
      }
      setConfig(defaults);
    }
  }, [isOpen, provider]);

  if (!provider) return null;

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const newConfig = await connectionsService.createConfig({
        providerId: provider.id,
        name: name || provider.name,
        config,
      });
      onClose(newConfig.id);
    } catch (err: any) {
      setError(err.message || "Failed to create configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Basic rendering of JSON schema fields
  const renderFields = () => {
    const schema = provider.configSchema as any;
    if (!schema || !schema.properties) {
      return null;
    }

    return Object.entries(schema.properties).map(([key, fieldSchema]: [string, any]) => (
      <div key={key} className="grid gap-2">
        <Label htmlFor={key}>{fieldSchema.title || key}</Label>
        <Input
          id={key}
          type={fieldSchema.type === "string" && fieldSchema.format === "password" ? "password" : "text"}
          placeholder={fieldSchema.description || ""}
          value={config[key] || ""}
          onChange={(e) => handleConfigChange(key, e.target.value)}
          required={schema.required?.includes(key)}
        />
        {fieldSchema.description && <p className="text-[10px] text-muted-foreground">{fieldSchema.description}</p>}
      </div>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configure {provider.name}</DialogTitle>
            <DialogDescription>{provider.description || `Set up your ${provider.name} connection.`}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="config-name">Connection Name</Label>
              <Input
                id="config-name"
                placeholder={`My ${provider.name}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-[10px] text-muted-foreground">Give this connection a name to identify it later.</p>
            </div>

            {renderFields()}

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Save & Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
