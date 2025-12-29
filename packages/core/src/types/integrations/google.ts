import type { GoogleCalendarEntity } from "./google-calendar";
import type { GoogleContactEntity } from "./google-contact";
import type { GooglePhotoEntity } from "./google-photos";
import type { GoogleYouTubeSubscriptionEntity } from "./google-youtube";

export type GoogleEntity =
  | GoogleCalendarEntity
  | GoogleYouTubeSubscriptionEntity
  | GoogleContactEntity
  | GooglePhotoEntity;
