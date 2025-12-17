import { useEffect } from "react";
import { measurementId } from "../../lib/analytics";

export function GoogleAnalytics() {
  // biome-ignore lint/correctness/useExhaustiveDependencies: exhaustive deps
  useEffect(() => {
    const storedConsent = localStorage.getItem("cookie_consent");
    const consentState = storedConsent === "true" ? "granted" : "denied";

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }

    // @ts-ignore
    window.gtag = gtag;

    gtag("js", new Date());
    gtag("consent", "default", {
      analytics_storage: consentState,
    });

    gtag("config", measurementId, {
      send_page_view: true,
    });

    return () => {
      document.head.removeChild(script);
    };
  }, [measurementId]);

  return null;
}
