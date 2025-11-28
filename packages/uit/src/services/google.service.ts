import { requestJson } from "@ait/core";
import type {
  PaginationParams,
  PaginatedResponse,
  RefreshResponse,
  GoogleCalendarEventEntity as GoogleCalendarEvent,
  GoogleCalendarCalendarEntity as GoogleCalendarCalendar,
  GoogleYouTubeSubscriptionEntity as GoogleYouTubeSubscription,
} from "@ait/core";

const BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";

export class GoogleService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = `${baseUrl}/api/google`;
  }

  async fetchEvents(params?: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEvent>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/events${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<GoogleCalendarEvent>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async fetchCalendars(params?: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendar>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/calendars${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<GoogleCalendarCalendar>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async fetchSubscriptions(params?: PaginationParams): Promise<PaginatedResponse<GoogleYouTubeSubscription>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/subscriptions${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<GoogleYouTubeSubscription>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async refresh() {
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh`, {
      method: "POST",
    });

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }
}

export const googleService = new GoogleService();

// Backward compatibility aliases
export { GoogleService as GoogleCalendarService };
export const googleCalendarService = googleService;
