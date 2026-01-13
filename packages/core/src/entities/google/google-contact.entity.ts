import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import type { GoogleContactExternal } from "../../types/integrations";

/**
 * Google Contact entity with class-transformer decorators.
 */
export class GoogleContactEntity {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? "Unknown Contact")
  displayName!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  givenName!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  familyName!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  email!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  phoneNumber!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  organization!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  jobTitle!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  photoUrl!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  biography!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "google_contact" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GoogleContactEntity {
    return plainToInstance(GoogleContactEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external Google Contact to domain entity.
 */
export function mapGoogleContact(external: GoogleContactExternal): GoogleContactEntity {
  const primaryName = external.names?.find((n: any) => n.metadata?.primary) ?? external.names?.[0];
  const primaryEmail = external.emailAddresses?.find((e: any) => e.metadata?.primary) ?? external.emailAddresses?.[0];
  const primaryPhone = external.phoneNumbers?.find((p: any) => p.metadata?.primary) ?? external.phoneNumbers?.[0];
  const primaryOrg = external.organizations?.find((o: any) => o.metadata?.primary) ?? external.organizations?.[0];
  const primaryPhoto = external.photos?.find((p: any) => p.metadata?.primary) ?? external.photos?.[0];
  const primaryBio = external.biographies?.find((b: any) => b.metadata?.primary) ?? external.biographies?.[0];

  const contactSource = external.metadata?.sources?.find((s: any) => s.type === "CONTACT");
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
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external contacts.
 */
export function mapGoogleContacts(externals: GoogleContactExternal[]): GoogleContactEntity[] {
  return externals.map(mapGoogleContact);
}
