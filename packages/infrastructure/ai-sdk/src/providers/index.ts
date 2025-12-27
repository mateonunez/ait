import type { IAnalyticsProvider } from "../interfaces/analytics-provider.interface";
import type { ICacheProvider } from "../interfaces/cache-provider.interface";

let _cacheProvider: ICacheProvider | undefined;
let _analyticsProvider: IAnalyticsProvider | undefined;

export function registerCacheProvider(provider: ICacheProvider): void {
  _cacheProvider = provider;
}

export function getCacheProvider(): ICacheProvider | undefined {
  return _cacheProvider;
}

export function registerAnalyticsProvider(provider: IAnalyticsProvider): void {
  _analyticsProvider = provider;
}

export function getAnalyticsProvider(): IAnalyticsProvider | undefined {
  return _analyticsProvider;
}
