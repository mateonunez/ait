export function trackEvent(data: { action: string; category: string; label?: string; value?: number }) {
  if (typeof window !== "undefined" && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: "event",
      eventAction: data.action,
      eventCategory: data.category,
      eventLabel: data.label,
      eventValue: data.value,
    });
  }
}
