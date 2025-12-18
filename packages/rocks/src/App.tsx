import { CookieConsent } from "./components/analytics/cookie-consent";
import { GoogleAnalytics } from "./components/analytics/google-analytics";
import { VercelAnalytics } from "./components/analytics/vercel-analytics";
import { LandingPage } from "./components/landing-page";

function App() {
  return (
    <>
      <GoogleAnalytics />
      <VercelAnalytics />
      <LandingPage />
      <CookieConsent />
    </>
  );
}

export default App;
