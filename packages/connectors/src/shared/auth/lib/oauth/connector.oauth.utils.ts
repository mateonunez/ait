import { drizzleOrm, getPostgresClient, type OAuthTokenDataTarget, oauthTokens } from "@ait/postgres";
import { randomUUID } from "node:crypto";
import type { IConnectorOAuthTokenResponse } from "./connector.oauth";

const _pgClient = getPostgresClient();

// TODO: move this
export async function saveOAuthData(data: IConnectorOAuthTokenResponse, provider: string): Promise<void> {
  const ouathData = await getOAuthData(provider);
  const randomId = randomUUID();
  const now = new Date();

  await _pgClient.db.transaction(async (tx) => {
    if (ouathData) {
      await tx
        .update(oauthTokens)
        .set({
          accessToken: data.access_token || ouathData.accessToken,
          refreshToken: data.refresh_token || ouathData.refreshToken,
          tokenType: data.token_type || ouathData.tokenType,
          scope: data.scope || ouathData.scope,
          expiresIn: data.expires_in ? data.expires_in.toString() : ouathData.expiresIn,
          updatedAt: now,
        })
        .where(drizzleOrm.eq(oauthTokens.provider, provider))
        .execute();
    } else {
      const tokenData = {
        id: randomId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        scope: data.scope,
        expiresIn: data.expires_in?.toString(),
        provider: provider,
        createdAt: now,
        updatedAt: now,
      };
      await tx.insert(oauthTokens).values(tokenData).onConflictDoNothing().execute();
    }
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

export async function clearOAuthData(provider: string): Promise<void> {
  await _pgClient.db.delete(oauthTokens).where(drizzleOrm.eq(oauthTokens.provider, provider)).execute();
}
