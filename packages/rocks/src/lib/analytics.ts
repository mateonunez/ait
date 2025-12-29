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
    window.gtag("google_calendar_event", action, {
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

export type GTagCommand = "config" | "google_calendar_event" | "consent" | "js";

// Vercel Analytics utility functions
export const trackVercelEvent = (eventName: string, eventData?: Record<string, any>) => {
  // Vercel Analytics uses the Web Analytics API
  // The Analytics component automatically tracks page views and web vitals
  // For custom events, we can use this function if needed
  if (typeof window.va !== "undefined") {
    window.va("google_calendar_event", {
      name: eventName,
      ...(eventData && { data: eventData }),
    });
  }
};

// Add gtag to window
declare global {
  interface Window {
    gtag: (command: GTagCommand, targetId: string, config?: Record<string, any>) => void;
    dataLayer: any[];
    va?: (command: string, eventData?: Record<string, any>) => void;
    vaq?: any[];
  }
}
