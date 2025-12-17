type GTagEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

export const measurementId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

// https://developers.google.com/analytics/devguides/collection/ga4/events?client_type=gtag
export const trackEvent = ({ action, category, label, value }: GTagEvent) => {
  if (typeof window.gtag !== "undefined") {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/ga4/page-view
export const trackPageView = (url: string) => {
  if (typeof window.gtag !== "undefined") {
    window.gtag("config", measurementId, {
      page_path: url,
    });
  }
};

export const setConsent = (consented: boolean) => {
  if (typeof window.gtag !== "undefined") {
    window.gtag("consent", "update", {
      analytics_storage: consented ? "granted" : "denied",
    });
  }
};

export type GTagCommand = "config" | "event" | "consent" | "js";

// Add gtag to window
declare global {
  interface Window {
    gtag: (command: GTagCommand, targetId: string, config?: Record<string, any>) => void;
    dataLayer: any[];
  }
}
