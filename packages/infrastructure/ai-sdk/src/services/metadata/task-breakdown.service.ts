import { createTaskStep } from "../../utils/metadata.utils";
import type { TaskStep } from "../../types";

/**
 * Service for breaking down complex queries into tasks
 */

export interface ITaskBreakdownService {
  breakdownQuery(query: string): TaskStep[];
  isComplexQuery(query: string): boolean;
}

export class TaskBreakdownService implements ITaskBreakdownService {
  private readonly complexityIndicators = [
    /(?:and then|after that|followed by)/i,
    /(?:first|second|third|finally)/i,
    /(?:step by step|one by one)/i,
    /(?:multiple|several|various)/i,
    /(?:\d+\s+(?:steps|tasks|things|items))/i,
  ];

  private readonly actionVerbs = [
    "analyze",
    "create",
    "generate",
    "find",
    "search",
    "compare",
    "explain",
    "summarize",
    "list",
    "calculate",
    "design",
    "implement",
    "review",
    "test",
  ];

  /**
   * Check if a query is complex enough to warrant task breakdown
   */
  isComplexQuery(query: string): boolean {
    // Check for complexity indicators
    const hasIndicators = this.complexityIndicators.some((pattern) => pattern.test(query));

    // Check for multiple action verbs
    const actionCount = this.actionVerbs.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(query)).length;

    // Check for compound sentences
    const hasCompoundSentences = query.includes(" and ") || query.includes(", ") || query.includes("; ");

    // Query is complex if it has indicators OR multiple actions OR is long with compound structure
    return hasIndicators || actionCount > 1 || (query.length > 100 && hasCompoundSentences);
  }

  /**
   * Break down a complex query into discrete tasks
   */
  breakdownQuery(query: string): TaskStep[] {
    if (!this.isComplexQuery(query)) {
      // Simple query - single task
      return [createTaskStep(query, 0)];
    }

    const tasks: TaskStep[] = [];

    // Try to split by explicit step markers
    const explicitSteps = this.extractExplicitSteps(query);
    if (explicitSteps.length > 1) {
      return explicitSteps.map((step, index) => createTaskStep(step, index));
    }

    // Try to split by action verbs
    const actionTasks = this.extractActionTasks(query);
    if (actionTasks.length > 1) {
      return actionTasks.map((task, index) => createTaskStep(task, index));
    }

    // Try to split by conjunctions
    const parts = query.split(/\s+(?:and|then|followed by)\s+/i);
    if (parts.length > 1) {
      return parts.map((part, index) => createTaskStep(part.trim(), index));
    }

    // Fallback: return single task
    return [createTaskStep(query, 0)];
  }

  /**
   * Extract explicitly numbered or marked steps
   */
  private extractExplicitSteps(query: string): string[] {
    const steps: string[] = [];

    // Match patterns like "1. Do this 2. Do that" or "First, ... Second, ..."
    const numberedPattern = /(?:\d+\.|Step \d+:|Phase \d+:)\s*([^.]+(?:\.[^.]+)*)/gi;
    const ordinalPattern = /(?:First|Second|Third|Finally|Then),?\s*([^.]+(?:\.[^.]+)*)/gi;

    let match: RegExpExecArray | null;

    // Try numbered steps
    // biome-ignore lint/suspicious/noAssignInExpressions: match is used in the while loop
    while ((match = numberedPattern.exec(query)) !== null) {
      steps.push(match[1]?.trim() ?? "");
    }

    // Try ordinal steps if no numbered steps found
    if (steps.length === 0) {
      // biome-ignore lint/suspicious/noAssignInExpressions: match is used in the while loop
      while ((match = ordinalPattern.exec(query)) !== null) {
        steps.push(match[1]?.trim() ?? "");
      }
    }

    return steps;
  }

  /**
   * Extract tasks based on action verbs
   */
  private extractActionTasks(query: string): string[] {
    const tasks: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const verb of this.actionVerbs) {
      const pattern = new RegExp(`\\b${verb}\\b[^.]*`, "gi");
      const matches = query.match(pattern);
      if (matches) {
        tasks.push(...matches.map((m) => m.trim()));
      }
    }

    // Remove duplicates and very short tasks
    return Array.from(new Set(tasks)).filter((task) => task.length > 10);
  }
}

// Singleton instance
let taskBreakdownService: ITaskBreakdownService | null = null;

export function getTaskBreakdownService(): ITaskBreakdownService {
  if (!taskBreakdownService) {
    taskBreakdownService = new TaskBreakdownService();
  }
  return taskBreakdownService;
}
