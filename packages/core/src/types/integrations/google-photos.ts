import { z } from "zod";

export interface GooglePhotoMediaMetadata {
  creationTime: string;
  width: string;
  height: string;
  photo?: {
    cameraMake?: string;
    cameraModel?: string;
    focalLength?: number;
    apertureFNumber?: number;
    isoEquivalent?: number;
    exposureTime?: string;
  };
  video?: {
    cameraMake?: string;
    cameraModel?: string;
    fps?: number;
    status?: string;
  };
}

export interface GooglePhotoContributorInfo {
  profilePictureBaseUrl: string;
  displayName: string;
}

export interface GooglePhotoExternal {
  id: string;
  description?: string;
  productUrl: string;
  baseUrl: string; // The URL to the media item's bytes. This shouldn't be used as is, but rather taking parameters (e.g. w, h).
  mimeType: string;
  mediaMetadata: GooglePhotoMediaMetadata;
  contributorInfo?: GooglePhotoContributorInfo;
  filename: string;
}

export interface GooglePhotoListResponse {
  mediaItems?: GooglePhotoExternal[];
  nextPageToken?: string;
}

// --- Domain Types (normalized for app use) ---

export const GooglePhotoEntitySchema = z.object({
  id: z.string(),
  productUrl: z.string(),
  baseUrl: z.string(),
  mimeType: z.string(),
  mediaMetadata: z.object({
    creationTime: z.string(),
    width: z.string(),
    height: z.string(),
    photo: z
      .object({
        cameraMake: z.string().optional(),
        cameraModel: z.string().optional(),
        focalLength: z.number().optional(),
        apertureFNumber: z.number().optional(),
        isoEquivalent: z.number().optional(),
        exposureTime: z.string().optional(),
      })
      .optional(),
    video: z
      .object({
        cameraMake: z.string().optional(),
        cameraModel: z.string().optional(),
        fps: z.number().optional(),
        status: z.string().optional(),
      })
      .optional(),
  }),
  filename: z.string(),
  description: z.string().optional(),
  contributorInfo: z
    .object({
      profilePictureBaseUrl: z.string(),
      displayName: z.string(),
    })
    .optional(),
  creationTime: z.date().nullable(),
  updatedAt: z.date(),
  localPath: z.string().optional(),

  __type: z.literal("google_photo"),
});

export type GooglePhotoEntity = z.infer<typeof GooglePhotoEntitySchema>;
