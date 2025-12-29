import "reflect-metadata";
import type { GooglePhotoExternal, GooglePhotoMediaMetadata } from "@ait/core";
import { Expose, Type, plainToInstance } from "class-transformer";

export interface GooglePhotoContributorInfo {
  profilePictureBaseUrl: string;
  displayName: string;
}

export class GooglePhotoEntity {
  @Expose()
  id!: string;

  @Expose()
  @Type(() => String)
  description?: string;

  @Expose()
  productUrl!: string;

  @Expose()
  baseUrl!: string;

  @Expose()
  mimeType!: string;

  @Expose()
  mediaMetadata!: GooglePhotoMediaMetadata;

  @Expose()
  contributorInfo?: GooglePhotoContributorInfo;

  @Expose()
  filename!: string;

  @Expose()
  @Type(() => Date)
  creationTime!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @Expose()
  localPath?: string;

  @Expose()
  readonly __type = "google_photo" as const;
}

export function mapGooglePhoto(external: GooglePhotoExternal): GooglePhotoEntity {
  const mapped = {
    ...external,
    creationTime: external.mediaMetadata.creationTime ? new Date(external.mediaMetadata.creationTime) : null,
    updatedAt: new Date(),
  };

  return plainToInstance(GooglePhotoEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

export type VideoProcessingStatus = "UNSPECIFIED" | "PROCESSING" | "READY" | "FAILED";

export interface PickerPhotoMetadata {
  focalLength?: number;
  apertureFNumber?: number;
  isoEquivalent?: number;
  exposureTime?: string;
}

export interface PickerVideoMetadata {
  fps?: number;
  processingStatus?: VideoProcessingStatus;
}

export interface PickerMediaFileMetadata {
  width?: number;
  height?: number;
  cameraMake?: string;
  cameraModel?: string;
  photoMetadata?: PickerPhotoMetadata;
  videoMetadata?: PickerVideoMetadata;
}

export interface PickerMediaFile {
  baseUrl: string;
  mimeType: string;
  filename: string;
  mediaFileMetadata?: PickerMediaFileMetadata;
}

export type PickerMediaType = "TYPE_UNSPECIFIED" | "PHOTO" | "VIDEO";

export interface PickerPhotoInput {
  id: string;
  createTime?: string;
  type?: PickerMediaType;
  mediaFile: PickerMediaFile;
}

export function mapGooglePickerPhoto(item: PickerPhotoInput, localPath?: string): GooglePhotoEntity {
  const baseUrl = item.mediaFile.baseUrl;
  const filename = item.mediaFile.filename || `${item.id}.jpg`;
  const mimeType = item.mediaFile.mimeType || "image/jpeg";

  const mapped = {
    id: item.id,
    baseUrl,
    filename,
    mimeType,
    localPath,
    productUrl: `https://photos.google.com/photo/${item.id}`,
    mediaMetadata: {
      width: item.mediaFile.mediaFileMetadata?.width,
      height: item.mediaFile.mediaFileMetadata?.height,
      photo: item.mediaFile.mediaFileMetadata?.photoMetadata
        ? {
            cameraMake: item.mediaFile.mediaFileMetadata.cameraMake,
            cameraModel: item.mediaFile.mediaFileMetadata.cameraModel,
            focalLength: item.mediaFile.mediaFileMetadata.photoMetadata.focalLength,
            apertureFNumber: item.mediaFile.mediaFileMetadata.photoMetadata.apertureFNumber,
            isoEquivalent: item.mediaFile.mediaFileMetadata.photoMetadata.isoEquivalent,
            exposureTime: item.mediaFile.mediaFileMetadata.photoMetadata.exposureTime,
          }
        : {},
      creationTime: item.createTime || new Date().toISOString(),
    },
    creationTime: item.createTime ? new Date(item.createTime) : new Date(),
    updatedAt: new Date(),
    __type: "google_photo" as const,
  };

  return plainToInstance(GooglePhotoEntity, mapped, {
    excludeExtraneousValues: true,
  });
}
