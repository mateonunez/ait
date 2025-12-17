import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Github, Linkedin, Twitter } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { BackgroundEffects } from "./background-effects";
import { ThemeToggle } from "./theme-toggle";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

export function LandingPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden">
      <BackgroundEffects />

      <header className="relative z-10 flex justify-end p-6 sm:p-8">
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-8">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Coming Soon Badge */}
          <motion.div variants={itemVariants} className="mb-8">
            <span
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                "glass animate-badge-pulse",
                "text-sm font-medium text-foreground/80",
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Launching Soon
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className={cn(
              "text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem]",
              "font-extrabold tracking-tighter leading-[0.9]",
              "text-gradient-animated",
              "mb-6",
            )}
          >
            AIt
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className={cn("text-lg sm:text-xl md:text-2xl", "font-normal text-foreground/60", "mb-2")}
          >
            Hey there! I'm <span className="text-gradient font-medium">AIt</span>.
          </motion.p>

          <motion.p
            variants={itemVariants}
            className={cn(
              "text-xl sm:text-2xl md:text-3xl lg:text-4xl",
              "font-medium tracking-tight text-foreground",
              "mb-8",
            )}
          >
            Your data. Your AI. <span className="font-semibold text-gradient">One Platform.</span>
          </motion.p>

          <motion.p
            variants={itemVariants}
            className={cn(
              "text-base sm:text-lg md:text-xl",
              "font-light leading-relaxed text-muted-foreground",
              "max-w-lg mx-auto",
              "mb-12",
            )}
          >
            Connect everything you use—your code, music, notes, tasks—and talk to it all like never before.
          </motion.p>

          <motion.div variants={itemVariants} className="flex items-center justify-center gap-4">
            <SocialLink href="https://github.com/mateonunez/ait" icon={<Github className="w-5 h-5" />} label="GitHub" />
            <SocialLink href="https://x.com/mmateonunez" icon={<Twitter className="w-5 h-5" />} label="X (Twitter)" />
            <SocialLink
              href="https://www.linkedin.com/in/mateo-nunez"
              icon={<Linkedin className="w-5 h-5" />}
              label="LinkedIn"
            />
          </motion.div>
        </motion.div>
      </main>

      <footer className="relative z-10 py-8 px-6 sm:px-8">
        <motion.div
          className="text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <p>
            © {currentYear}{" "}
            <a
              href="https://mateonunez.co"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              onClick={() =>
                trackEvent({
                  action: "click",
                  category: "footer",
                  label: "personal_site",
                })
              }
            >
              Mateo Nunez
            </a>
            . All rights reserved.
          </p>
        </motion.div>
      </footer>
    </div>
  );
}

interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function SocialLink({ href, icon, label }: SocialLinkProps) {
  const handleClick = () => {
    trackEvent({
      action: "click",
      category: "social",
      label: label.toLowerCase(),
    });
  };

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full",
        "glass transition-all duration-300",
        "hover:scale-110 hover:glow active:scale-95",
        "text-foreground/70 hover:text-foreground",
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      onClick={handleClick}
    >
      {icon}
    </motion.a>
  );
}
