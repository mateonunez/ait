import type { GooglePhotoExternal } from "@ait/core";
import type { ConnectorCursor } from "../../services/vendors/connector.vendors.config";

export interface GooglePhotosPaginatedResponse<T = GooglePhotoExternal> {
  mediaItems: T[];
  nextPageToken?: string;
  nextCursor?: ConnectorCursor;
}
