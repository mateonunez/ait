import {
  AItError,
  GoogleContactEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type GoogleContactDataTarget, drizzleOrm, getPostgresClient, googleContacts } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGoogleContactRepository } from "../../../../types/domain/entities/vendors/connector.google.types";

const logger = getLogger();

export class ConnectorGoogleContactRepository implements IConnectorGoogleContactRepository {
  private _pgClient = getPostgresClient();

  async saveContact(
    contact: GoogleContactEntity,
    _options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const contactId = contact.id;

    try {
      const contactDataTarget = contact.toPlain<GoogleContactDataTarget>();
      contactDataTarget.id = contactId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<GoogleContactDataTarget> = {
          displayName: contactDataTarget.displayName,
          givenName: contactDataTarget.givenName,
          familyName: contactDataTarget.familyName,
          email: contactDataTarget.email,
          phoneNumber: contactDataTarget.phoneNumber,
          organization: contactDataTarget.organization,
          jobTitle: contactDataTarget.jobTitle,
          photoUrl: contactDataTarget.photoUrl,
          biography: contactDataTarget.biography,
          updatedAt: new Date(),
        };

        await tx
          .insert(googleContacts)
          .values(contactDataTarget as any)
          .onConflictDoUpdate({
            target: googleContacts.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save Google Contact:", { contactId: contact.id, error: message });
      throw new AItError(
        "GOOGLE_CONTACT_SAVE_CONTACT",
        `Failed to save contact ${contact.id}: ${message}`,
        { id: contact.id },
        error,
      );
    }
  }

  async saveContacts(contacts: GoogleContactEntity[]): Promise<void> {
    if (!contacts.length) {
      return;
    }

    await Promise.all(contacts.map((contact) => this.saveContact(contact)));
  }

  async getContact(id: string): Promise<GoogleContactEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(googleContacts)
      .where(drizzleOrm.eq(googleContacts.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return GoogleContactEntity.fromPlain(result[0]! as GoogleContactDataTarget);
  }

  async fetchContacts(): Promise<GoogleContactEntity[]> {
    const contacts = await this._pgClient.db
      .select()
      .from(googleContacts)
      .orderBy(drizzleOrm.asc(googleContacts.displayName));

    return contacts.map((contact) => GoogleContactEntity.fromPlain(contact as GoogleContactDataTarget));
  }

  async getContactsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleContactEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [contacts, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleContacts)
        .orderBy(drizzleOrm.asc(googleContacts.displayName))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googleContacts),
    ]);

    return buildPaginatedResponse(
      contacts.map((contact) => GoogleContactEntity.fromPlain(contact as GoogleContactDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
