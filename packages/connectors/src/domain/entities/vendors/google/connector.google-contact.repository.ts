import { AItError, type PaginatedResponse, type PaginationParams, getLogger } from "@ait/core";
import { type GoogleContactDataTarget, drizzleOrm, getPostgresClient, googleContacts } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGoogleContactRepository } from "../../../../types/domain/entities/vendors/connector.google.types";
import { googleContactDataTargetToDomain, googleContactDomainToDataTarget } from "../../google/google-contact.entity";
import type { GoogleContactEntity } from "../../google/google-contact.entity";

const logger = getLogger();

export class ConnectorGoogleContactRepository implements IConnectorGoogleContactRepository {
  private _pgClient = getPostgresClient();

  async saveContact(
    contact: GoogleContactEntity,
    _options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const contactId = contact.id;

    try {
      const contactDataTarget = googleContactDomainToDataTarget(contact);
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
    } catch (error: any) {
      logger.error("Failed to save Google Contact:", { contactId: contact.id, error });
      throw new AItError(
        "GOOGLE_CONTACT_SAVE_CONTACT",
        `Failed to save contact ${contact.id}: ${error.message}`,
        { id: contact.id },
        error,
      );
    }
  }

  async saveContacts(contacts: GoogleContactEntity[]): Promise<void> {
    if (!contacts.length) {
      return;
    }

    try {
      for (const contact of contacts) {
        await this.saveContact(contact);
      }
    } catch (error) {
      logger.error("Error saving contacts:", { error });
      throw new AItError("GOOGLE_CONTACT_SAVE_CONTACT_BULK", "Failed to save contacts to repository");
    }
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

    return googleContactDataTargetToDomain(result[0]! as GoogleContactDataTarget);
  }

  async fetchContacts(): Promise<GoogleContactEntity[]> {
    const contacts = await this._pgClient.db
      .select()
      .from(googleContacts)
      .orderBy(drizzleOrm.asc(googleContacts.displayName));

    return contacts.map((contact) => googleContactDataTargetToDomain(contact as GoogleContactDataTarget));
  }

  async getContactsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleContactEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [contacts, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googleContacts)
        .orderBy(drizzleOrm.asc(googleContacts.displayName))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googleContacts),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: contacts.map((contact) => googleContactDataTargetToDomain(contact as GoogleContactDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
