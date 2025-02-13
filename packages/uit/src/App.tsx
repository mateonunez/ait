import "./App.css";
import { theme } from "@/styles/theme";
import AItButton from "./components/ait.button";
import { ThemeToggle } from "./components/theme-toggle";
import { Heading } from "./components/ui/heading";

export default function App() {
  return (
    <main className={`${theme.layout.container} ${theme.layout.content} ${theme.animations.base}`}>
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <Heading variant="hero" gradient>
        Hey! It's <AItButton />
      </Heading>
    </main>
  );
}
