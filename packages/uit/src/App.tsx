import "./App.css";
import { ANIMATIONS, GRADIENTS, LAYOUT } from "@/lib/constants";
import AItButton from "./components/ait.button";
import { ThemeToggle } from "./components/theme-toggle";

export const gradientStyles = `bg-gradient-to-r ${GRADIENTS.light} ${GRADIENTS.dark}`;
export const textBase = "text-transparent bg-clip-text selection:bg-rose-200/20 dark:selection:bg-rose-400/20";

export default function App() {
  return (
    <main className={`${LAYOUT.container} ${LAYOUT.content} ${ANIMATIONS.base}`}>
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <h1 className={`
        text-8xl md:text-9xl lg:text-[12rem] 
        font-bold tracking-tight cursor-default
        ${textBase} ${gradientStyles}
        bg-[length:200%_200%] ${ANIMATIONS.gradient}
        motion-safe:transform ${ANIMATIONS.base}
        hover:scale-[1.02] active:scale-[0.98]
      `}>
        Hey! It's <AItButton />
      </h1>
    </main>
  );
}
