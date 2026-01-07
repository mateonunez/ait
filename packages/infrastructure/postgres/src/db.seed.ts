import { eq } from "drizzle-orm";
import { getPostgresClient, providers } from "./index";

async function seed() {
  const { db } = getPostgresClient();

  const initialProviders = [
    {
      slug: "github",
      name: "GitHub",
      description: "Connect your GitHub repositories, pull requests, and commits.",
      authType: "oauth2" as const,
      configSchema: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientSecret: { type: "string" },
          endpoint: { type: "string", default: "https://github.com/login/oauth/access_token" },
          redirectUri: { type: "string" },
        },
        required: ["clientId", "clientSecret", "endpoint"],
      },
    },
    {
      slug: "google",
      name: "Google",
      description: "Connect Google Calendar, Contacts, Photos, and YouTube.",
      authType: "oauth2" as const,
      configSchema: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientSecret: { type: "string" },
          endpoint: { type: "string", default: "https://oauth2.googleapis.com/token" },
          redirectUri: { type: "string" },
        },
        required: ["clientId", "clientSecret", "endpoint"],
      },
    },
    {
      slug: "linear",
      name: "Linear",
      description: "Connect Linear issues and workspace data.",
      authType: "oauth2" as const,
      configSchema: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientSecret: { type: "string" },
          endpoint: { type: "string", default: "https://api.linear.app/oauth/token" },
          redirectUri: { type: "string" },
        },
        required: ["clientId", "clientSecret", "endpoint"],
      },
    },
    {
      slug: "notion",
      name: "Notion",
      description: "Connect Notion pages and databases.",
      authType: "oauth2" as const,
      configSchema: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientSecret: { type: "string" },
          endpoint: { type: "string", default: "https://api.notion.com/v1/oauth/token" },
          redirectUri: { type: "string" },
        },
        required: ["clientId", "clientSecret", "endpoint"],
      },
    },
    {
      slug: "spotify",
      name: "Spotify",
      description: "Connect Spotify tracks, albums, and playlists.",
      authType: "oauth2" as const,
      configSchema: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientSecret: { type: "string" },
          endpoint: { type: "string", default: "https://accounts.spotify.com/api/token" },
          redirectUri: { type: "string" },
        },
        required: ["clientId", "clientSecret", "endpoint"],
      },
    },
    {
      slug: "slack",
      name: "Slack",
      description: "Connect Slack messages and workspace data.",
      authType: "oauth2" as const,
      configSchema: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientSecret: { type: "string" },
          endpoint: { type: "string", default: "https://slack.com/api/oauth.v2.access" },
          redirectUri: { type: "string" },
        },
        required: ["clientId", "clientSecret", "endpoint"],
      },
    },
    {
      slug: "x",
      name: "X (Twitter)",
      description: "Connect X tweets and profile data.",
      authType: "oauth2" as const,
      configSchema: {
        type: "object",
        properties: {
          clientId: { type: "string" },
          clientSecret: { type: "string" },
          endpoint: { type: "string", default: "https://api.twitter.com/2/oauth2/token" },
          redirectUri: { type: "string" },
        },
        required: ["clientId", "clientSecret", "endpoint"],
      },
    },
  ];

  console.log("Seeding providers...");

  for (const provider of initialProviders) {
    const existing = await db.query.providers.findFirst({
      where: (providers, { eq }) => eq(providers.slug, provider.slug),
    });

    if (existing) {
      await db
        .update(providers)
        .set({
          name: provider.name,
          description: provider.description,
          configSchema: provider.configSchema,
          authType: provider.authType,
          updatedAt: new Date(),
        })
        .where(eq(providers.slug, provider.slug))
        .execute();
      console.log(`- Updated ${provider.name}`);
    } else {
      await db.insert(providers).values(provider).execute();
      console.log(`- Created ${provider.name}`);
    }
  }

  console.log("Seeding completed.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
