import { cn } from "@/styles/utils";
import type { RAGContextMetadata, RetrievedDocument } from "@ait/core";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Database, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/badge";

interface ContextPanelProps {
  context: RAGContextMetadata;
  className?: string;
}

export function ContextPanel({ context, className }: ContextPanelProps) {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const toggleDoc = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Show fallback warning
  if (context.fallbackUsed) {
    return (
      <div
        className={cn(
          "rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-4",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">Fallback Context Used</span>
        </div>
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">{context.fallbackReason}</p>
      </div>
    );
  }

  // Show "no documents" message when retrieval returned 0 results
  if (context.documents.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-background p-4 space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Retrieved Context</span>
          </div>
          <Badge variant="outline">0 documents</Badge>
        </div>

        {/* Stats - show even with 0 documents */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/50">
            <span className="text-muted-foreground block mb-0.5">Context Tokens</span>
            <p className="font-medium text-muted-foreground">0</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <span className="text-muted-foreground block mb-0.5">Documents</span>
            <p className="font-medium text-muted-foreground">0</p>
          </div>
          {context.retrievalTimeMs && (
            <div className="p-2 rounded bg-muted/50">
              <span className="text-muted-foreground block mb-0.5">Retrieval</span>
              <p className="font-medium text-orange-600 dark:text-orange-400">{context.retrievalTimeMs}ms</p>
            </div>
          )}
        </div>

        {/* No results message */}
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            No relevant documents found for this query.
            <br />
            <span className="text-xs">Try rephrasing or check if documents are indexed.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-background p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Retrieved Context</span>
        </div>
        <Badge variant="outline">{context.documents.length} documents</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded bg-muted/50">
          <span className="text-muted-foreground block mb-0.5">Context Tokens</span>
          <p className="font-medium text-primary">{Math.ceil(context.contextLength / 4).toLocaleString()}</p>
        </div>
        <div className="p-2 rounded bg-muted/50">
          <span className="text-muted-foreground block mb-0.5">Documents</span>
          <p className="font-medium text-primary">{context.documents.length}</p>
        </div>
        {context.retrievalTimeMs && (
          <div className="p-2 rounded bg-muted/50">
            <span className="text-muted-foreground block mb-0.5">Retrieval</span>
            <p className="font-medium text-primary">{context.retrievalTimeMs}ms</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="space-y-2">
        {context.documents
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 10)
          .map((doc: RetrievedDocument) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              expanded={expandedDocs.has(doc.id)}
              onToggle={() => toggleDoc(doc.id)}
            />
          ))}
        {context.documents.length > 10 && (
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            +{context.documents.length - 10} more documents
          </div>
        )}
      </div>
    </div>
  );
}

interface DocumentCardProps {
  document: RetrievedDocument;
  expanded: boolean;
  onToggle: () => void;
}

function DocumentCard({ document, expanded, onToggle }: DocumentCardProps) {
  // Ensure score is a number and within 0-1 range
  const score = typeof document.score === "number" ? document.score : 0;
  const relevancePercent = (Math.min(Math.max(score, 0), 1) * 100).toFixed(0);

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3 flex items-start justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 text-left space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {document.source?.type || "document"}
            </Badge>
            {document.source?.identifier && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{document.source.identifier}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{document.content}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-xs font-medium text-primary">{relevancePercent}%</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-3 space-y-2 bg-muted/30">
              <p className="text-xs text-foreground whitespace-pre-wrap">{document.content}</p>

              {document.source.url && (
                <a
                  href={document.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View source
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {document.entityTypes && document.entityTypes.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {document.entityTypes.map((type: string) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
