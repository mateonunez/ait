import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { setConsent } from "../../lib/analytics";
import { cn } from "../../lib/utils";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem("cookie_consent");
    if (storedConsent === null) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "true");
    setConsent(true);
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "false");
    setConsent(false);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-6 left-6 right-6 z-50 mx-auto max-w-2xl"
        >
          <div className="glass p-5 rounded-2xl border border-white/10 shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/40 backdrop-blur-xl ring-1 ring-white/5">
            <div className="text-sm text-foreground/90 text-center sm:text-left">
              <span className="font-semibold block sm:inline">Cookies 🍪?</span>
              <span className="text-muted-foreground text-xs sm:text-sm block sm:inline sm:ml-2">
                To see how you interact with our shiny new website.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleDecline}
                className={cn(
                  "px-4 py-2 text-xs font-medium rounded-full transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                Nah
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className={cn(
                  "px-5 py-2 text-xs font-semibold rounded-full transition-all shadow-lg shadow-amber-500/20",
                  "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 active:scale-95",
                )}
              >
                Oki
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
