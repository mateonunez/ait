import {
  AItError,
  GoogleCalendarEventEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type GoogleCalendarEventDataTarget, drizzleOrm, getPostgresClient, googleCalendarEvents } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGoogleCalendarEventRepository } from "../../../../types/domain/entities/vendors/connector.google.types";

const logger = getLogger();

export class ConnectorGoogleCalendarEventRepository implements IConnectorGoogleCalendarEventRepository {
  private _pgClient = getPostgresClient();

  async saveEvent(
    event: GoogleCalendarEventEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const eventId = event.id;

    try {
      const eventDataTarget = event.toPlain<GoogleCalendarEventDataTarget>();
      eventDataTarget.id = eventId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<GoogleCalendarEventDataTarget> = {
          title: eventDataTarget.title,
          description: eventDataTarget.description,
          startTime: eventDataTarget.startTime,
          endTime: eventDataTarget.endTime,
          isAllDay: eventDataTarget.isAllDay,
          timeZone: eventDataTarget.timeZone,
          location: eventDataTarget.location,
          status: eventDataTarget.status,
          htmlUrl: eventDataTarget.htmlUrl,
          colorId: eventDataTarget.colorId,
          visibility: eventDataTarget.visibility,
          transparency: eventDataTarget.transparency,
          iCalUid: eventDataTarget.iCalUid,
          sequence: eventDataTarget.sequence,
          calendarId: eventDataTarget.calendarId,
          recurringEventId: eventDataTarget.recurringEventId,
          eventType: eventDataTarget.eventType,
          hangoutLink: eventDataTarget.hangoutLink,
          anyoneCanAddSelf: eventDataTarget.anyoneCanAddSelf,
          guestsCanInviteOthers: eventDataTarget.guestsCanInviteOthers,
          guestsCanModify: eventDataTarget.guestsCanModify,
          guestsCanSeeOtherGuests: eventDataTarget.guestsCanSeeOtherGuests,
          privateCopy: eventDataTarget.privateCopy,
          locked: eventDataTarget.locked,
          attendeesOmitted: eventDataTarget.attendeesOmitted,
          attendeesCount: eventDataTarget.attendeesCount,
          creatorData: eventDataTarget.creatorData as Record<string, unknown>,
          organizerData: eventDataTarget.organizerData as Record<string, unknown>,
          attendeesData: eventDataTarget.attendeesData as unknown[],
          recurrenceData: eventDataTarget.recurrenceData as unknown[],
          remindersData: eventDataTarget.remindersData as Record<string, unknown>,
          conferenceData: eventDataTarget.conferenceData as Record<string, unknown>,
          attachmentsData: eventDataTarget.attachmentsData as unknown[],
          extendedPropertiesData: eventDataTarget.extendedPropertiesData as Record<string, unknown>,
          metadata: eventDataTarget.metadata as Record<string, unknown>,
          eventCreatedAt: eventDataTarget.eventCreatedAt,
          eventUpdatedAt: eventDataTarget.eventUpdatedAt,
          updatedAt: new Date(),
        };

        await tx
          .insert(googleCalendarEvents)
          .values(eventDataTarget as GoogleCalendarEventDataTarget)
          .onConflictDoUpdate({
            target: googleCalendarEvents.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: unknown) {
      logger.error("Failed to save Google Calendar event:", { eventId: event.id, error });
      throw new AItError(
        "GOOGLE_CALENDAR_SAVE_EVENT",
        `Failed to save event ${event.id}: ${(error as Error).message}`,
        { id: event.id },
        error,
      );
    }
  }

  async saveEvents(events: GoogleCalendarEventEntity[]): Promise<void> {
    if (!events.length) {
      return;
    }

    await Promise.all(events.map((event) => this.saveEvent(event)));
  }

  async getEvent(id: string): Promise<GoogleCalendarEventEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(googleCalendarEvents)
      .where(drizzleOrm.eq(googleCalendarEvents.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return GoogleCalendarEventEntity.fromPlain(result[0]! as GoogleCalendarEventDataTarget);
  }

  async fetchEvents(): Promise<GoogleCalendarEventEntity[]> {
    const events = await this._pgClient.db
      .select()
      .from(googleCalendarEvents)
      .orderBy(drizzleOrm.desc(googleCalendarEvents.startTime));

    return events.map((event) => GoogleCalendarEventEntity.fromPlain(event as GoogleCalendarEventDataTarget));
  }

  async getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [events, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleCalendarEvents)
        .orderBy(drizzleOrm.desc(googleCalendarEvents.startTime))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googleCalendarEvents),
    ]);

    return buildPaginatedResponse(
      events.map((event) => GoogleCalendarEventEntity.fromPlain(event as GoogleCalendarEventDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
