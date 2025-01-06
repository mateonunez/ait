import { drizzleOrm, getPostgresClient, type OAuthTokenDataTarget, oauthTokens } from "@ait/postgres";
import { randomUUID } from "node:crypto";
import type { IConnectorOAuthTokenResponse } from "./connector.oauth.interface";

const _pgClient = getPostgresClient();

export async function saveOAuthData(data: IConnectorOAuthTokenResponse, provider: string): Promise<void> {
  const id = randomUUID();

  await _pgClient.db.transaction(async (tx) => {
    const tokenData = {
      id: id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      scope: data.scope,
      expiresIn: data.expires_in?.toString(),
      provider: provider,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tx.insert(oauthTokens).values(tokenData).onConflictDoNothing().execute();
  });
}

export async function getOAuthData(provider: string): Promise<OAuthTokenDataTarget | null> {
  const data = await _pgClient.db
    .select({
      id: oauthTokens.id,
      accessToken: oauthTokens.accessToken,
      refreshToken: oauthTokens.refreshToken,
      tokenType: oauthTokens.tokenType,
      scope: oauthTokens.scope,
      expiresIn: oauthTokens.expiresIn,
      provider: oauthTokens.provider,
      createdAt: oauthTokens.createdAt,
      updatedAt: oauthTokens.updatedAt,
    })
    .from(oauthTokens)
    .where(drizzleOrm.eq(oauthTokens.provider, provider))
    .execute();

  if (!data.length) {
    return null;
  }

  return data[0] as OAuthTokenDataTarget;
}
