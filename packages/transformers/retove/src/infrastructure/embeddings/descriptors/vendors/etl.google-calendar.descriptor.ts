import { getAIDescriptorService } from "@ait/ai-sdk";
import type { GoogleCalendarEventDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLGoogleCalendarEventDescriptor implements IETLEmbeddingDescriptor<GoogleCalendarEventDataTarget> {
  public async enrich(event: GoogleCalendarEventDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const context = `Google Calendar Event: ${event.title}`;
    const content = [
      event.description ? `Description: ${event.description}` : null,
      event.location ? `Location: ${event.location}` : null,
      event.startTime ? `Time: ${event.startTime}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (!content) return null;

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<GoogleCalendarEventDataTarget>): string {
    const { target: event, enrichment } = enriched;
    const parts: string[] = [];

    // Event identity
    parts.push("Calendar event");

    // Title is the main content
    if (event.title) {
      const sanitizedTitle = TextSanitizer.sanitize(event.title);
      parts.push(`"${sanitizedTitle}"`);
    }

    // Add timing context
    if (event.startTime) {
      const startDate = new Date(event.startTime);
      const dateStr = startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = event.isAllDay
        ? "all day"
        : startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      parts.push(`on ${dateStr} at ${timeStr}`);
    }

    // Duration context
    if (event.startTime && event.endTime) {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const durationMs = end.getTime() - start.getTime();
      const durationMins = Math.round(durationMs / 60000);

      if (durationMins >= 60) {
        const hours = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        parts.push(`(${hours}h${mins > 0 ? ` ${mins}m` : ""} duration)`);
      } else {
        parts.push(`(${durationMins}m duration)`);
      }
    }

    // Location provides context
    if (event.location) {
      const sanitizedLocation = TextSanitizer.sanitize(event.location);
      parts.push(`at ${sanitizedLocation}`);
    }

    // Add video meeting context
    if (event.hangoutLink) {
      parts.push("with video call");
    }

    // Add description if available
    if (event.description) {
      const sanitizedDesc = TextSanitizer.sanitize(event.description);
      const descPreview = sanitizedDesc.length > 300 ? `${sanitizedDesc.slice(0, 300)}...` : sanitizedDesc;
      parts.push(`Description: ${descPreview}`);
    }

    // Add attendees context
    if (event.attendeesCount && event.attendeesCount > 0) {
      parts.push(`with ${event.attendeesCount} attendee${event.attendeesCount > 1 ? "s" : ""}`);
    }

    // Add status
    if (event.status && event.status !== "confirmed") {
      parts.push(`(${event.status})`);
    }

    // Recurring event indicator
    if (event.recurringEventId) {
      parts.push("(recurring)");
    }

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(
    enriched: EnrichedEntity<GoogleCalendarEventDataTarget>,
  ): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      title: entityWithoutInternalTimestamps.title
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.title, 500)
        : "",
      description: entityWithoutInternalTimestamps.description
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.description, 2000)
        : null,
      location: entityWithoutInternalTimestamps.location
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.location, 255)
        : null,
    };

    return {
      __type: "event",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const googleCalendarDescriptorsETL = {
  event: new ETLGoogleCalendarEventDescriptor(),
};
