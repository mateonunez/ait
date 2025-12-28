import "reflect-metadata";
import type { GoogleContactExternal } from "@ait/core";
import type { GoogleContactDataTarget, GoogleContactDataTargetInsert } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Google Contact entity with class-transformer decorators.
 */
export class GoogleContactEntity {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ value }) => value ?? "Unknown Contact")
  displayName!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  givenName!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  familyName!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  email!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  phoneNumber!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  organization!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  jobTitle!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  photoUrl!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  biography!: string | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  readonly __type = "google_contact" as const;
}

/**
 * Transform external Google Contact to domain entity.
 */
export function mapGoogleContact(external: GoogleContactExternal): GoogleContactEntity {
  const primaryName = external.names?.find((n) => n.metadata?.primary) ?? external.names?.[0];
  const primaryEmail = external.emailAddresses?.find((e) => e.metadata?.primary) ?? external.emailAddresses?.[0];
  const primaryPhone = external.phoneNumbers?.find((p) => p.metadata?.primary) ?? external.phoneNumbers?.[0];
  const primaryOrg = external.organizations?.find((o) => o.metadata?.primary) ?? external.organizations?.[0];
  const primaryPhoto = external.photos?.find((p) => p.metadata?.primary) ?? external.photos?.[0];
  const primaryBio = external.biographies?.find((b) => b.metadata?.primary) ?? external.biographies?.[0];

  const contactSource = external.metadata?.sources?.find((s) => s.type === "CONTACT");
  const updateTime = contactSource?.updateTime;

  const mapped = {
    id: external.resourceName,
    displayName: primaryName?.displayName ?? "Unknown Contact",
    givenName: primaryName?.givenName ?? null,
    familyName: primaryName?.familyName ?? null,
    email: primaryEmail?.value ?? null,
    phoneNumber: primaryPhone?.canonicalForm ?? primaryPhone?.value ?? null,
    organization: primaryOrg?.name ?? null,
    jobTitle: primaryOrg?.title ?? null,
    photoUrl: primaryPhoto?.url ?? null,
    biography: primaryBio?.value ?? null,
    updatedAt: updateTime ?? null,
    createdAt: updateTime ?? null, // People API doesn't usually provide a separate creation time easily in basic metadata
  };

  return plainToInstance(GoogleContactEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external contacts.
 */
export function mapGoogleContacts(externals: GoogleContactExternal[]): GoogleContactEntity[] {
  return externals.map(mapGoogleContact);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function googleContactDomainToDataTarget(domain: GoogleContactEntity): GoogleContactDataTargetInsert {
  return instanceToPlain(domain) as GoogleContactDataTargetInsert;
}

export function googleContactDataTargetToDomain(dataTarget: GoogleContactDataTarget): GoogleContactEntity {
  return plainToInstance(GoogleContactEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
