import "./App.css";
import { theme } from "@/styles/theme";
import AItButton from "./components/ait.button";
import { ThemeToggle } from "./components/theme-toggle";
import { Heading } from "./components/ui/heading";
import { ChatInput } from "./components/chat/chat-input";

const text = "I'm";

export default function App() {
  return (
    <main className={`${theme.layout.container} ${theme.layout.content} ${theme.animations.base}`}>
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="mx-4 sm:mx-6 md:mx-8 text-center flex flex-col items-center justify-center w-full">
        <Heading variant="hero" gradient>
          {text} <AItButton />
        </Heading>
        <ChatInput />
      </div>
    </main>
  );
}
