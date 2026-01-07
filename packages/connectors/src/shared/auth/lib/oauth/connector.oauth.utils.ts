import { randomUUID } from "node:crypto";
import { type OAuthTokenDataTarget, drizzleOrm, getPostgresClient, oauthTokens } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "./connector.oauth";

const _pgClient = getPostgresClient();

// TODO: move this
export async function saveOAuthData(
  data: IConnectorOAuthTokenResponse,
  provider: string,
  userId?: string,
  connectorConfigId?: string,
): Promise<void> {
  const currentUserId = userId || "anonymous";

  const ouathData = await getOAuthData(provider, currentUserId);
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
          connectorConfigId: connectorConfigId || ouathData.connectorConfigId,
          updatedAt: now,
        })
        .where(
          drizzleOrm.and(
            drizzleOrm.eq(oauthTokens.provider, provider),
            drizzleOrm.eq(oauthTokens.userId, currentUserId),
          ),
        )
        .execute();
    } else {
      const tokenData = {
        id: randomId,
        userId: currentUserId,
        connectorConfigId,
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

export async function getOAuthData(provider: string, userId?: string): Promise<OAuthTokenDataTarget | null> {
  const currentUserId = userId || "anonymous";
  const data = await _pgClient.db
    .select({
      id: oauthTokens.id,
      userId: oauthTokens.userId,
      connectorConfigId: oauthTokens.connectorConfigId,
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
    .where(
      drizzleOrm.and(drizzleOrm.eq(oauthTokens.provider, provider), drizzleOrm.eq(oauthTokens.userId, currentUserId)),
    )
    .execute();

  if (!data.length) {
    return null;
  }

  return data[0] as OAuthTokenDataTarget;
}

export async function clearOAuthData(provider: string, userId?: string): Promise<void> {
  const currentUserId = userId || "anonymous";
  await _pgClient.db
    .delete(oauthTokens)
    .where(
      drizzleOrm.and(drizzleOrm.eq(oauthTokens.provider, provider), drizzleOrm.eq(oauthTokens.userId, currentUserId)),
    )
    .execute();
}

export function isTokenExpiringSoon(expiresAt: Date, updatedAt: Date): boolean {
  const now = new Date();
  const msUntilExpiry = expiresAt.getTime() - now.getTime();
  const hoursUntilExpiry = msUntilExpiry / (1000 * 60 * 60);

  // Already expired
  if (hoursUntilExpiry <= 0) return false;

  // Calculate total token lifetime
  const totalLifetimeMs = expiresAt.getTime() - updatedAt.getTime();
  const totalLifetimeHours = totalLifetimeMs / (1000 * 60 * 60);

  // For short-lived tokens (< 24h lifetime), use 30% remaining threshold
  if (totalLifetimeHours < 24) {
    const percentRemaining = msUntilExpiry / totalLifetimeMs;
    return percentRemaining <= 0.3;
  }

  // For longer-lived tokens, use 24-hour threshold
  return hoursUntilExpiry <= 24;
}
