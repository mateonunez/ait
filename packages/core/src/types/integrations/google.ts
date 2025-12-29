import type { GoogleCalendarEntityType } from "./google-calendar";
import type { GoogleContactEntityType } from "./google-contact";
import type { GooglePhotoEntityType } from "./google-photos";
import type { GoogleYouTubeSubscriptionEntityType } from "./google-youtube";

export type GoogleEntityType =
  | GoogleCalendarEntityType
  | GoogleYouTubeSubscriptionEntityType
  | GoogleContactEntityType
  | GooglePhotoEntityType;
