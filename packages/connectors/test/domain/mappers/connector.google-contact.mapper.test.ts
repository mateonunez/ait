import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GoogleContactExternal } from "@ait/core";
import {
  googleContactDomainToDataTarget,
  mapGoogleContact,
} from "../../../src/domain/entities/google/google-contact.entity";

describe("Google Contact Mappers", () => {
  describe("connectorGoogleContactMapper", () => {
    describe("externalToDomain", () => {
      it("should map external contact to domain entity", () => {
        const externalContact: GoogleContactExternal = {
          __type: "google_contact",
          resourceName: "people/c123",
          etag: "etag123",
          metadata: {
            objectType: "PERSON",
            sources: [{ type: "CONTACT", id: "c123", updateTime: "2024-01-10T10:00:00Z" }],
          },
          names: [
            {
              displayName: "John Doe",
              givenName: "John",
              familyName: "Doe",
              metadata: { primary: true },
            },
          ],
          emailAddresses: [{ value: "john.doe@example.com", metadata: { primary: true } }],
          phoneNumbers: [{ value: "+1234567890", metadata: { primary: true } }],
          organizations: [
            {
              name: "Acme Corp",
              title: "Software Engineer",
              metadata: { primary: true },
            },
          ],
          photos: [{ url: "https://example.com/photo.jpg", metadata: { primary: true } }],
          biographies: [{ value: "A passionate developer", metadata: { primary: true } }],
        };

        const domainContact = mapGoogleContact(externalContact);

        assert.equal(domainContact.id, "people/c123");
        assert.equal(domainContact.displayName, "John Doe");
        assert.equal(domainContact.email, "john.doe@example.com");
        assert.equal(domainContact.phoneNumber, "+1234567890");
        assert.equal(domainContact.organization, "Acme Corp");
        assert.equal(domainContact.jobTitle, "Software Engineer");
        assert.equal(domainContact.photoUrl, "https://example.com/photo.jpg");
        assert.equal(domainContact.biography, "A passionate developer");
        assert.equal(domainContact.__type, "google_contact");
        assert.ok(domainContact.updatedAt instanceof Date);
        assert.equal(domainContact.updatedAt.toISOString(), "2024-01-10T10:00:00.000Z");
      });

      it("should handle minimal data correctly", () => {
        const externalContact: GoogleContactExternal = {
          __type: "google_contact",
          resourceName: "people/c456",
          etag: "etag456",
          names: [{ displayName: "Minimal Contact" }],
        };

        const domainContact = mapGoogleContact(externalContact);

        assert.equal(domainContact.id, "people/c456");
        assert.equal(domainContact.displayName, "Minimal Contact");
        assert.equal(domainContact.email, null);
        assert.equal(domainContact.phoneNumber, null);
        assert.equal(domainContact.organization, null);
      });
    });

    describe("domainToDataTarget", () => {
      it("should map domain contact to data target", () => {
        const externalContact: GoogleContactExternal = {
          __type: "google_contact",
          resourceName: "people/c789",
          etag: "etag789",
          names: [{ displayName: "Target Contact" }],
        };

        const domainContact = mapGoogleContact(externalContact);
        const dataTarget = googleContactDomainToDataTarget(domainContact);

        assert.equal(dataTarget.id, "people/c789");
        assert.equal(dataTarget.displayName, "Target Contact");
        assert.equal(dataTarget.__type, "google_contact");
      });
    });
  });
});
