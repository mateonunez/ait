import { AItError, type PaginatedResponse, type PaginationParams, type GoogleCalendarEventEntity } from "@ait/core";
import { connectorGoogleCalendarEventMapper } from "../../../mappers/vendors/connector.google.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGoogleCalendarEventRepository } from "../../../../types/domain/entities/vendors/connector.google.types";
import { getPostgresClient, googleCalendarEvents, type GoogleCalendarEventDataTarget, drizzleOrm } from "@ait/postgres";

export class ConnectorGoogleCalendarEventRepository implements IConnectorGoogleCalendarEventRepository {
  private _pgClient = getPostgresClient();

  async saveEvent(
    event: GoogleCalendarEventEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const eventId = event.id;

    try {
      const eventDataTarget = connectorGoogleCalendarEventMapper.domainToDataTarget(event);
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
          creatorData: eventDataTarget.creatorData,
          organizerData: eventDataTarget.organizerData,
          attendeesData: eventDataTarget.attendeesData,
          recurrenceData: eventDataTarget.recurrenceData,
          remindersData: eventDataTarget.remindersData,
          conferenceData: eventDataTarget.conferenceData,
          attachmentsData: eventDataTarget.attachmentsData,
          extendedPropertiesData: eventDataTarget.extendedPropertiesData,
          metadata: eventDataTarget.metadata,
          eventCreatedAt: eventDataTarget.eventCreatedAt,
          eventUpdatedAt: eventDataTarget.eventUpdatedAt,
          updatedAt: new Date(),
        };

        await tx
          .insert(googleCalendarEvents)
          .values(eventDataTarget)
          .onConflictDoUpdate({
            target: googleCalendarEvents.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save Google Calendar event:", { eventId: event.id, error });
      throw new AItError(
        "GOOGLE_CALENDAR_SAVE_EVENT",
        `Failed to save event ${event.id}: ${error.message}`,
        { id: event.id },
        error,
      );
    }
  }

  async saveEvents(events: GoogleCalendarEventEntity[]): Promise<void> {
    if (!events.length) {
      return;
    }

    try {
      for (const event of events) {
        await this.saveEvent(event, { incremental: false });
      }
    } catch (error) {
      console.error("Error saving events:", error);
      throw new AItError("GOOGLE_CALENDAR_SAVE_EVENT_BULK", "Failed to save events to repository");
    }
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

    return connectorGoogleCalendarEventMapper.dataTargetToDomain(result[0]!);
  }

  async fetchEvents(): Promise<GoogleCalendarEventEntity[]> {
    const events = await this._pgClient.db
      .select()
      .from(googleCalendarEvents)
      .orderBy(drizzleOrm.desc(googleCalendarEvents.startTime));

    return events.map((event) => connectorGoogleCalendarEventMapper.dataTargetToDomain(event));
  }

  async getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [events, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleCalendarEvents)
        .orderBy(drizzleOrm.desc(googleCalendarEvents.startTime))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googleCalendarEvents),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: events.map((event) => connectorGoogleCalendarEventMapper.dataTargetToDomain(event)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
