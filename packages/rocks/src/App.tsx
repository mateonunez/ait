import { CookieConsent } from "./components/analytics/cookie-consent";
import { GoogleAnalytics } from "./components/analytics/google-analytics";
import { LandingPage } from "./components/landing-page";

function App() {
  return (
    <>
      <GoogleAnalytics />
      <LandingPage />
      <CookieConsent />
    </>
  );
}

export default App;
