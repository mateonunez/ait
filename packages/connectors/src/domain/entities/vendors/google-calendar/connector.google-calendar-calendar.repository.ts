import { AItError, type PaginatedResponse, type PaginationParams, type GoogleCalendarCalendarEntity } from "@ait/core";
import { connectorGoogleCalendarCalendarMapper } from "../../../mappers/vendors/connector.google.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGoogleCalendarCalendarRepository } from "../../../../types/domain/entities/vendors/connector.google-calendar.types";
import {
  getPostgresClient,
  googleCalendarCalendars,
  type GoogleCalendarCalendarDataTarget,
  drizzleOrm,
} from "@ait/postgres";

export class ConnectorGoogleCalendarCalendarRepository implements IConnectorGoogleCalendarCalendarRepository {
  private _pgClient = getPostgresClient();

  async saveCalendar(
    calendar: GoogleCalendarCalendarEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const calendarId = calendar.id;

    try {
      const calendarDataTarget = connectorGoogleCalendarCalendarMapper.domainToDataTarget(calendar);
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
          defaultRemindersData: calendarDataTarget.defaultRemindersData,
          notificationSettingsData: calendarDataTarget.notificationSettingsData,
          conferencePropertiesData: calendarDataTarget.conferencePropertiesData,
          metadata: calendarDataTarget.metadata,
          updatedAt: new Date(),
        };

        await tx
          .insert(googleCalendarCalendars)
          .values(calendarDataTarget)
          .onConflictDoUpdate({
            target: googleCalendarCalendars.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save Google Calendar calendar:", { calendarId: calendar.id, error });
      throw new AItError(
        "GOOGLE_CALENDAR_SAVE_CALENDAR",
        `Failed to save calendar ${calendar.id}: ${error.message}`,
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
      console.error("Error saving calendars:", error);
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

    return connectorGoogleCalendarCalendarMapper.dataTargetToDomain(result[0]!);
  }

  async fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]> {
    const calendars = await this._pgClient.db
      .select()
      .from(googleCalendarCalendars)
      .orderBy(drizzleOrm.desc(googleCalendarCalendars.isPrimary));

    return calendars.map((calendar) => connectorGoogleCalendarCalendarMapper.dataTargetToDomain(calendar));
  }

  async getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [calendars, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleCalendarCalendars)
        .orderBy(drizzleOrm.desc(googleCalendarCalendars.isPrimary))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googleCalendarCalendars),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: calendars.map((calendar) => connectorGoogleCalendarCalendarMapper.dataTargetToDomain(calendar)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
