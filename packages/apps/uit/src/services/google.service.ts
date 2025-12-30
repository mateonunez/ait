import { requestJson } from "@ait/core";
import type {
  GoogleCalendarEntityType as GoogleCalendar,
  GoogleCalendarEventEntity as GoogleCalendarEvent,
  GoogleContactEntity as GoogleContact,
  GooglePhotoEntity as GooglePhoto,
  GoogleYouTubeSubscriptionEntity as GoogleYouTubeSubscription,
  PaginatedResponse,
  PaginationParams,
  RefreshResponse,
} from "@ait/core";
import { apiConfig, buildQueryString } from "../config/api.config";

export class GoogleService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${apiConfig.gatewayUrl}/api/google`;
  }

  async fetchEvents(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/events${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GoogleCalendarEvent>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchCalendars(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/calendars${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GoogleCalendar>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchSubscriptions(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/subscriptions${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GoogleYouTubeSubscription>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchContacts(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/contacts${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GoogleContact>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchPhotos(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/photos${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GooglePhoto>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async refresh() {
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh`, { method: "POST" });
    if (!result.ok) throw result.error;
    return result.value.data;
  }
}

export const googleService = new GoogleService();
