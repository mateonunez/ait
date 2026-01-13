import {
  AItError,
  GoogleCalendarCalendarEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import {
  type GoogleCalendarCalendarDataTarget,
  drizzleOrm,
  getPostgresClient,
  googleCalendarCalendars,
} from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGoogleCalendarCalendarRepository } from "../../../../types/domain/entities/vendors/connector.google.types";

const logger = getLogger();

export class ConnectorGoogleCalendarCalendarRepository implements IConnectorGoogleCalendarCalendarRepository {
  private _pgClient = getPostgresClient();

  async saveCalendar(
    calendar: GoogleCalendarCalendarEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const calendarId = calendar.id;

    try {
      const calendarDataTarget = calendar.toPlain<GoogleCalendarCalendarDataTarget>();
      calendarDataTarget.id = calendarId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<GoogleCalendarCalendarDataTarget> = {
          title: calendarDataTarget.title,
          description: calendarDataTarget.description,
          location: calendarDataTarget.location,
          timeZone: calendarDataTarget.timeZone,
          colorId: calendarDataTarget.colorId,
          backgroundColor: calendarDataTarget.backgroundColor,
          foregroundColor: calendarDataTarget.foregroundColor,
          accessRole: calendarDataTarget.accessRole,
          isPrimary: calendarDataTarget.isPrimary,
          isHidden: calendarDataTarget.isHidden,
          isSelected: calendarDataTarget.isSelected,
          isDeleted: calendarDataTarget.isDeleted,
          defaultRemindersData: calendarDataTarget.defaultRemindersData as any,
          notificationSettingsData: calendarDataTarget.notificationSettingsData as any,
          conferencePropertiesData: calendarDataTarget.conferencePropertiesData as any,
          metadata: calendarDataTarget.metadata as any,
          updatedAt: new Date(),
        };

        await tx
          .insert(googleCalendarCalendars)
          .values(calendarDataTarget as any)
          .onConflictDoUpdate({
            target: googleCalendarCalendars.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save Google Calendar calendar:", { calendarId: calendar.id, error: message });
      throw new AItError(
        "GOOGLE_CALENDAR_SAVE_CALENDAR",
        `Failed to save calendar ${calendar.id}: ${message}`,
        { id: calendar.id },
        error,
      );
    }
  }

  async saveCalendars(calendars: GoogleCalendarCalendarEntity[]): Promise<void> {
    if (!calendars.length) {
      return;
    }

    try {
      for (const calendar of calendars) {
        await this.saveCalendar(calendar, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving calendars:", { error });
      throw new AItError("GOOGLE_CALENDAR_SAVE_CALENDAR_BULK", "Failed to save calendars to repository");
    }
  }

  async getCalendar(id: string): Promise<GoogleCalendarCalendarEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(googleCalendarCalendars)
      .where(drizzleOrm.eq(googleCalendarCalendars.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return GoogleCalendarCalendarEntity.fromPlain(result[0]! as GoogleCalendarCalendarDataTarget);
  }

  async fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]> {
    const calendars = await this._pgClient.db
      .select()
      .from(googleCalendarCalendars)
      .orderBy(drizzleOrm.desc(googleCalendarCalendars.isPrimary));

    return calendars.map((calendar) =>
      GoogleCalendarCalendarEntity.fromPlain(calendar as GoogleCalendarCalendarDataTarget),
    );
  }

  async getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [calendars, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleCalendarCalendars)
        .orderBy(drizzleOrm.desc(googleCalendarCalendars.isPrimary))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googleCalendarCalendars),
    ]);

    return buildPaginatedResponse(
      calendars.map((calendar) => GoogleCalendarCalendarEntity.fromPlain(calendar as GoogleCalendarCalendarDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
