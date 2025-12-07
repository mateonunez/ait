import { randomUUID } from "node:crypto";
import { type OAuthTokenDataTarget, drizzleOrm, getPostgresClient, oauthTokens } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "./connector.oauth";

const _pgClient = getPostgresClient();

// TODO: move this
export async function saveOAuthData(data: IConnectorOAuthTokenResponse, provider: string): Promise<void> {
  const ouathData = await getOAuthData(provider);
  const randomId = randomUUID();
  const now = new Date();

  // For Slack user tokens, prefer authed_user token data
  const userTokenData = data.authed_user;
  const accessToken = userTokenData?.access_token || data.access_token;
  const refreshToken = userTokenData?.refresh_token || data.refresh_token;
  const tokenType = userTokenData?.token_type || data.token_type;
  const scope = userTokenData?.scope || data.scope;
  const expiresIn = userTokenData?.expires_in || data.expires_in;

  await _pgClient.db.transaction(async (tx) => {
    if (ouathData) {
      await tx
        .update(oauthTokens)
        .set({
          accessToken: accessToken || ouathData.accessToken,
          refreshToken: refreshToken || ouathData.refreshToken,
          tokenType: tokenType || ouathData.tokenType,
          scope: scope || ouathData.scope,
          expiresIn: expiresIn ? expiresIn.toString() : ouathData.expiresIn,
          metadata: data.metadata || ouathData.metadata,
          updatedAt: now,
        })
        .where(drizzleOrm.eq(oauthTokens.provider, provider))
        .execute();
    } else {
      const tokenData = {
        id: randomId,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenType: tokenType,
        scope: scope,
        expiresIn: expiresIn?.toString(),
        provider: provider,
        metadata: data.metadata,
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
      metadata: oauthTokens.metadata,
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
