import { z } from "zod";

// --- External Types (from Google People API) ---

export interface GoogleContactExternal {
  __type: "google_contact";
  resourceName: string;
  etag: string;
  metadata?: {
    sources?: Array<{
      type: string;
      id: string;
      updateTime?: string;
    }>;
    objectType: string;
  };
  names?: Array<{
    displayName: string;
    familyName?: string;
    givenName?: string;
    displayNameLastFirst?: string;
    unstructuredName?: string;
    metadata?: { primary?: boolean };
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
    formattedType?: string;
    metadata?: { primary?: boolean };
  }>;
  phoneNumbers?: Array<{
    value: string;
    canonicalForm?: string;
    type?: string;
    formattedType?: string;
    metadata?: { primary?: boolean };
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    type?: string;
    formattedType?: string;
    metadata?: { primary?: boolean };
  }>;
  photos?: Array<{
    url: string;
    metadata?: { primary?: boolean };
  }>;
  biographies?: Array<{
    value: string;
    contentType?: string;
    metadata?: { primary?: boolean };
  }>;
}

// --- Zod Schemas for validation ---

export const GoogleContactSchema = z
  .object({
    resourceName: z.string(),
    etag: z.string(),
    names: z
      .array(
        z.object({
          displayName: z.string(),
          familyName: z.string().optional(),
          givenName: z.string().optional(),
          metadata: z.object({ primary: z.boolean().optional() }).optional(),
        }),
      )
      .optional(),
    emailAddresses: z
      .array(
        z.object({
          value: z.string(),
          type: z.string().optional(),
          metadata: z.object({ primary: z.boolean().optional() }).optional(),
        }),
      )
      .optional(),
    phoneNumbers: z
      .array(
        z.object({
          value: z.string(),
          canonicalForm: z.string().optional(),
          type: z.string().optional(),
          metadata: z.object({ primary: z.boolean().optional() }).optional(),
        }),
      )
      .optional(),
    organizations: z
      .array(
        z.object({
          name: z.string().optional(),
          title: z.string().optional(),
          type: z.string().optional(),
          metadata: z.object({ primary: z.boolean().optional() }).optional(),
        }),
      )
      .optional(),
    photos: z
      .array(
        z.object({
          url: z.string(),
          metadata: z.object({ primary: z.boolean().optional() }).optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

// --- Domain Types (normalized for app use) ---

export const GoogleContactEntityTypeSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  givenName: z.string().nullable(),
  familyName: z.string().nullable(),
  email: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  organization: z.string().nullable(),
  jobTitle: z.string().nullable(),
  photoUrl: z.string().nullable(),
  biography: z.string().nullable(),
  __type: z.literal("google_contact"),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type GoogleContactEntityType = z.infer<typeof GoogleContactEntityTypeSchema>;
