import { ANIMATIONS } from "@/lib/constants";
import { gradientStyles, textBase } from "@/App";

export default function AItButton() {
  return (
    <button
      type="button"
      aria-label="AIt button"
      onClick={() => {
        console.log("clicked");
      }}
    >
      <span
        className={`
        relative inline-block origin-center p-3 
        rounded-lg cursor-pointer
        ${textBase} ${gradientStyles} ${ANIMATIONS.base} ${ANIMATIONS.scale}
        after:absolute after:inset-0 
        after:rounded-lg after:ring-2 
        after:ring-rose-300/20 dark:after:ring-rose-400/20 
        after:transition-transform after:duration-300
        hover:after:scale-105 active:after:scale-95
      `}
      >
        AIt
      </span>
    </button>
  );
}
